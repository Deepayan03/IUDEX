import type { FileNode } from "./types"
import { getLanguage } from "./utils"

// ── Types ────────────────────────────────────────────────────────────────────

export interface GitHubTreeItem {
  path: string
  type: "blob" | "tree"
  size?: number
  sha: string
}

// ── URL parsing ──────────────────────────────────────────────────────────────

export function parseGitHubUrl(
  url: string
): { owner: string; repo: string; branch?: string } | null {
  const trimmed = url.trim().replace(/\.git$/, "").replace(/\/$/, "")
  if (!trimmed) return null

  // Try matching full URL: https://github.com/owner/repo[/tree/branch]
  const urlMatch = trimmed.match(
    /^(?:https?:\/\/)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/tree\/(.+))?$/
  )
  if (urlMatch) {
    const [, owner, repo, branch] = urlMatch
    return { owner, repo, branch: branch || undefined }
  }

  // Try matching shorthand: owner/repo
  const shortMatch = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/)
  if (shortMatch) {
    const [, owner, repo] = shortMatch
    return { owner, repo }
  }

  return null
}

// ── Binary extension filter ──────────────────────────────────────────────────

const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "ico", "webp", "bmp", "tiff", "svg",
  "woff", "woff2", "ttf", "eot", "otf",
  "mp3", "mp4", "wav", "ogg", "webm", "avi", "mov",
  "zip", "tar", "gz", "rar", "7z", "bz2",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "exe", "dll", "so", "dylib", "bin",
  "pyc", "class", "o", "obj", "wasm",
])

function isBinaryPath(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? ""
  return BINARY_EXTENSIONS.has(ext)
}

// ── Tree conversion ──────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 100_000 // 100KB

export function githubTreeToFileNodes(
  items: GitHubTreeItem[],
  maxFileSize = MAX_FILE_SIZE
): FileNode[] {
  // Build a root container
  const root: FileNode = { id: "root", name: "root", type: "folder", children: [], isOpen: true }

  for (const item of items) {
    // Skip binary files and oversized files
    if (item.type === "blob") {
      if (isBinaryPath(item.path)) continue
      if (item.size !== undefined && item.size > maxFileSize) continue
    }

    const parts = item.path.split("/")
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      // Build the cumulative path up to this segment for a deterministic ID
      const segmentPath = parts.slice(0, i + 1).join("/")

      if (!current.children) current.children = []

      if (isLast && item.type === "blob") {
        // Insert file node
        current.children.push({
          id: segmentPath,
          name: part,
          type: "file",
          language: getLanguage(part),
          githubPath: item.path,
          // content left undefined for lazy loading
        })
      } else {
        // Find or create folder
        let folder = current.children.find(
          (c) => c.type === "folder" && c.name === part
        )
        if (!folder) {
          folder = { id: segmentPath, name: part, type: "folder", children: [], isOpen: false }
          current.children.push(folder)
        }
        current = folder
      }
    }
  }

  // Sort each level: folders first (alphabetical), then files (alphabetical)
  sortTree(root.children ?? [])

  return root.children ?? []
}

function sortTree(nodes: FileNode[]): void {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  for (const n of nodes) {
    if (n.children) sortTree(n.children)
  }
}

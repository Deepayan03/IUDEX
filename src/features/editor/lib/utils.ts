import type { FileNode } from "@/features/editor/lib/types"

// ─── Unique ID ────────────────────────────────────────────────────────────────
let _id = 0
export const uid = () => `n${++_id}`

// ─── Deterministic file ID from path ─────────────────────────────────────────
/** Produces a stable ID for a file/folder node based on its path in the tree. */
export function fileIdFromPath(parentPath: string | null, name: string): string {
  return parentPath ? `${parentPath}/${name}` : name
}

// ─── Tree serialisation helpers (for room-level CRDT sync) ───────────────────

/** Strip local-only fields (content, isOpen) before syncing the tree to the room. */
export function stripLocalFields(nodes: FileNode[]): FileNode[] {
  return nodes.map(n => {
    const stripped: FileNode = { id: n.id, name: n.name, type: n.type }
    if (n.language) stripped.language = n.language
    if (n.githubPath) stripped.githubPath = n.githubPath
    if (n.children) stripped.children = stripLocalFields(n.children)
    return stripped
  })
}

/** Merge a remote tree (no content/isOpen) with local state, preserving local fields. */
export function mergeRemoteTree(remote: FileNode[], local: FileNode[]): FileNode[] {
  const localMap = new Map<string, FileNode>()
  function collect(nodes: FileNode[]) {
    for (const n of nodes) {
      localMap.set(n.id, n)
      if (n.children) collect(n.children)
    }
  }
  collect(local)

  function merge(nodes: FileNode[]): FileNode[] {
    const seen = new Set<string>()
    return nodes
      .filter(n => {
        if (seen.has(n.id)) return false
        seen.add(n.id)
        return true
      })
      .map(n => {
        const loc = localMap.get(n.id)
        return {
          ...n,
          isOpen: loc?.isOpen ?? (n.type === "folder" ? false : undefined),
          content: loc?.content ?? n.content,
          children: n.children ? merge(n.children) : undefined,
        }
      })
  }
  return merge(remote)
}

// ─── Language Detection ───────────────────────────────────────────────────────
export function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase()
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript",
    js: "javascript", jsx: "javascript",
    php: "php", html: "html", css: "css",
    json: "json", md: "markdown",
    py: "python", rs: "rust", go: "go",
    sql: "sql", sh: "shell",
  }
  return map[ext ?? ""] ?? "plaintext"
}

// ─── File Icons ───────────────────────────────────────────────────────────────
const FILE_ICONS: Record<string, { icon: string; color: string }> = {
  tsx:  { icon: "⚛",  color: "#61DAFB" },
  ts:   { icon: "TS", color: "#3178C6" },
  jsx:  { icon: "⚛",  color: "#61DAFB" },
  js:   { icon: "JS", color: "#F7DF1E" },
  php:  { icon: "🐘", color: "#8892BF" },
  html: { icon: "<>", color: "#E34F26" },
  css:  { icon: "#",  color: "#1572B6" },
  json: { icon: "{}", color: "#F6C90E" },
  md:   { icon: "M↓", color: "#083FA1" },
  py:   { icon: "🐍", color: "#3572A5" },
}

export function getFileIcon(name: string): { icon: string; color: string } {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  return FILE_ICONS[ext] ?? { icon: "·", color: "#858585" }
}

// ─── Flatten Tree (for search) ────────────────────────────────────────────────
export function flatFiles(
  nodes: FileNode[],
  path = ""
): Array<{ node: FileNode; path: string }> {
  const result: Array<{ node: FileNode; path: string }> = []
  for (const n of nodes) {
    const p = path ? `${path}/${n.name}` : n.name
    if (n.type === "file") result.push({ node: n, path: p })
    if (n.children) result.push(...flatFiles(n.children, p))
  }
  return result
}

// ─── Tree Mutations ───────────────────────────────────────────────────────────
export function addNode(
  tree: FileNode[],
  parentId: string | null,
  node: FileNode
): FileNode[] {
  if (parentId === null) {
    if (tree.some(n => n.id === node.id)) return tree
    return [...tree, node]
  }
  return tree.map(n => {
    if (n.id === parentId) {
      const children = n.children ?? []
      if (children.some(c => c.id === node.id)) return { ...n, isOpen: true, children }
      return { ...n, isOpen: true, children: [...children, node] }
    }
    if (n.children)
      return { ...n, children: addNode(n.children, parentId, node) }
    return n
  })
}

export function toggleFolder(tree: FileNode[], id: string): FileNode[] {
  return tree.map(n => {
    if (n.id === id) return { ...n, isOpen: !n.isOpen }
    if (n.children) return { ...n, children: toggleFolder(n.children, id) }
    return n
  })
}

export function deleteNode(tree: FileNode[], id: string): FileNode[] {
  return tree
    .filter(n => n.id !== id)
    .map(n => (n.children ? { ...n, children: deleteNode(n.children, id) } : n))
}

export function getBreadcrumb(
  nodes: FileNode[],
  targetId: string,
  path: string[] = []
): string[] | null {
  for (const n of nodes) {
    if (n.id === targetId) return [...path, n.name]
    if (n.children) {
      const found = getBreadcrumb(n.children, targetId, [...path, n.name])
      if (found) return found
    }
  }
  return null
}

// ─── Find node by ID (for activity log undo) ─────────────────────────────────
export function findNodeById(nodes: FileNode[], id: string): FileNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children) {
      const found = findNodeById(n.children, id)
      if (found) return found
    }
  }
  return null
}

export function getParentId(fileId: string): string | null {
  const lastSlash = fileId.lastIndexOf("/")
  return lastSlash === -1 ? null : fileId.slice(0, lastSlash)
}
import type { FileNode } from "@/components/editor/types"

// ─── Unique ID ────────────────────────────────────────────────────────────────
let _id = 0
export const uid = () => `n${++_id}`

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
  if (parentId === null) return [...tree, node]
  return tree.map(n => {
    if (n.id === parentId)
      return { ...n, isOpen: true, children: [...(n.children ?? []), node] }
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
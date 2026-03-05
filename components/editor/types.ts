// ─── Core Types ───────────────────────────────────────────────────────────────

export type FileNode = {
  id: string
  name: string
  type: "file" | "folder"
  language?: string
  content?: string
  children?: FileNode[]
  isOpen?: boolean
}

export type InlineCreate = {
  parentId: string | null
  type: "file" | "folder"
} | null
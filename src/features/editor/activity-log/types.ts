export type ActivityAction =
  | "edit"
  | "create-file"
  | "create-folder"
  | "delete-file"
  | "delete-folder"
  | "select-file"

export interface EditDelta {
  type: "insert" | "delete"
  startLineNumber: number
  endLineNumber: number
  text: string
}

export interface StructuralDelta {
  type: "create" | "delete"
  filePath: string
  fileContent?: string
  fileType: "file" | "folder"
  language?: string
  parentId: string | null
}

export type ActivityDelta = EditDelta | StructuralDelta

export interface ActivityLogEntry {
  id: string
  roomId: string
  userId: string
  username: string
  action: ActivityAction
  targetFile: string
  targetFileName: string
  lineNumber?: number
  delta?: ActivityDelta
  timestamp: number
  undone?: boolean
}

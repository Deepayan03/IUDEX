// ── Menu item shape ───────────────────────────────────────────────────────────
export type MenuItem =
  | { divider: true; label?: never; shortcut?: never; disabled?: never; action?: never }
  | { divider?: false; label: string; shortcut?: string; disabled?: boolean; action?: string }

// ── Every action the titlebar can emit ───────────────────────────────────────
export type TitleBarAction =
  // File
  | "new-file" | "new-window" | "save" | "save-as" | "save-all"
  | "close-editor" | "preferences"
  // Edit
  | "undo" | "redo" | "find" | "replace" | "format-document" | "toggle-comment"
  // View
  | "command-palette" | "toggle-explorer" | "toggle-search-panel"
  | "toggle-terminal" | "zoom-in" | "zoom-out" | "zoom-reset"
  | "toggle-panel-layout" | "customize-layout"
  // Go
  | "go-back" | "go-forward" | "go-to-file" | "go-to-line"
  // Run
  | "start-debug" | "run-without-debug" | "toggle-breakpoint"
  // Terminal
  | "new-terminal" | "split-terminal" | "run-build-task"
  // Icons
  | "toggle-sidebar" | "notifications"

// ── Open-menu state ───────────────────────────────────────────────────────────
export type OpenMenu = { key: string; top: number; left: number } | null

// ── TitleBar props ────────────────────────────────────────────────────────────
export interface TitleBarProps {
  activeFileName?: string | null
  sidebarVisible?: boolean
  onAction: (action: TitleBarAction) => void
}
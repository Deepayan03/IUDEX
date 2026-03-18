// ── Menu item shape ────────────────────────────────────────────────────────
export type MenuItem =
  | { divider: true }
  | {
      divider?: false
      label: string
      shortcut?: string
      disabled?: boolean
      action?: TitleBarAction
    }

// ── Every action the titlebar can emit ─────────────────────────────────────
export type TitleBarAction =

  // File
  | "new-file"
  | "new-folder"
  | "new-window"
  | "save"
  | "save-as"
  | "save-all"
  | "close-editor"
  | "close-all-editors"
  | "preferences"
  | "open-recent"
  | "import-github"

  // Edit
  | "undo"
  | "redo"
  | "cut"
  | "copy"
  | "paste"
  | "select-all"
  | "find"
  | "replace"
  | "format-document"
  | "toggle-comment"

  // View
  | "command-palette"
  | "toggle-explorer"
  | "toggle-search-panel"
  | "toggle-terminal"
  | "toggle-panel-layout"
  | "customize-layout"
  | "toggle-sidebar"
  | "zoom-in"
  | "zoom-out"
  | "zoom-reset"

  // Go
  | "go-back"
  | "go-forward"
  | "go-to-file"
  | "go-to-line"
  | "go-to-symbol"
  | "go-to-definition"

  // Run
  | "start-debug"
  | "run-without-debug"
  | "stop-debug"
  | "restart-debug"
  | "toggle-breakpoint"

  // Terminal
  | "new-terminal"
  | "split-terminal"
  | "kill-terminal"
  | "run-build-task"
  | "run-active-file"

  // Activity Log
  | "toggle-activity-log"

  // Misc
  | "notifications"


// ── Open-menu state ────────────────────────────────────────────────────────
export type OpenMenu = { key: string; top: number; left: number } | null


// ── TitleBar props ─────────────────────────────────────────────────────────
export interface TitleBarProps {
  onAction: (action: TitleBarAction) => void
}
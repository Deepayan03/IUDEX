import type { MenuItem } from "./types"

// ── State passed to buildMenus so items can be disabled dynamically ───────────
export interface MenuState {
  isDebugging:    boolean
  terminalOpen:   boolean
  sidebarOpen:    boolean
  hasActiveFile:  boolean
  hasOpenTabs:    boolean
  canGoBack:      boolean
  canGoForward:   boolean
}

export function buildMenus(s: MenuState): Record<string, MenuItem[]> {
  return {
    File: [
      { label: "New Text File",          shortcut: "⌘N",    action: "new-file" },
      { label: "New Folder",             shortcut: "⌥⌘N",   action: "new-folder" },
      { label: "New Window",             shortcut: "⇧⌘N",   action: "new-window" },
      { divider: true },
      { label: "Open Recent",                               action: "open-recent" },
      { label: "Import from GitHub...",                      action: "import-github" },
      { divider: true },
      { label: "Save",                   shortcut: "⌘S",    action: "save",             disabled: !s.hasActiveFile },
      { label: "Save As...",             shortcut: "⇧⌘S",   action: "save-as",          disabled: !s.hasActiveFile },
      { label: "Save All",               shortcut: "⌥⌘S",   action: "save-all",         disabled: !s.hasOpenTabs },
      { divider: true },
      { label: "Close Editor",           shortcut: "⌘W",    action: "close-editor",     disabled: !s.hasActiveFile },
      { label: "Close All Editors",      shortcut: "⌘K W",  action: "close-all-editors",disabled: !s.hasOpenTabs },
      { divider: true },
      { label: "Preferences",            shortcut: "⌘,",    action: "preferences" },
    ],
    Edit: [
      { label: "Undo",                   shortcut: "⌘Z",    action: "undo",             disabled: !s.hasActiveFile },
      { label: "Redo",                   shortcut: "⇧⌘Z",   action: "redo",             disabled: !s.hasActiveFile },
      { divider: true },
      { label: "Cut",                    shortcut: "⌘X",    action: "cut",              disabled: !s.hasActiveFile },
      { label: "Copy",                   shortcut: "⌘C",    action: "copy",             disabled: !s.hasActiveFile },
      { label: "Paste",                  shortcut: "⌘V",    action: "paste",            disabled: !s.hasActiveFile },
      { label: "Select All",             shortcut: "⌘A",    action: "select-all",       disabled: !s.hasActiveFile },
      { divider: true },
      { label: "Find",                   shortcut: "⌘F",    action: "find",             disabled: !s.hasActiveFile },
      { label: "Replace",                shortcut: "⌥⌘F",   action: "replace",          disabled: !s.hasActiveFile },
      { divider: true },
      { label: "Toggle Line Comment",    shortcut: "⌘/",    action: "toggle-comment",   disabled: !s.hasActiveFile },
      { label: "Format Document",        shortcut: "⇧⌥F",   action: "format-document",  disabled: !s.hasActiveFile },
    ],
    View: [
      { label: "Command Palette...",     shortcut: "⇧⌘P",   action: "command-palette" },
      { divider: true },
      { label: s.sidebarOpen ? "Hide Explorer" : "Show Explorer",
                                         shortcut: "⇧⌘E",   action: "toggle-explorer" },
      { label: s.terminalOpen ? "Hide Terminal" : "Show Terminal",
                                         shortcut: "⌃`",    action: "toggle-terminal" },
      { divider: true },
      { label: "Toggle Panel Layout",    shortcut: "⌘K ⌘J", action: "toggle-panel-layout" },
      { divider: true },
      { label: "Zoom In",                shortcut: "⌘=",    action: "zoom-in" },
      { label: "Zoom Out",               shortcut: "⌘-",    action: "zoom-out" },
      { label: "Reset Zoom",             shortcut: "⌘0",    action: "zoom-reset" },
    ],
    Go: [
      { label: "Back",                   shortcut: "⌃-",    action: "go-back",          disabled: !s.canGoBack },
      { label: "Forward",                shortcut: "⌃⇧-",   action: "go-forward",       disabled: !s.canGoForward },
      { divider: true },
      { label: "Go to File...",          shortcut: "⌘P",    action: "go-to-file" },
      { label: "Go to Symbol...",        shortcut: "⇧⌘O",   action: "go-to-symbol",     disabled: !s.hasActiveFile },
      { label: "Go to Line/Column...",   shortcut: "⌃G",    action: "go-to-line",       disabled: !s.hasActiveFile },
      { divider: true },
      { label: "Go to Definition",       shortcut: "F12",   action: "go-to-definition", disabled: !s.hasActiveFile },
    ],
    Run: [
      { label: "Start Debugging",        shortcut: "F5",    action: "start-debug",      disabled: s.isDebugging },
      { label: "Run Without Debugging",  shortcut: "⌃F5",   action: "run-without-debug",disabled: s.isDebugging },
      { label: "Stop Debugging",         shortcut: "⇧F5",   action: "stop-debug",       disabled: !s.isDebugging },
      { label: "Restart Debugging",      shortcut: "⇧⌘F5",  action: "restart-debug",    disabled: !s.isDebugging },
      { divider: true },
      { label: "Toggle Breakpoint",      shortcut: "F9",    action: "toggle-breakpoint",disabled: !s.hasActiveFile },
      { label: "Run Build Task...",      shortcut: "⇧⌘B",   action: "run-build-task" },
    ],
    Terminal: [
      { label: "New Terminal",           shortcut: "⌃⇧`",   action: "new-terminal" },
      { label: "Split Terminal",         shortcut: "⌃⇧5",   action: "split-terminal" },
      { divider: true },
      { label: "Run Build Task...",      shortcut: "⇧⌘B",   action: "run-build-task" },
      { label: "Run Active File",                            action: "run-active-file",  disabled: !s.hasActiveFile },
      { divider: true },
      { label: "Kill Terminal",                              action: "kill-terminal",    disabled: !s.terminalOpen },
    ],
  }
}

// Static menu keys order (never changes)
export const MENU_KEYS = ["File", "Edit", "View", "Go", "Run", "Terminal"]

// ── Toast messages ────────────────────────────────────────────────────────────
export const ACTION_TOASTS: Partial<Record<string, string>> = {
  "save":              "✓  File saved",
  "import-github":     "Importing from GitHub...",
  "save-all":          "✓  All files saved",
  "save-as":           "↓  File downloaded",
  "new-file":          "New file created",
  "new-folder":        "New folder created",
  "close-all-editors": "All editors closed",
  "format-document":   "✓  Document formatted",
  "toggle-comment":    "Comment toggled",
  "zoom-in":           "Zoom in",
  "zoom-out":          "Zoom out",
  "zoom-reset":        "Zoom reset to 100%",
  "start-debug":       "▶  Debugger started",
  "stop-debug":        "■  Debugger stopped",
  "restart-debug":     "↺  Debugger restarted",
  "run-without-debug": "▶  Running without debugger",
  "toggle-breakpoint": "Breakpoint toggled",
  "new-terminal":      "Terminal opened",
  "kill-terminal":     "Terminal killed",
  "run-build-task":    "⚙  Running build task…",
  "run-active-file":   "▶  Running active file…",
}

// ── Command palette entries ───────────────────────────────────────────────────
export const PALETTE_COMMANDS: { label: string; shortcut?: string; action: string; category: string }[] = [
  { label: "New File",              shortcut: "⌘N",   action: "new-file",            category: "File" },
  { label: "New Folder",            shortcut: "⌥⌘N",  action: "new-folder",          category: "File" },
  { label: "Save",                  shortcut: "⌘S",   action: "save",                category: "File" },
  { label: "Save As",               shortcut: "⇧⌘S",  action: "save-as",             category: "File" },
  { label: "Save All",              shortcut: "⌥⌘S",  action: "save-all",            category: "File" },
  { label: "Close Editor",          shortcut: "⌘W",   action: "close-editor",        category: "File" },
  { label: "Close All Editors",     shortcut: "⌘K W", action: "close-all-editors",   category: "File" },
  { label: "Preferences",           shortcut: "⌘,",   action: "preferences",         category: "File" },
  { label: "Open Recent",                             action: "open-recent",          category: "File" },
  { label: "Import from GitHub",                        action: "import-github",       category: "File" },
  { label: "Undo",                  shortcut: "⌘Z",   action: "undo",                category: "Edit" },
  { label: "Redo",                  shortcut: "⇧⌘Z",  action: "redo",                category: "Edit" },
  { label: "Find in File",          shortcut: "⌘F",   action: "find",                category: "Edit" },
  { label: "Find and Replace",      shortcut: "⌥⌘F",  action: "replace",             category: "Edit" },
  { label: "Format Document",       shortcut: "⇧⌥F",  action: "format-document",     category: "Edit" },
  { label: "Toggle Line Comment",   shortcut: "⌘/",   action: "toggle-comment",      category: "Edit" },
  { label: "Select All",            shortcut: "⌘A",   action: "select-all",          category: "Edit" },
  { label: "Toggle Sidebar",        shortcut: "⌘B",   action: "toggle-sidebar",      category: "View" },
  { label: "Toggle Search",                           action: "toggle-search-panel", category: "View" },
  { label: "Toggle Terminal",       shortcut: "⌃`",   action: "toggle-terminal",     category: "View" },
  { label: "Toggle Panel Layout",                     action: "toggle-panel-layout", category: "View" },
  { label: "Zoom In",               shortcut: "⌘=",   action: "zoom-in",             category: "View" },
  { label: "Zoom Out",              shortcut: "⌘-",   action: "zoom-out",            category: "View" },
  { label: "Reset Zoom",            shortcut: "⌘0",   action: "zoom-reset",          category: "View" },
  { label: "Go to File",            shortcut: "⌘P",   action: "go-to-file",          category: "Go" },
  { label: "Go to Line",            shortcut: "⌃G",   action: "go-to-line",          category: "Go" },
  { label: "Go to Symbol",          shortcut: "⇧⌘O",  action: "go-to-symbol",        category: "Go" },
  { label: "Go to Definition",      shortcut: "F12",  action: "go-to-definition",    category: "Go" },
  { label: "Go Back",               shortcut: "⌃-",   action: "go-back",             category: "Go" },
  { label: "Go Forward",            shortcut: "⌃⇧-",  action: "go-forward",          category: "Go" },
  { label: "Start Debugging",       shortcut: "F5",   action: "start-debug",         category: "Run" },
  { label: "Stop Debugging",        shortcut: "⇧F5",  action: "stop-debug",          category: "Run" },
  { label: "Run Without Debugging", shortcut: "⌃F5",  action: "run-without-debug",   category: "Run" },
  { label: "Toggle Breakpoint",     shortcut: "F9",   action: "toggle-breakpoint",   category: "Run" },
  { label: "Run Build Task",        shortcut: "⇧⌘B",  action: "run-build-task",      category: "Terminal" },
  { label: "New Terminal",                            action: "new-terminal",        category: "Terminal" },
  { label: "Kill Terminal",                           action: "kill-terminal",       category: "Terminal" },
]

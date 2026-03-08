// ── Core editor types ─────────────────────────────────────────────────────────

export type FileNode = {
  id: string
  name: string
  type: "file" | "folder"
  language?: string
  content?: string
  children?: FileNode[]
  isOpen?: boolean
  githubPath?: string
}

export type InlineCreate = {
  parentId: string | null
  type: "file" | "folder"
} | null

// ── Editor preferences (persisted in localStorage) ───────────────────────────

export type EditorPrefs = {
  fontSize:         number                              // 10–24
  fontFamily:       string
  tabSize:          number                              // 2 | 4 | 8
  wordWrap:         "on" | "off"
  minimap:          boolean
  lineNumbers:      "on" | "off" | "relative"
  theme:            "vs-dark" | "light" | "hc-black"
  renderWhitespace: "none" | "boundary" | "all"
  cursorStyle:      "line" | "block" | "underline"
  formatOnSave:     boolean
}

export const DEFAULT_PREFS: EditorPrefs = {
  fontSize:         13,
  fontFamily:       "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
  tabSize:          2,
  wordWrap:         "on",
  minimap:          true,
  lineNumbers:      "on",
  theme:            "vs-dark",
  renderWhitespace: "none",
  cursorStyle:      "line",
  formatOnSave:     false,
}

export function loadPrefs(): EditorPrefs {
  try {
    const raw = localStorage.getItem("iudex:prefs")
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {}
  return { ...DEFAULT_PREFS }
}

export function savePrefs(p: EditorPrefs) {
  try { localStorage.setItem("iudex:prefs", JSON.stringify(p)) } catch {}
}
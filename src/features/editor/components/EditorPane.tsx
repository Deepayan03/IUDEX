"use client"

import CodeEditor, { type EditorInstance } from "./CodeEditor"
import TerminalPanel                        from "./TerminalPanel"
import type { FileNode, EditorPrefs }       from "@/features/editor/lib/types"
import { getFileIcon, getLanguage }         from "@/features/editor/lib/utils"
import type { TitleBarAction }              from "./titlebar/types"

interface EditorPaneProps {
  activeFile:          FileNode | null
  openTabs:            FileNode[]
  unsavedIds:          Set<string>
  breadcrumb:          string[]
  prefs:               EditorPrefs
  terminalVisible:     boolean
  terminalHeight:      number
  loadingFileId?:      string | null
  crdtMode?:           boolean
  onAction?:           (action: TitleBarAction) => void
  onTabClick:          (tab: FileNode) => void
  onTabClose:          (id: string, e: React.MouseEvent) => void
  onEditorMount:       (editor: EditorInstance) => void
  onContentChange:     (value: string) => void
  onTerminalResizeStart: (e: React.MouseEvent) => void
}

export default function EditorPane({
  activeFile, openTabs, unsavedIds, breadcrumb,
  prefs, terminalVisible, terminalHeight,
  loadingFileId, crdtMode, onAction,
  onTabClick, onTabClose,
  onEditorMount, onContentChange, onTerminalResizeStart,
}: EditorPaneProps) {
  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden" style={{ background: "#060c18" }}>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div
        className="h-9 min-h-9 flex items-end shrink-0 no-scrollbar overflow-x-auto"
        style={{ background: "#04080f", borderBottom: "1px solid #0d1525" }}
      >
        {openTabs.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full">
            <span style={{ fontSize: 11, color: "#1e2d4a" }}>Open a file to start editing</span>
          </div>
        ) : (
          openTabs.map(tab => {
            const isActive  = activeFile?.id === tab.id
            const isDirty   = unsavedIds.has(tab.id)
            const { icon, color } = getFileIcon(tab.name)
            return (
              <div
                key={tab.id}
                onClick={() => onTabClick(tab)}
                className={`h-full flex items-center gap-2 px-4 text-[12px] cursor-pointer border-r border-[#0d1525] shrink-0 animate-tabSlide transition-all duration-150 ${isActive ? "tab-active" : "tab-inactive"}`}
                style={{ minWidth: 120, maxWidth: 180 }}
              >
                <span style={{ color, fontSize: 10, fontWeight: "bold" }}>{icon}</span>
                <span className="truncate flex-1 editor-font">{tab.name}</span>

                {/* Dirty indicator or close button */}
                <button
                  onClick={e => isDirty ? e.stopPropagation() : onTabClose(tab.id, e)}
                  title={isDirty ? "Unsaved changes" : "Close"}
                  className="w-4 h-4 flex items-center justify-center rounded transition-all duration-150 shrink-0"
                  style={{
                    color:      isActive ? "#4a6080" : "transparent",
                    background: "transparent",
                  }}
                  onMouseEnter={e => {
                    if (!isDirty) (e.currentTarget as HTMLElement).style.background = "#1e2d4a"
                    ;(e.currentTarget as HTMLElement).style.color = isDirty ? "#f59e0b" : "white"
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "transparent"
                    ;(e.currentTarget as HTMLElement).style.color = isActive ? "#4a6080" : "transparent"
                  }}
                >
                  {isDirty ? (
                    <svg width="8" height="8" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3.5" fill="currentColor"/>
                    </svg>
                  ) : (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6"  y1="6" x2="18" y2="18"/>
                    </svg>
                  )}
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      {activeFile && (
        <div
          className="h-6 min-h-6 flex items-center px-4 shrink-0 editor-font"
          style={{ background: "#060c18", borderBottom: "1px solid #0a1424", fontSize: 11, color: "#2a3a5a" }}
        >
          {breadcrumb.map((seg, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="mx-1" style={{ color: "#1a2a42" }}>›</span>}
              <span style={{ color: i === breadcrumb.length - 1 ? "#6a8aac" : "#2a3a5a" }}>{seg}</span>
            </span>
          ))}
        </div>
      )}

      {/* ── Monaco / Loading / Welcome ────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {activeFile ? (
          loadingFileId === activeFile.id ? (
            <div className="flex flex-col items-center justify-center h-full animate-fadeIn gap-3" style={{ color: "#3a5080" }}>
              <div style={{
                width: 20, height: 20, border: "2px solid #3d5afe",
                borderTopColor: "transparent", borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
              }} />
              <span style={{ fontSize: 12 }}>Loading {activeFile.name}...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          ) : (
            <div key={activeFile.id} className="w-full h-full animate-fadeIn">
              <CodeEditor
                language={getLanguage(activeFile.name)}
                defaultValue={activeFile.content ?? `// ${activeFile.name}`}
                prefs={prefs}
                crdtMode={crdtMode}
                onMount={onEditorMount}
                onChange={onContentChange}
              />
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full animate-fadeIn" style={{ color: "#1e2d4a" }}>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-2xl font-bold text-white"
              style={{ background: "linear-gradient(135deg, #3d5afe 0%, #651fff 100%)", boxShadow: "0 0 40px rgba(61,90,254,0.2)" }}
            >
              IX
            </div>
            <h2 className="text-[18px] font-semibold mb-2" style={{ color: "#243050" }}>IUDEX Editor</h2>
            <p className="text-[12px] mb-6" style={{ color: "#182438" }}>CRDT-powered collaborative editing</p>
            <div className="flex flex-col gap-2 text-[12px]" style={{ color: "#1a2a42" }}>
              <span>← Select a file from the sidebar to begin</span>
              <span>← ⌘N to create a new file</span>
              <span>← ⌃` to open the terminal</span>
              <span>← ⌘, for preferences</span>
            </div>

            {onAction && (
              <button
                onClick={() => onAction("import-github")}
                className="mt-8 flex items-center gap-2 px-4 py-2.5 rounded-md text-[12px] transition-all duration-200"
                style={{
                  background: "rgba(61,90,254,0.1)",
                  border: "1px solid rgba(61,90,254,0.3)",
                  color: "#7b9ef7",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(61,90,254,0.2)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(61,90,254,0.5)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(61,90,254,0.1)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(61,90,254,0.3)";
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                Import from GitHub
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Terminal Panel ─────────────────────────────────────────────────── */}
      {terminalVisible && (
        <TerminalPanel
          height={terminalHeight}
          onResizeStart={onTerminalResizeStart}
        />
      )}
    </div>
  )
}

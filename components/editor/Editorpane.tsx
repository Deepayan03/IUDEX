"use client"

import CodeEditor, { type EditorInstance } from "./CodeEditor"
import TerminalPanel                        from "./TerminalPanel"
import type { FileNode, EditorPrefs }       from "./types"
import { getFileIcon, getLanguage }         from "./utils"

interface EditorPaneProps {
  activeFile:          FileNode | null
  openTabs:            FileNode[]
  unsavedIds:          Set<string>
  breadcrumb:          string[]
  prefs:               EditorPrefs
  terminalVisible:     boolean
  terminalHeight:      number
  onTabClick:          (tab: FileNode) => void
  onTabClose:          (id: string, e: React.MouseEvent) => void
  onEditorMount:       (editor: EditorInstance) => void
  onContentChange:     (value: string) => void
  onTerminalResizeStart: (e: React.MouseEvent) => void
}

export default function EditorPane({
  activeFile, openTabs, unsavedIds, breadcrumb,
  prefs, terminalVisible, terminalHeight,
  onTabClick, onTabClose,
  onEditorMount, onContentChange, onTerminalResizeStart,
}: EditorPaneProps) {
  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden" style={{ background: "#060c18" }}>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div
        className="h-[36px] min-h-[36px] flex items-end flex-shrink-0 no-scrollbar overflow-x-auto"
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
                className={`h-full flex items-center gap-2 px-4 text-[12px] cursor-pointer border-r border-[#0d1525] flex-shrink-0 animate-tabSlide transition-all duration-150 ${isActive ? "tab-active" : "tab-inactive"}`}
                style={{ minWidth: 120, maxWidth: 180 }}
              >
                <span style={{ color, fontSize: 10, fontWeight: "bold" }}>{icon}</span>
                <span className="truncate flex-1 editor-font">{tab.name}</span>

                {/* Dirty indicator or close button */}
                <button
                  onClick={e => isDirty ? e.stopPropagation() : onTabClose(tab.id, e)}
                  title={isDirty ? "Unsaved changes" : "Close"}
                  className="w-4 h-4 flex items-center justify-center rounded transition-all duration-150 flex-shrink-0"
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
          className="h-[24px] min-h-[24px] flex items-center px-4 flex-shrink-0 editor-font"
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

      {/* ── Monaco / Welcome ───────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {activeFile ? (
          <div key={activeFile.id} className="w-full h-full animate-fadeIn">
            <CodeEditor
              language={getLanguage(activeFile.name)}
              defaultValue={activeFile.content ?? `// ${activeFile.name}`}
              prefs={prefs}
              onMount={onEditorMount}
              onChange={onContentChange}
            />
          </div>
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
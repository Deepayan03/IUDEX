"use client"

import CodeEditor from "./CodeEditor"
import type { FileNode } from "./types"
import { getFileIcon, getLanguage } from "./utils"

interface EditorPaneProps {
  activeFile: FileNode | null
  openTabs: FileNode[]
  breadcrumb: string[]
  onTabClick: (tab: FileNode) => void
  onTabClose: (id: string, e: React.MouseEvent) => void
}

export default function EditorPane({
  activeFile, openTabs, breadcrumb, onTabClick, onTabClose,
}: EditorPaneProps) {
  return (
    <div className="flex flex-col flex-1 min-w-0" style={{ background: "#060c18" }}>

      {/* ── Tabs ── */}
      <div
        className="h-9 min-h-9 flex items-end shrink-0 no-scrollbar overflow-x-auto"
        style={{ background: "#04080f", borderBottom: "1px solid #0d1525" }}
      >
        {openTabs.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full">
            <span className="text-[11px]" style={{ color: "#1e2d4a" }}>
              Open a file to start editing
            </span>
          </div>
        ) : (
          openTabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => onTabClick(tab)}
              className={`
                h-full flex items-center gap-2 px-4 text-[12px] cursor-pointer
                border-r border-[#0d1525] shrink-0 animate-tabSlide transition-all duration-150
                ${activeFile?.id === tab.id ? "tab-active" : "tab-inactive"}
              `}
              style={{ minWidth: "120px", maxWidth: "180px" }}
            >
              <span
                style={{
                  color: getFileIcon(tab.name).color,
                  fontSize: "10px",
                  fontWeight: "bold",
                }}
              >
                {getFileIcon(tab.name).icon}
              </span>
              <span className="truncate flex-1 editor-font">{tab.name}</span>
              <button
                onClick={e => onTabClose(tab.id, e)}
                className={`
                  w-4 h-4 flex items-center justify-center rounded
                  transition-all duration-150 shrink-0
                  ${activeFile?.id === tab.id
                    ? "text-[#4a6080] hover:text-white hover:bg-[#1e2d4a]"
                    : "opacity-0"}
                `}
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* ── Breadcrumb ── */}
      {activeFile && (
        <div
          className="h-6 min-h-6 flex items-center px-4 shrink-0 editor-font"
          style={{
            background: "#060c18",
            borderBottom: "1px solid #0a1424",
            fontSize: "11px",
            color: "#2a3a5a",
          }}
        >
          {breadcrumb.map((segment, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="mx-1" style={{ color: "#1a2a42" }}>›</span>}
              <span style={{ color: i === breadcrumb.length - 1 ? "#6a8aac" : "#2a3a5a" }}>
                {segment}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* ── Monaco / Welcome ── */}
      <div className="flex-1 min-h-0 relative">
        {activeFile ? (
          <div key={activeFile.id} className="w-full h-full animate-fadeIn">
            <CodeEditor
              language={getLanguage(activeFile.name)}
              defaultValue={activeFile.content ?? `// ${activeFile.name}`}
            />
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center h-full animate-fadeIn"
            style={{ color: "#1e2d4a" }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-2xl font-bold text-white"
              style={{
                background: "linear-gradient(135deg, #3d5afe 0%, #651fff 100%)",
                boxShadow: "0 0 40px rgba(61,90,254,0.2)",
              }}
            >
              IX
            </div>
            <h2 className="text-[18px] font-semibold mb-2" style={{ color: "#243050" }}>
              IUDEX Editor
            </h2>
            <p className="text-[12px] mb-6" style={{ color: "#182438" }}>
              CRDT-powered collaborative editing
            </p>
            <div className="flex flex-col gap-2 text-[12px]" style={{ color: "#1a2a42" }}>
              <span>← Select a file from the sidebar to begin</span>
              <span>← Use the + buttons to create new files or folders</span>
              <span>← Drag the sidebar edge to resize</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
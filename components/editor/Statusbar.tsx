"use client"

import { getLanguage } from "./utils"
import type { FileNode } from "./types"

interface StatusBarProps {
  activeFile:     FileNode | null
  cursorLine?:    number
  cursorCol?:     number
  zoom?:          number
  unsavedCount?:  number
  isDebugging?:   boolean
  terminalVisible?: boolean
  onAction?:      (a: "toggle-terminal" | "toggle-sidebar" | "zoom-reset") => void
}

export default function StatusBar({
  activeFile,
  cursorLine    = 1,
  cursorCol     = 1,
  zoom          = 1,
  unsavedCount  = 0,
  isDebugging   = false,
  terminalVisible = false,
  onAction,
}: StatusBarProps) {
  const language = activeFile ? getLanguage(activeFile.name) : null
  const langLabel = language
    ? language.charAt(0).toUpperCase() + language.slice(1)
    : "Plain Text"

  const zoomPct = Math.round(zoom * 100)

  return (
    <div
      className="h-5.5 min-h-5.5 shrink-0 flex items-center justify-between px-2 select-none text-white text-[11px] editor-font"
      style={{
        background: isDebugging
          ? "linear-gradient(90deg, #7c2d12 0%, #450a0a 100%)"
          : "linear-gradient(90deg, #1a237e 0%, #0d1257 100%)",
        borderTop: "1px solid #1a2a6e",
        transition: "background 0.3s",
      }}
    >
      {/* Left */}
      <div className="flex items-center h-full">
        {/* Branch */}
        <div className="status-item flex items-center gap-1 px-2 h-full cursor-pointer rounded-sm opacity-80 hover:opacity-100">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
            <path d="M18 9a9 9 0 0 1-9 9"/>
          </svg>
          <span>main</span>
        </div>

        {/* Errors */}
        <div className="status-item flex items-center gap-1 px-2 h-full cursor-pointer rounded-sm opacity-80 hover:opacity-100">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span>0</span>
        </div>

        {/* Warnings */}
        <div className="status-item flex items-center gap-1 px-2 h-full cursor-pointer rounded-sm opacity-80 hover:opacity-100">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>0</span>
        </div>

        {/* Unsaved count badge */}
        {unsavedCount > 0 && (
          <div className="status-item flex items-center gap-1 px-2 h-full rounded-sm opacity-90">
            <span style={{ color: "#f59e0b" }}>● {unsavedCount} unsaved</span>
          </div>
        )}

        {/* Debug indicator */}
        {isDebugging && (
          <div className="status-item flex items-center gap-1 px-2 h-full rounded-sm">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <span style={{ color: "#f87171" }}>Debugging</span>
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center h-full">
        {/* Cursor position */}
        {activeFile && (
          <div className="status-item px-2 h-full flex items-center cursor-pointer rounded-sm opacity-70 hover:opacity-100">
            Ln {cursorLine}, Col {cursorCol}
          </div>
        )}

        {/* Zoom */}
        {zoomPct !== 100 && (
          <div
            onClick={() => onAction?.("zoom-reset")}
            className="status-item px-2 h-full flex items-center cursor-pointer rounded-sm"
            style={{ color: "#f59e0b", opacity: 0.9 }}
            title="Click to reset zoom"
          >
            {zoomPct}%
          </div>
        )}

        {/* Language */}
        <div className="status-item px-2 h-full flex items-center cursor-pointer rounded-sm opacity-70 hover:opacity-100">
          {langLabel}
        </div>

        {/* Encoding */}
        <div className="status-item px-2 h-full flex items-center opacity-60">UTF-8</div>

        {/* EOL */}
        <div className="status-item px-2 h-full flex items-center opacity-60">LF</div>

        {/* Terminal toggle */}
        <div
          onClick={() => onAction?.("toggle-terminal")}
          className="status-item px-2 h-full flex items-center gap-1 cursor-pointer rounded-sm opacity-70 hover:opacity-100"
          title="Toggle Terminal (⌃`)"
          style={{ color: terminalVisible ? "#3d5afe" : undefined }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
          </svg>
        </div>

        {/* CRDT */}
        <div className="status-item px-2 h-full flex items-center gap-1 cursor-pointer rounded-sm opacity-90 hover:opacity-100">
          <span style={{ color: "#4caf50" }}>● CRDT</span>
        </div>
      </div>
    </div>
  )
}
"use client"

import { getLanguage } from "./utils"
import type { FileNode } from "./types"

interface StatusBarProps {
  activeFile: FileNode | null
}

export default function StatusBar({ activeFile }: StatusBarProps) {
  const language = activeFile
    ? getLanguage(activeFile.name)
    : null

  const langLabel = language
    ? language.charAt(0).toUpperCase() + language.slice(1)
    : "No file"

  return (
    <div
      className="h-5.5 min-h-5.5 shrink-0 flex items-center justify-between px-2 select-none text-white text-[11px] editor-font"
      style={{
        background: "linear-gradient(90deg, #1a237e 0%, #0d1257 100%)",
        borderTop: "1px solid #1a2a6e",
      }}
    >
      {/* Left section */}
      <div className="flex items-center h-full">
        {[
          {
            icon: (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
              </svg>
            ),
            label: "main",
          },
          {
            icon: (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            ),
            label: "0",
          },
          {
            icon: (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              </svg>
            ),
            label: "0",
          },
        ].map(({ icon, label }, i) => (
          <div key={i} className="status-item flex items-center gap-1 px-2 h-full cursor-pointer rounded-sm opacity-80 hover:opacity-100">
            {icon}
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Right section */}
      <div className="flex items-center h-full">
        {[langLabel, "UTF-8", "LF", "Ln 1, Col 1", "Spaces: 2"].map((label, i) => (
          <div key={i} className="status-item px-2 h-full flex items-center cursor-pointer rounded-sm opacity-70 hover:opacity-100">
            {label}
          </div>
        ))}
        <div className="status-item px-2 h-full flex items-center gap-1 cursor-pointer rounded-sm opacity-90 hover:opacity-100">
          <span style={{ color: "#4caf50" }}>● CRDT</span>
        </div>
      </div>
    </div>
  )
}
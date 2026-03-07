"use client"

import { useState, useRef, useEffect } from "react"
import type { TitleBarAction } from "./types"
import { PALETTE_COMMANDS } from "./Menudata"

interface CommandPaletteProps {
  onAction: (action: TitleBarAction) => void
  onClose: () => void
}

export default function CommandPalette({ onAction, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query.trim()
    ? PALETTE_COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : PALETTE_COMMANDS

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", h)
    return () => document.removeEventListener("keydown", h)
  }, [onClose])

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99998,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: 80,
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: "#1e2433",
        border: "1px solid #2d3a52",
        borderRadius: 6,
        width: 520,
        boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
        overflow: "hidden",
        animation: "paletteIn 0.15s ease both",
      }}>
        {/* Search input */}
        <div style={{
          borderBottom: "1px solid #2d3a52",
          padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4a6080" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command..."
            style={{
              background: "transparent", border: "none", outline: "none",
              color: "#e2e8f0", fontSize: 13, flex: 1,
            }}
          />
          <span style={{ fontSize: 11, color: "#2a3a52", fontFamily: "monospace" }}>esc</span>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 16, textAlign: "center", color: "#2a3a52", fontSize: 12 }}>
              No commands found
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={i}
                onClick={() => { onAction(cmd.action as TitleBarAction); onClose() }}
                style={{
                  width: "100%", display: "flex", alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 16px", border: "none",
                  background: "transparent", color: "#cccccc",
                  fontSize: 13, cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#094771" }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
              >
                <span>{cmd.label}</span>
                {cmd.shortcut && (
                  <span style={{ fontSize: 11, color: "#4a6080", fontFamily: "monospace" }}>
                    {cmd.shortcut}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
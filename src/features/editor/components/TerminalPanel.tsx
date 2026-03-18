"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useTerminalStore } from "@/shared/state/terminal"

interface TerminalPanelProps {
  height: number
  onResizeStart: (e: React.MouseEvent) => void
}

export default function TerminalPanel({ height, onResizeStart }: TerminalPanelProps) {
  const [input, setInput]     = useState("")
  const [histIdx, setHistIdx] = useState(-1)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const lines = useTerminalStore(s => s.lines)
  const history = useTerminalStore(s => s.history)
  const cwd = useTerminalStore(s => s.cwd)
  const executeCommand = useTerminalStore(s => s.executeCommand)
  const clearScreen = useTerminalStore(s => s.clearScreen)

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [lines])

  const submit = useCallback(() => {
    const cmd = input.trim()
    if (!cmd) return

    executeCommand(cmd)
    setHistIdx(-1)
    setInput("")
  }, [executeCommand, input])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter")      { submit(); return }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      const next = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(next)
      setInput(history[next] ?? "")
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      const next = histIdx - 1
      if (next < 0) { setHistIdx(-1); setInput(""); return }
      setHistIdx(next)
      setInput(history[next] ?? "")
    }
    if (e.key === "l" && e.ctrlKey) {
      e.preventDefault()
      clearScreen()
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height, background: "#0a0f1a", borderTop: "1px solid #161f30", flexShrink: 0 }}>

      {/* Resize handle */}
      <div
        onMouseDown={onResizeStart}
        style={{
          height: 4, cursor: "row-resize", flexShrink: 0,
          background: "transparent",
          borderTop: "1px solid #1e2d42",
        }}
        onMouseEnter={e  => { (e.currentTarget as HTMLElement).style.background = "rgba(61,90,254,0.3)" }}
        onMouseLeave={e  => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
      />

      {/* Tab bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 30, minHeight: 30, padding: "0 12px",
        background: "#060c18", borderBottom: "1px solid #161f30",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "2px 10px", borderRadius: 3,
            background: "#0d1525", border: "1px solid #1e2d42",
            fontSize: 12, color: "#8899b0",
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3d5afe" strokeWidth="2">
              <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
            </svg>
            bash
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10, color: "#2a3a52", fontFamily: "monospace" }}>{cwd}</span>
        </div>
      </div>

      {/* Output */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{ flex: 1, overflowY: "auto", padding: "8px 14px", fontFamily: "monospace", fontSize: 12, cursor: "text" }}
      >
        {lines.map(line => (
          <div key={line.id} style={{
            lineHeight: "1.6",
            color:
              line.type === "error" ? "#f87171" :
              line.type === "info"  ? "#3d5afe" :
              line.type === "input" ? "#e2e8f0" :
                                      "#8bb8e0",
            whiteSpace: "pre-wrap", wordBreak: "break-all",
          }}>
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 14px", borderTop: "1px solid #0d1525",
        background: "#060c18", flexShrink: 0,
      }}>
        <span style={{ color: "#3d5afe", fontFamily: "monospace", fontSize: 12, flexShrink: 0 }}>
          {cwd.split("/").pop() ?? "~"} $
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus
          spellCheck={false}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: "#e2e8f0", fontFamily: "monospace", fontSize: 12, caretColor: "#3d5afe",
          }}
        />
      </div>
    </div>
  )
}

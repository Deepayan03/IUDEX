"use client"

import { useState, useRef, useEffect, useCallback } from "react"

interface Line {
  id: number
  type: "input" | "output" | "error" | "info"
  text: string
}

let lineId = 0
const mkLine = (type: Line["type"], text: string): Line => ({ id: ++lineId, type, text })

// Simple command interpreter
function runCommand(cmd: string, cwd: string): { lines: Line[]; newCwd?: string } {
  const parts = cmd.trim().split(/\s+/)
  const bin   = parts[0]
  const args  = parts.slice(1)

  if (!bin) return { lines: [] }

  switch (bin) {
    case "clear": return { lines: [{ id: ++lineId, type: "info", text: "\x1b[CLEAR]" }] }

    case "echo":  return { lines: [mkLine("output", args.join(" "))] }

    case "pwd":   return { lines: [mkLine("output", cwd)] }

    case "ls":
    case "ls -la":
      return {
        lines: [
          mkLine("output", "drwxr-xr-x  app/"),
          mkLine("output", "drwxr-xr-x  components/"),
          mkLine("output", "drwxr-xr-x  lib/"),
          mkLine("output", "-rw-r--r--  package.json"),
          mkLine("output", "-rw-r--r--  tsconfig.json"),
          mkLine("output", "-rw-r--r--  next.config.ts"),
        ],
      }

    case "cd": {
      const target = args[0] ?? "~"
      if (target === "..") {
        const parts2 = cwd.split("/").filter(Boolean)
        parts2.pop()
        const next = "/" + parts2.join("/") || "/"
        return { lines: [], newCwd: next }
      }
      const next = target.startsWith("/") ? target : `${cwd}/${target}`.replace("//", "/")
      return { lines: [], newCwd: next }
    }

    case "node":  return { lines: [mkLine("output", "Welcome to Node.js v20.11.0.\nType \".help\" for more information.")] }

    case "npm": {
      if (args[0] === "run" && args[1]) {
        return {
          lines: [
            mkLine("info",   `> iudex@0.1.0 ${args[1]}`),
            mkLine("info",   `> next ${args[1] === "build" ? "build" : "dev"}`),
            mkLine("output", args[1] === "build" ? "✓  Compiled successfully" : "  ▲ Next.js 14.0.0\n  - Local: http://localhost:3000"),
          ],
        }
      }
      if (args[0] === "install") return { lines: [mkLine("output", "added 342 packages in 4.2s")] }
      return { lines: [mkLine("output", `npm ${args.join(" ")}`)] }
    }

    case "git": {
      if (args[0] === "status")  return { lines: [mkLine("output", "On branch main\nnothing to commit, working tree clean")] }
      if (args[0] === "log")     return { lines: [mkLine("output", "commit a1b2c3d (HEAD -> main)\nAuthor: dev <dev@iudex.io>\nDate:   " + new Date().toDateString())] }
      if (args[0] === "branch")  return { lines: [mkLine("output", "* main")] }
      return { lines: [mkLine("output", `git ${args.join(" ")} — OK`)] }
    }

    case "date":  return { lines: [mkLine("output", new Date().toString())] }

    case "whoami":return { lines: [mkLine("output", "developer")] }

    case "help":
      return {
        lines: [
          mkLine("info", "Available commands:"),
          mkLine("output", "  ls, pwd, cd <dir>, echo <text>"),
          mkLine("output", "  git status|log|branch"),
          mkLine("output", "  npm run <script> | npm install"),
          mkLine("output", "  node, date, whoami, clear, help"),
        ],
      }

    default:
      return { lines: [mkLine("error", `${bin}: command not found — try 'help'`)] }
  }
}

interface TerminalPanelProps {
  height: number
  onResizeStart: (e: React.MouseEvent) => void
}

export default function TerminalPanel({ height, onResizeStart }: TerminalPanelProps) {
  const [lines, setLines]     = useState<Line[]>([
    mkLine("info", "IUDEX Terminal  •  bash  •  type 'help' for commands"),
    mkLine("info", "─".repeat(52)),
  ])
  const [input, setInput]     = useState("")
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const [cwd, setCwd]         = useState("/workspace/iudex")
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [lines])

  const submit = useCallback(() => {
    const cmd = input.trim()
    if (!cmd) return

    setHistory(h => [cmd, ...h.slice(0, 49)])
    setHistIdx(-1)

    const prompt = mkLine("input", `${cwd} $ ${cmd}`)

    if (cmd === "clear") {
      setLines([mkLine("info", "IUDEX Terminal  •  bash")])
      setInput("")
      return
    }

    const { lines: out, newCwd } = runCommand(cmd, cwd)
    if (newCwd) setCwd(newCwd)

    setLines(prev => [...prev, prompt, ...out])
    setInput("")
  }, [input, cwd])

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
      setLines([mkLine("info", "IUDEX Terminal  •  bash")])
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
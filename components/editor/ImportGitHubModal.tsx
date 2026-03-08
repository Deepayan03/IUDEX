"use client"

import { useState, useEffect, useRef } from "react"
import type { FileNode } from "./types"
import { parseGitHubUrl, githubTreeToFileNodes } from "./github"

interface ImportGitHubModalProps {
  onImport: (tree: FileNode[], meta: { owner: string; repo: string; branch: string }) => void
  onClose: () => void
}

type ImportState =
  | { status: "idle" }
  | { status: "loading"; message: string }
  | { status: "error"; message: string }

export default function ImportGitHubModal({ onImport, onClose }: ImportGitHubModalProps) {
  const [url, setUrl] = useState("")
  const [state, setState] = useState<ImportState>({ status: "idle" })
  const overlayRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const parsed = parseGitHubUrl(url)

  // Escape to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", h)
    return () => document.removeEventListener("keydown", h)
  }, [onClose])

  // Auto-focus input
  useEffect(() => { inputRef.current?.focus() }, [])

  const handleImport = async () => {
    if (!parsed || state.status === "loading") return

    setState({ status: "loading", message: "Fetching repository structure..." })

    try {
      const params = new URLSearchParams({ owner: parsed.owner, repo: parsed.repo })
      if (parsed.branch) params.set("branch", parsed.branch)

      const res = await fetch(`/api/github/tree?${params}`)
      const data = await res.json()

      if (!res.ok) {
        setState({ status: "error", message: data.error || `Request failed (${res.status})` })
        return
      }

      setState({ status: "loading", message: "Building file tree..." })

      const fileTree = githubTreeToFileNodes(data.tree)
      onImport(fileTree, { owner: data.owner, repo: data.repo, branch: data.branch })
    } catch (err) {
      setState({ status: "error", message: (err as Error).message || "Network error" })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && parsed && state.status !== "loading") {
      handleImport()
    }
  }

  return (
    <div
      ref={overlayRef}
      onMouseDown={e => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: "fixed", inset: 0, zIndex: 99990,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "paletteIn 0.12s ease both",
      }}
    >
      <div style={{
        background: "#0d1525", border: "1px solid #1e2d42",
        borderRadius: 8, width: 520,
        boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderBottom: "1px solid #161f30",
          background: "#060c18",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="#e2e8f0">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <span style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>Import from GitHub</span>
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", color: "#4a6080",
            cursor: "pointer", fontSize: 16, padding: "0 4px",
            display: "flex", alignItems: "center",
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>
          <label style={{ fontSize: 11, color: "#6b82a6", display: "block", marginBottom: 8 }}>
            Repository URL
          </label>

          <input
            ref={inputRef}
            value={url}
            onChange={e => { setUrl(e.target.value); if (state.status === "error") setState({ status: "idle" }) }}
            onKeyDown={handleKeyDown}
            placeholder="https://github.com/owner/repo"
            style={{
              width: "100%", padding: "10px 12px", fontSize: 13,
              background: "#0a1020", border: "1px solid #1e2d42",
              borderRadius: 5, outline: "none", color: "#c8d6e5",
              transition: "border-color 0.2s",
              boxSizing: "border-box",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = "#3d5afe" }}
            onBlur={e => { e.currentTarget.style.borderColor = "#1e2d42" }}
          />

          {/* Validation indicator */}
          <div style={{ marginTop: 8, minHeight: 20 }}>
            {url.trim() && parsed && (
              <span style={{ fontSize: 11, color: "#3d5afe" }}>
                {parsed.owner}/{parsed.repo}{parsed.branch ? ` (${parsed.branch})` : ""}
              </span>
            )}
            {url.trim() && !parsed && (
              <span style={{ fontSize: 11, color: "#e74c3c" }}>
                Invalid GitHub URL — try https://github.com/owner/repo
              </span>
            )}
          </div>

          {/* Status messages */}
          {state.status === "loading" && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              marginTop: 12, padding: "10px 12px",
              background: "rgba(61,90,254,0.08)", borderRadius: 5,
            }}>
              <div style={{
                width: 14, height: 14, border: "2px solid #3d5afe",
                borderTopColor: "transparent", borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
              }} />
              <span style={{ fontSize: 12, color: "#7b9ef7" }}>{state.message}</span>
            </div>
          )}

          {state.status === "error" && (
            <div style={{
              marginTop: 12, padding: "10px 12px",
              background: "rgba(231,76,60,0.08)", borderRadius: 5,
              border: "1px solid rgba(231,76,60,0.2)",
            }}>
              <span style={{ fontSize: 12, color: "#e74c3c" }}>{state.message}</span>
            </div>
          )}

          {/* Helper text */}
          <p style={{ fontSize: 11, color: "#2a3a52", marginTop: 12, lineHeight: 1.5 }}>
            Works with public repositories. Enter a full URL or shorthand like <code style={{ color: "#4a6080" }}>owner/repo</code>.
          </p>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 8,
          padding: "10px 20px", borderTop: "1px solid #161f30", background: "#060c18",
        }}>
          <button onClick={onClose} style={{
            padding: "6px 16px", fontSize: 12, borderRadius: 4, cursor: "pointer",
            background: "transparent", border: "1px solid #1e2d42", color: "#8899b0",
          }}>
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!parsed || state.status === "loading"}
            style={{
              padding: "6px 16px", fontSize: 12, borderRadius: 4, cursor: parsed && state.status !== "loading" ? "pointer" : "not-allowed",
              background: parsed && state.status !== "loading" ? "#3d5afe" : "#1e2d42",
              border: "none", color: parsed && state.status !== "loading" ? "white" : "#4a6080",
              transition: "background 0.2s, color 0.2s",
            }}
          >
            {state.status === "loading" ? "Importing..." : "Import"}
          </button>
        </div>
      </div>

      {/* Inline keyframes for spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

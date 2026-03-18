"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { FileNode } from "@/features/editor/lib/types"
import { getFileIcon } from "@/features/editor/lib/utils"

interface QuickOpenProps {
  files: Array<{ node: FileNode; path: string }>
  onSelect: (node: FileNode) => void
  onClose: () => void
}

export default function QuickOpen({ files, onSelect, onClose }: QuickOpenProps) {
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return files.slice(0, 100)

    return files
      .filter(({ node, path }) =>
        node.name.toLowerCase().includes(needle) ||
        path.toLowerCase().includes(needle)
      )
      .sort((a, b) => {
        const aStarts = a.node.name.toLowerCase().startsWith(needle) ? 0 : 1
        const bStarts = b.node.name.toLowerCase().startsWith(needle) ? 0 : 1
        return aStarts - bStarts || a.path.localeCompare(b.path)
      })
      .slice(0, 100)
  }, [files, query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const selectActive = () => {
    const active = filtered[activeIndex]
    if (!active) return
    onSelect(active.node)
    onClose()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex(index => Math.min(index + 1, Math.max(filtered.length - 1, 0)))
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex(index => Math.max(index - 1, 0))
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      selectActive()
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99998,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 80,
      }}
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: "#1e2433",
          border: "1px solid #2d3a52",
          borderRadius: 6,
          width: 560,
          boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
          overflow: "hidden",
          animation: "paletteIn 0.15s ease both",
        }}
      >
        <div
          style={{
            borderBottom: "1px solid #2d3a52",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4a6080" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={event => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Go to file..."
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#e2e8f0",
              fontSize: 13,
              flex: 1,
            }}
          />
          <span style={{ fontSize: 11, color: "#2a3a52", fontFamily: "monospace" }}>
            enter
          </span>
        </div>

        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 16, textAlign: "center", color: "#2a3a52", fontSize: 12 }}>
              No files found
            </div>
          ) : (
            filtered.map(({ node, path }, index) => {
              const active = index === activeIndex
              const { icon, color } = getFileIcon(node.name)

              return (
                <button
                  key={node.id}
                  onClick={() => {
                    onSelect(node)
                    onClose()
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "8px 16px",
                    border: "none",
                    background: active ? "#094771" : "transparent",
                    color: "#cccccc",
                    fontSize: 13,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color, fontSize: 10, fontWeight: "bold", minWidth: 18 }}>
                        {icon}
                      </span>
                      <span style={{ color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {node.name}
                      </span>
                    </div>
                    <div style={{ marginLeft: 26, fontSize: 11, color: "#4a6080", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {path}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import { useMemo, useState } from "react"
import type { FileNode } from "@/features/editor/lib/types"
import { flatFiles, getFileIcon } from "@/features/editor/lib/utils"

interface SearchPanelProps {
  tree: FileNode[]
  sidebarWidth: number
  onSelectResult: (node: FileNode, lineNumber?: number) => void
}

interface SearchResult {
  id: string
  kind: "file" | "content"
  node: FileNode
  path: string
  preview: string
  lineNumber?: number
}

const MAX_RESULTS = 80
const MAX_CONTENT_MATCHES_PER_FILE = 3

export default function SearchPanel({
  tree,
  sidebarWidth,
  onSelectResult,
}: SearchPanelProps) {
  const [query, setQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return []

    const files = flatFiles(tree)
    const matches: SearchResult[] = []

    for (const { node, path } of files) {
      const lowerPath = path.toLowerCase()

      if (lowerPath.includes(needle)) {
        matches.push({
          id: `${node.id}:file`,
          kind: "file",
          node,
          path,
          preview: "Filename match",
        })
      }

      if (!node.content) continue

      let fileMatches = 0
      const lines = node.content.split("\n")

      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index]
        if (!line.toLowerCase().includes(needle)) continue

        matches.push({
          id: `${node.id}:line:${index + 1}:${fileMatches}`,
          kind: "content",
          node,
          path,
          preview: line.trim() || "(empty line)",
          lineNumber: index + 1,
        })

        fileMatches += 1
        if (fileMatches >= MAX_CONTENT_MATCHES_PER_FILE || matches.length >= MAX_RESULTS) {
          break
        }
      }

      if (matches.length >= MAX_RESULTS) break
    }

    return matches
  }, [query, tree])

  return (
    <div
      className="sidebar-bg flex flex-col overflow-hidden shrink-0"
      style={{ width: sidebarWidth, minWidth: sidebarWidth, borderRight: "1px solid #0d1525" }}
    >
      <div
        className="h-9 min-h-9 flex items-center justify-between px-3 shrink-0"
        style={{ borderBottom: "1px solid #0d1525" }}
      >
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#3a5080" }}>
          Search
        </span>
      </div>

      <div className="px-2 py-2 shrink-0" style={{ borderBottom: "1px solid #0d1525" }}>
        <div
          className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-all duration-200 ${isFocused ? "ring-1 ring-[#3d5afe]/50" : ""}`}
          style={{ background: "#0a1020" }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3a5080" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Search files and loaded content..."
            className="bg-transparent text-[12px] outline-none flex-1 placeholder-[#2a3a52]"
            style={{ color: "#8899b0" }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-[#3a5080] hover:text-[#8899b0] transition-colors"
              title="Clear search"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
        <p className="mt-2 text-[10px]" style={{ color: "#243050" }}>
          Searches filenames and any file content already loaded into the editor.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto py-1 thin-scrollbar">
        {!query.trim() && (
          <div className="px-4 py-8 text-center" style={{ color: "#3a5080", fontSize: 11 }}>
            Search across your current project from one place.
          </div>
        )}

        {query.trim() && results.length === 0 && (
          <div className="px-4 py-8 text-center" style={{ color: "#3a5080", fontSize: 11 }}>
            No matches found
          </div>
        )}

        {results.map(result => {
          const { icon, color } = getFileIcon(result.node.name)
          return (
            <button
              key={result.id}
              onClick={() => onSelectResult(result.node, result.lineNumber)}
              className="w-full text-left px-3 py-2 hover:bg-[#141925] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold shrink-0" style={{ color }}>
                  {icon}
                </span>
                <span className="truncate text-[12px]" style={{ color: "#c8d6e5" }}>
                  {result.node.name}
                </span>
                {result.lineNumber && (
                  <span className="shrink-0 text-[10px]" style={{ color: "#5a7099" }}>
                    L{result.lineNumber}
                  </span>
                )}
              </div>
              <div className="mt-0.5 truncate text-[10px]" style={{ color: "#3a5080" }}>
                {result.path}
              </div>
              <div className="mt-1 truncate text-[11px]" style={{ color: result.kind === "file" ? "#5a7099" : "#9fb2ca" }}>
                {result.preview}
              </div>
            </button>
          )
        })}
      </div>

      <div
        className="shrink-0 px-3 py-2 flex items-center justify-between"
        style={{ borderTop: "1px solid #0d1525" }}
      >
        <span className="text-[10px]" style={{ color: "#243050" }}>
          {results.length} matches
        </span>
        <span className="text-[10px]" style={{ color: "#243050" }}>
          Real search
        </span>
      </div>
    </div>
  )
}

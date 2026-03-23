"use client"

import { useState, type ReactNode } from "react"
import { useActivityLogStore } from "@/shared/state/activityLog"
import type { ActivityLogEntry, ActivityAction } from "@/features/editor/activity-log/types"

// ── Helpers ──────────────────────────────────────────────────────────────

const CURSOR_COLORS = [
  "#f87171", "#fb923c", "#facc15", "#4ade80", "#22d3ee",
  "#60a5fa", "#a78bfa", "#f472b6", "#34d399", "#fbbf24",
]

function getUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i)
    hash |= 0
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length]
}

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function actionLabel(action: ActivityAction): string {
  switch (action) {
    case "edit": return "edited"
    case "create-file": return "created"
    case "create-folder": return "created folder"
    case "delete-file": return "deleted"
    case "delete-folder": return "deleted folder"
    case "select-file": return "opened"
  }
}

function actionIcon(action: ActivityAction): ReactNode {
  switch (action) {
    case "edit":
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      )
    case "create-file":
    case "create-folder":
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      )
    case "delete-file":
    case "delete-folder":
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      )
    case "select-file":
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      )
  }
}

type FilterType = "all" | "edits" | "files"

// ── Component ────────────────────────────────────────────────────────────

interface ActivityLogPanelProps {
  sidebarWidth: number
  onUndoEntry: (entryId: string) => void
  onLoadMore: () => void
}

export default function ActivityLogPanel({
  sidebarWidth,
  onUndoEntry,
  onLoadMore,
}: ActivityLogPanelProps) {
  const entries = useActivityLogStore(s => s.entries)
  const isLoading = useActivityLogStore(s => s.isLoading)
  const hasMore = useActivityLogStore(s => s.hasMore)
  const [filter, setFilter] = useState<FilterType>("all")

  const filtered = entries.filter(e => {
    if (filter === "edits") return e.action === "edit"
    if (filter === "files") return e.action !== "edit" && e.action !== "select-file"
    return true
  })

  const canUndo = (entry: ActivityLogEntry) =>
    !entry.undone &&
    entry.delta &&
    (entry.action === "create-file" ||
     entry.action === "create-folder" ||
     entry.action === "delete-file" ||
     entry.action === "delete-folder")

  return (
    <div
      className="sidebar-bg flex h-full min-h-0 flex-col overflow-hidden shrink-0"
      style={{ width: sidebarWidth, minWidth: sidebarWidth, borderRight: "1px solid #0d1525" }}
    >
      {/* Header */}
      <div
        className="h-9 min-h-9 flex items-center justify-between px-3 shrink-0"
        style={{ borderBottom: "1px solid #0d1525" }}
      >
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#3a5080" }}>
          Activity Log
        </span>
        <div className="flex items-center gap-0.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3a5080" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-2 py-1.5 shrink-0" style={{ borderBottom: "1px solid #0d1525" }}>
        {(["all", "edits", "files"] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-2 py-0.5 rounded text-[10px] font-medium transition-all"
            style={{
              background: filter === f ? "rgba(61,90,254,0.15)" : "transparent",
              color: filter === f ? "#7b9ef7" : "#3a5080",
              border: filter === f ? "1px solid rgba(61,90,254,0.25)" : "1px solid transparent",
            }}
          >
            {f === "all" ? "All" : f === "edits" ? "Edits" : "Files"}
          </button>
        ))}
      </div>

      {/* Log entries */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-1 thin-scrollbar">
        {isLoading && entries.length === 0 && (
          <div className="text-center py-8" style={{ color: "#3a5080", fontSize: 11 }}>
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-[#3d5afe] border-t-transparent animate-spin" />
              Loading activity...
            </div>
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-8 px-4" style={{ color: "#3a5080", fontSize: 11 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 8px", opacity: 0.3 }}>
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <div style={{ fontWeight: 500, color: "#5a7099", marginBottom: 4 }}>
              No activity yet
            </div>
            <div>
              Activities will appear here as users edit and interact with files
            </div>
          </div>
        )}

        {filtered.map(entry => {
          const color = getUserColor(entry.userId)
          const isUndone = entry.undone

          return (
            <div
              key={entry.id}
              className="group px-2 py-1.5 mx-1 rounded-md transition-colors hover:bg-[rgba(255,255,255,0.02)]"
              style={{ opacity: isUndone ? 0.4 : 1 }}
            >
              <div className="flex items-start gap-2">
                {/* User color dot */}
                <div
                  className="mt-1 shrink-0 rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    background: color,
                    boxShadow: `0 0 6px ${color}40`,
                  }}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5" style={{ fontSize: 11 }}>
                    <span style={{ color: "#c8d6e5", fontWeight: 600 }} className="truncate">
                      {entry.username}
                    </span>
                    <span style={{ color: "#3a5080" }} className="flex items-center gap-1 shrink-0">
                      {actionIcon(entry.action)}
                      {actionLabel(entry.action)}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-1 mt-0.5 truncate"
                    style={{ fontSize: 10.5, color: "#5a7099" }}
                  >
                    <span style={{ color: "#7b9ef7" }} className="truncate">
                      {entry.targetFileName}
                    </span>
                    {entry.action === "edit" && entry.lineNumber && (
                      <span style={{ color: "#3a5080" }}>
                        L{entry.lineNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span style={{ fontSize: 10, color: "#243050" }}>
                      {relativeTime(entry.timestamp)}
                    </span>
                    {canUndo(entry) && !isUndone && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onUndoEntry(entry.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded text-[9px] font-medium"
                        style={{
                          background: "rgba(251,146,60,0.12)",
                          color: "#fb923c",
                          border: "1px solid rgba(251,146,60,0.2)",
                        }}
                      >
                        Undo
                      </button>
                    )}
                    {isUndone && (
                      <span
                        className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          background: "rgba(100,116,139,0.1)",
                          color: "#64748b",
                        }}
                      >
                        Undone
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Load more button */}
        {hasMore && filtered.length > 0 && (
          <div className="px-3 py-2 text-center">
            <button
              onClick={onLoadMore}
              disabled={isLoading}
              className="text-[10px] font-medium px-3 py-1 rounded transition-all"
              style={{
                background: "rgba(61,90,254,0.08)",
                color: "#5a7099",
                border: "1px solid rgba(61,90,254,0.15)",
              }}
            >
              {isLoading ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="shrink-0 px-3 py-2 flex items-center justify-between"
        style={{ borderTop: "1px solid #0d1525" }}
      >
        <span className="text-[10px]" style={{ color: "#243050" }}>
          {entries.length} activities
        </span>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
          <span className="text-[10px]" style={{ color: "#243050" }}>Live</span>
        </div>
      </div>
    </div>
  )
}

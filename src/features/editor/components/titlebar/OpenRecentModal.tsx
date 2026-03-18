"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import {
  getRoomHistory,
  getRoomHistoryServerSnapshot,
  subscribeToRoomHistory,
  type RoomHistoryEntry,
} from "@/shared/lib/roomHistory"

interface OpenRecentModalProps {
  onSelect: (entry: RoomHistoryEntry) => void
  onClose: () => void
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return "just now"

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Date(timestamp).toLocaleDateString()
}

export default function OpenRecentModal({ onSelect, onClose }: OpenRecentModalProps) {
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const history = useSyncExternalStore(
    subscribeToRoomHistory,
    getRoomHistory,
    getRoomHistoryServerSnapshot
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return history

    return history.filter(entry =>
      entry.roomId.toLowerCase().includes(needle) ||
      entry.name.toLowerCase().includes(needle)
    )
  }, [history, query])

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
    onSelect(active)
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
            <path d="M12 8v4l3 3"/>
            <circle cx="12" cy="12" r="10"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={event => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Open recent room..."
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#e2e8f0",
              fontSize: 13,
              flex: 1,
            }}
          />
        </div>

        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 16, textAlign: "center", color: "#2a3a52", fontSize: 12 }}>
              {history.length === 0 ? "No recent rooms yet" : "No matching rooms"}
            </div>
          ) : (
            filtered.map((entry, index) => {
              const active = index === activeIndex

              return (
                <button
                  key={entry.roomId}
                  onClick={() => {
                    onSelect(entry)
                    onClose()
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 16px",
                    border: "none",
                    background: active ? "#094771" : "transparent",
                    color: "#cccccc",
                    fontSize: 13,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.name || `Room ${entry.roomId}`}
                    </div>
                    <div style={{ marginTop: 2, fontSize: 11, color: "#4a6080" }}>
                      /editor/{entry.roomId}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: "#5a7099", flexShrink: 0 }}>
                    {timeAgo(entry.lastVisited)}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

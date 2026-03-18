"use client"

import { useRef, useEffect } from "react"
import type { MenuItem, TitleBarAction } from "./types"

interface MenuDropdownProps {
  items: MenuItem[]
  top: number
  left: number
  onAction: (action: TitleBarAction) => void
  onClose: () => void
}

export default function MenuDropdown({ items, top, left, onAction, onClose }: MenuDropdownProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setTimeout(() => {
      const onDown = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) onClose()
      }
      const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
      document.addEventListener("mousedown", onDown)
      document.addEventListener("keydown", onKey)
      return () => {
        document.removeEventListener("mousedown", onDown)
        document.removeEventListener("keydown", onKey)
      }
    }, 0)
    return () => clearTimeout(id)
  }, [onClose])

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        zIndex: 9999,
        top,
        left,
        background: "#1e2433",
        border: "1px solid #2d3a52",
        minWidth: 240,
        boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
        animation: "menuDrop 0.1s ease both",
        borderRadius: 3,
        paddingTop: 3,
        paddingBottom: 3,
      }}
    >
      {items.map((item, i) =>
        item.divider ? (
          <div key={i} style={{ height: 1, background: "#2a3352", margin: "3px 8px" }} />
        ) : (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => {
              if (item.action) onAction(item.action as TitleBarAction)
              onClose()
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "5px 12px 5px 24px",
              fontSize: 13,
              color: item.disabled ? "#3a4a62" : "#cccccc",
              cursor: item.disabled ? "not-allowed" : "pointer",
              background: "transparent",
              border: "none",
              textAlign: "left",
            }}
            onMouseEnter={e => {
              if (!item.disabled)
                (e.currentTarget as HTMLElement).style.background = "#094771"
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent"
            }}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span style={{ fontSize: 11, color: "#6a7a92", marginLeft: 32, fontFamily: "monospace" }}>
                {item.shortcut}
              </span>
            )}
          </button>
        )
      )}
    </div>
  )
}
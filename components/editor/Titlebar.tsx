"use client"

import { useState, useRef, useEffect, useCallback } from "react"

// ── Types ─────────────────────────────────────────────────────────────────────
type MenuItem = {
  label: string
  shortcut?: string
  divider?: boolean
  disabled?: boolean
}

// ── Menu definitions ──────────────────────────────────────────────────────────
const MENUS: Record<string, MenuItem[]> = {
  File: [
    { label: "New Text File",         shortcut: "⌘N" },
    { label: "New File...",           shortcut: "⌥⌘N" },
    { label: "New Window",            shortcut: "⇧⌘N" },
    { divider: true, label: "" },
    { label: "Open...",               shortcut: "⌘O" },
    { label: "Open Folder...",        shortcut: "⌘K ⌘O" },
    { label: "Open Recent",           shortcut: "" },
    { divider: true, label: "" },
    { label: "Save",                  shortcut: "⌘S" },
    { label: "Save As...",            shortcut: "⇧⌘S" },
    { label: "Save All",              shortcut: "⌥⌘S" },
    { divider: true, label: "" },
    { label: "Close Editor",          shortcut: "⌘W" },
    { label: "Close Folder",          shortcut: "⌘K F" },
    { divider: true, label: "" },
    { label: "Preferences",           shortcut: "⌘," },
  ],
  Edit: [
    { label: "Undo",                  shortcut: "⌘Z" },
    { label: "Redo",                  shortcut: "⇧⌘Z" },
    { divider: true, label: "" },
    { label: "Cut",                   shortcut: "⌘X" },
    { label: "Copy",                  shortcut: "⌘C" },
    { label: "Paste",                 shortcut: "⌘V" },
    { divider: true, label: "" },
    { label: "Find",                  shortcut: "⌘F" },
    { label: "Replace",               shortcut: "⌥⌘F" },
    { divider: true, label: "" },
    { label: "Toggle Line Comment",   shortcut: "⌘/" },
    { label: "Format Document",       shortcut: "⇧⌥F" },
  ],
  View: [
    { label: "Command Palette...",    shortcut: "⇧⌘P" },
    { divider: true, label: "" },
    { label: "Explorer",              shortcut: "⇧⌘E" },
    { label: "Search",                shortcut: "⇧⌘F" },
    { label: "Source Control",        shortcut: "⌃⇧G" },
    { label: "Run and Debug",         shortcut: "⇧⌘D" },
    { label: "Extensions",            shortcut: "⇧⌘X" },
    { divider: true, label: "" },
    { label: "Terminal",              shortcut: "⌃`" },
    { label: "Problems",              shortcut: "⇧⌘M" },
    { label: "Output",                shortcut: "⇧⌘U" },
    { divider: true, label: "" },
    { label: "Zoom In",               shortcut: "⌘=" },
    { label: "Zoom Out",              shortcut: "⌘-" },
    { label: "Reset Zoom",            shortcut: "⌘0" },
  ],
  Go: [
    { label: "Back",                  shortcut: "⌃-" },
    { label: "Forward",               shortcut: "⌃⇧-" },
    { divider: true, label: "" },
    { label: "Go to File...",         shortcut: "⌘P" },
    { label: "Go to Symbol...",       shortcut: "⇧⌘O" },
    { label: "Go to Line/Column...",  shortcut: "⌃G" },
    { divider: true, label: "" },
    { label: "Go to Definition",      shortcut: "F12" },
    { label: "Go to References",      shortcut: "⇧F12" },
  ],
  Run: [
    { label: "Start Debugging",       shortcut: "F5" },
    { label: "Run Without Debugging", shortcut: "⌃F5" },
    { label: "Stop Debugging",        shortcut: "⇧F5",  disabled: true },
    { label: "Restart Debugging",     shortcut: "⇧⌘F5", disabled: true },
    { divider: true, label: "" },
    { label: "Add Configuration...",  shortcut: "" },
    { label: "Toggle Breakpoint",     shortcut: "F9" },
  ],
  Terminal: [
    { label: "New Terminal",          shortcut: "⌃⇧`" },
    { label: "Split Terminal",        shortcut: "⌃⇧5" },
    { divider: true, label: "" },
    { label: "Run Task...",           shortcut: "" },
    { label: "Run Build Task...",     shortcut: "⇧⌘B" },
    { label: "Run Active File",       shortcut: "" },
    { divider: true, label: "" },
    { label: "Kill Terminal",         shortcut: "" },
  ],
}

const MENU_KEYS = Object.keys(MENUS)

// ── MenuDropdown ──────────────────────────────────────────────────────────────
// Receives pre-computed pixel position — no setState-in-effect needed.
function MenuDropdown({
  items,
  top,
  left,
  onClose,
}: {
  items: MenuItem[]
  top: number
  left: number
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    // Use setTimeout so this listener doesn't fire on the same click that opened the menu
    const id = setTimeout(() => {
      document.addEventListener("mousedown", onDown)
      document.addEventListener("keydown", onKey)
    }, 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-[9999] py-[3px]"
      style={{
        top,
        left,
        background: "#1e2433",
        border: "1px solid #2d3a52",
        minWidth: "240px",
        boxShadow: "0 6px 24px rgba(0,0,0,0.7)",
        animation: "menuDrop 0.1s ease both",
        borderRadius: "3px",
      }}
    >
      {items.map((item, i) =>
        item.divider ? (
          <div
            key={i}
            style={{ height: "1px", background: "#2a3352", margin: "3px 8px" }}
          />
        ) : (
          <button
            key={i}
            onClick={onClose}
            disabled={item.disabled}
            className="w-full flex items-center justify-between text-left"
            style={{
              padding: "4px 12px 4px 24px",
              fontSize: "13px",
              color: item.disabled ? "#3a4a62" : "#cccccc",
              cursor: item.disabled ? "not-allowed" : "pointer",
              background: "transparent",
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
              <span
                style={{
                  fontSize: "11px",
                  color: "#6a7a92",
                  marginLeft: "32px",
                  fontFamily: "monospace",
                }}
              >
                {item.shortcut}
              </span>
            )}
          </button>
        )
      )}
    </div>
  )
}

// ── TitleBar ──────────────────────────────────────────────────────────────────
interface TitleBarProps {
  activeFileName?: string | null
}

// Stores which menu is open + the pixel coords of its anchor button.
// Coords are captured at click time (in an event handler) — never read from
// refs during render and never set inside a useEffect body.
type OpenMenu = { key: string; top: number; left: number } | null

export default function TitleBar({ activeFileName }: TitleBarProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)
  // buttonEls is only ever read inside event handlers, never during render.
  const buttonEls = useRef<Record<string, HTMLButtonElement | null>>({})

  const handleClick = useCallback((key: string, el: HTMLButtonElement) => {
    if (openMenu?.key === key) {
      setOpenMenu(null)
    } else {
      // getBoundingClientRect() called inside event handler — safe
      const r = el.getBoundingClientRect()
      setOpenMenu({ key, top: r.bottom + 1, left: r.left })
    }
  }, [openMenu])

  const handleHover = useCallback((key: string, el: HTMLButtonElement) => {
    // Only switch menus when one is already open
    if (openMenu !== null && openMenu.key !== key) {
      const r = el.getBoundingClientRect()
      setOpenMenu({ key, top: r.bottom + 1, left: r.left })
    }
  }, [openMenu])

  const close = useCallback(() => setOpenMenu(null), [])

  return (
    <>
      <style>{`
        @keyframes menuDrop {
          from { opacity: 0; transform: translateY(-3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Bar ─────────────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-stretch select-none relative z-50"
        style={{
          height: "30px",
          minHeight: "30px",
          background: "#0d1117",
          borderBottom: "1px solid #161b27",
        }}
      >
        {/* LEFT: app icon + menu buttons */}
        <div className="flex items-stretch">

          {/* App icon — aligns with activity bar width */}
          <div
            style={{
              width: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "3px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "8px",
                fontWeight: "bold",
                color: "white",
                background: "linear-gradient(135deg, #3d5afe 0%, #651fff 100%)",
              }}
            >
              IX
            </div>
          </div>

          {/* Menu buttons */}
          {MENU_KEYS.map(key => (
            <button
              key={key}
              ref={el => { buttonEls.current[key] = el }}
              onClick={e => handleClick(key, e.currentTarget)}
              onMouseEnter={e => handleHover(key, e.currentTarget)}
              style={{
                display: "flex",
                alignItems: "center",
                height: "100%",
                padding: "0 10px",
                fontSize: "13px",
                outline: "none",
                border: "none",
                cursor: "pointer",
                color: openMenu?.key === key ? "#ffffff" : "#cccccc",
                background: openMenu?.key === key ? "#094771" : "transparent",
              }}
            >
              {key}
            </button>
          ))}
        </div>

        {/* CENTER: active file name — absolutely positioned, pointer-events off */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span style={{ fontSize: "13px" }}>
            {activeFileName ? (
              <>
                <span style={{ color: "#cccccc" }}>{activeFileName}</span>
                <span style={{ color: "#6b7280" }}> — IUDEX Editor</span>
              </>
            ) : (
              <span style={{ color: "#6b7280" }}>IUDEX Editor</span>
            )}
          </span>
        </div>

        {/* RIGHT: icon toolbar */}
        <div className="ml-auto flex items-stretch flex-shrink-0">
          {[
            {
              title: "Toggle Panel Layout",
              svg: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="1"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="12" y1="9" x2="12" y2="21"/>
                </svg>
              ),
            },
            {
              title: "Customize Layout",
              svg: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
              ),
            },
            {
              title: "Notifications",
              svg: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              ),
            },
          ].map(({ title, svg }) => (
            <button
              key={title}
              title={title}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0 10px",
                color: "#858585",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = "#cccccc"
                ;(e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = "#858585"
                ;(e.currentTarget as HTMLElement).style.background = "transparent"
              }}
            >
              {svg}
            </button>
          ))}
        </div>
      </div>

      {/* Dropdown — rendered here so it's never clipped by overflow:hidden parents */}
      {openMenu && (
        <MenuDropdown
          items={MENUS[openMenu.key]}
          top={openMenu.top}
          left={openMenu.left}
          onClose={close}
        />
      )}
    </>
  )
}
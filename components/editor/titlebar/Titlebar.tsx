"use client"

import { useState, useRef, useCallback } from "react"
import type { TitleBarAction, TitleBarProps, OpenMenu } from "./types"
import { buildMenus, MENU_KEYS, ACTION_TOASTS }         from "./Menudata"
import MenuDropdown                                      from "./MenuDropDown"
import CommandPalette                                    from "./CommandPalette"
import Toast                                             from "./Toast"
import IconBtn                                           from "./Iconbtn"

export type { TitleBarAction, TitleBarProps }

export default function TitleBar({
  activeFileName,
  sidebarVisible  = true,
  terminalVisible = false,
  isDebugging     = false,
  onAction,
}: TitleBarProps) {
  const [openMenu,    setOpenMenu]    = useState<OpenMenu>(null)
  const [showPalette, setShowPalette] = useState(false)
  const [toast,       setToast]       = useState<string | null>(null)
  const buttonEls = useRef<Record<string, HTMLButtonElement | null>>({})

  // ── Build live menus (disabled states reflect current editor state) ──────────
  const menus = buildMenus({
    isDebugging,
    terminalOpen:   terminalVisible,
    hasActiveFile:  !!activeFileName,
    hasOpenTabs:    !!activeFileName,  // close enough; layout passes actual count
    canGoBack:      true,              // layout controls disabled via action result
    canGoForward:   true,
  })

  // ── Dispatch action: show toast + forward to parent ──────────────────────────
  const handleAction = useCallback((action: TitleBarAction) => {
    if (action === "command-palette") { setShowPalette(true); return }
    const msg = ACTION_TOASTS[action]
    if (msg) setToast(msg)
    onAction(action)
  }, [onAction])

  // ── Menu open / hover ────────────────────────────────────────────────────────
  const handleMenuClick = useCallback((key: string, el: HTMLButtonElement) => {
    const r = el.getBoundingClientRect()
    setOpenMenu(prev => prev?.key === key ? null : { key, top: r.bottom + 1, left: r.left })
  }, [])

  const handleMenuHover = useCallback((key: string, el: HTMLButtonElement) => {
    if (openMenu !== null && openMenu.key !== key) {
      const r = el.getBoundingClientRect()
      setOpenMenu({ key, top: r.bottom + 1, left: r.left })
    }
  }, [openMenu])

  const closeMenu = useCallback(() => setOpenMenu(null), [])

  return (
    <>
      <style>{`
        @keyframes menuDrop  { from{opacity:0;transform:translateY(-3px)} to{opacity:1;transform:translateY(0)} }
        @keyframes paletteIn { from{opacity:0;transform:scale(0.97)}      to{opacity:1;transform:scale(1)} }
        @keyframes toastIn   { from{opacity:0;transform:translateX(-50%) translateY(6px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
      `}</style>

      {/* ── Bar ──────────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-stretch select-none relative"
        style={{
          height: 30, minHeight: 30, zIndex: 50,
          background: isDebugging ? "#2d0a0a" : "#0d1117",
          borderBottom: `1px solid ${isDebugging ? "#5a1a1a" : "#161b27"}`,
          transition: "background 0.3s, border-color 0.3s",
        }}
      >
        {/* LEFT: app icon + menu buttons */}
        <div style={{ display: "flex", alignItems: "stretch" }}>
          {/* App icon */}
          <div style={{ width: 48, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{
              width: 18, height: 18, borderRadius: 3,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 8, fontWeight: "bold", color: "white",
              background: "linear-gradient(135deg, #3d5afe 0%, #651fff 100%)",
            }}>
              IX
            </div>
          </div>

          {/* Menu buttons */}
          {MENU_KEYS.map(key => (
            <button
              key={key}
              ref={el => { buttonEls.current[key] = el }}
              onClick={e   => handleMenuClick(key, e.currentTarget)}
              onMouseEnter={e => handleMenuHover(key, e.currentTarget)}
              style={{
                display: "flex", alignItems: "center", height: "100%",
                padding: "0 10px", fontSize: 13,
                outline: "none", border: "none", cursor: "pointer",
                color:      openMenu?.key === key ? "#ffffff" : "#cccccc",
                background: openMenu?.key === key ? "#094771" : "transparent",
              }}
            >
              {key}
            </button>
          ))}
        </div>

        {/* CENTER: filename + debug badge */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {isDebugging && (
            <span style={{
              fontSize: 10, color: "#f87171", background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.3)", padding: "1px 6px", borderRadius: 3,
              fontFamily: "monospace", letterSpacing: 0.5,
            }}>
              ▶ DEBUG
            </span>
          )}
          <span style={{ fontSize: 13 }}>
            {activeFileName
              ? <><span style={{ color: "#cccccc" }}>{activeFileName}</span><span style={{ color: "#6b7280" }}> — IUDEX Editor</span></>
              : <span style={{ color: "#6b7280" }}>IUDEX Editor</span>
            }
          </span>
        </div>

        {/* RIGHT: icon buttons */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "stretch", flexShrink: 0 }}>

          <IconBtn
            title="Toggle Panel Layout (⌘K ⌘J)"
            onClick={() => handleAction("toggle-panel-layout")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="1"/>
              <line x1="3"  y1="9"  x2="21" y2="9"/>
              <line x1="12" y1="9"  x2="12" y2="21"/>
            </svg>
          </IconBtn>

          <IconBtn
            title="Toggle Terminal (⌃`)"
            active={terminalVisible}
            onClick={() => handleAction("toggle-terminal")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="4 17 10 11 4 5"/>
              <line x1="12" y1="19" x2="20" y2="19"/>
            </svg>
          </IconBtn>

          <IconBtn
            title="Toggle Primary Side Bar (⌘B)"
            active={sidebarVisible}
            onClick={() => handleAction("toggle-sidebar")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="1"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </IconBtn>

          <IconBtn title="Preferences (⌘,)" onClick={() => handleAction("preferences")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </IconBtn>

        </div>
      </div>

      {/* ── Portals ───────────────────────────────────────────────────────────── */}
      {openMenu && (
        <MenuDropdown
          items={menus[openMenu.key] ?? []}
          top={openMenu.top}
          left={openMenu.left}
          onAction={handleAction}
          onClose={closeMenu}
        />
      )}
      {showPalette && (
        <CommandPalette onAction={handleAction} onClose={() => setShowPalette(false)} />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  )
}
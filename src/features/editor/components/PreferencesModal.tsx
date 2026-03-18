"use client"

import { useEffect, useRef } from "react"
import type { EditorPrefs } from "@/features/editor/lib/types"
import { usePreferencesStore } from "@/shared/state/preferences"

// Generic row components for the form
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #0d1525" }}>
      <span style={{ fontSize: 12, color: "#8899b0" }}>{label}</span>
      {children}
    </div>
  )
}

function Select({ value, options, onChange }: {
  value:    string | number
  options:  { label: string; value: string | number }[]
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: "#0d1525", border: "1px solid #1e2d42", color: "#c8d6e5",
        fontSize: 12, padding: "3px 8px", borderRadius: 3, outline: "none", cursor: "pointer",
        minWidth: 120,
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
        background: value ? "#3d5afe" : "#1e2d42",
        position: "relative", transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: "50%", background: "white",
        position: "absolute", top: 3,
        left: value ? 19 : 3,
        transition: "left 0.2s",
      }} />
    </button>
  )
}

function NumberInput({ value, min, max, step = 1, onChange }: {
  value: number; min: number; max: number; step?: number
  onChange: (v: number) => void
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button onClick={() => onChange(Math.max(min, value - step))}
        style={{ width: 22, height: 22, background: "#0d1525", border: "1px solid #1e2d42", color: "#8899b0", borderRadius: 3, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
        −
      </button>
      <span style={{ fontSize: 12, color: "#c8d6e5", width: 28, textAlign: "center", fontFamily: "monospace" }}>{value}</span>
      <button onClick={() => onChange(Math.min(max, value + step))}
        style={{ width: 22, height: 22, background: "#0d1525", border: "1px solid #1e2d42", color: "#8899b0", borderRadius: 3, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
        +
      </button>
    </div>
  )
}

const FONT_FAMILIES = [
  { label: "JetBrains Mono",  value: "'JetBrains Mono','Fira Code','Consolas',monospace" },
  { label: "Fira Code",       value: "'Fira Code','JetBrains Mono','Consolas',monospace" },
  { label: "Consolas",        value: "'Consolas','Courier New',monospace" },
  { label: "SF Mono",         value: "'SF Mono','Monaco','Menlo',monospace" },
  { label: "Cascadia Code",   value: "'Cascadia Code','Consolas',monospace" },
]

// const FONT_LABELS: Record<string, string> = Object.fromEntries(FONT_FAMILIES.map(f => [f.value, f.label]))

export default function PreferencesModal() {
  const prefs = usePreferencesStore(s => s.prefs)
  const setPrefs = usePreferencesStore(s => s.setPrefs)
  const closePrefs = usePreferencesStore(s => s.closePrefs)

  const set = <K extends keyof EditorPrefs>(key: K, val: EditorPrefs[K]) =>
    setPrefs({ ...prefs, [key]: val })

  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") closePrefs() }
    document.addEventListener("keydown", h)
    return () => document.removeEventListener("keydown", h)
  }, [closePrefs])

  return (
    <div
      ref={overlayRef}
      onMouseDown={e => { if (e.target === overlayRef.current) closePrefs() }}
      style={{
        position: "fixed", inset: 0, zIndex: 99990,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "paletteIn 0.12s ease both",
      }}
    >
      <div style={{
        background: "#0d1525", border: "1px solid #1e2d42",
        borderRadius: 8, width: 460,
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3d5afe" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
            <span style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>Preferences</span>
          </div>
          <button onClick={closePrefs} style={{
            cursor: "pointer", fontSize: 16, padding: "0 4px",
            display: "flex", alignItems: "center",
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: "8px 20px 20px", maxHeight: 520, overflowY: "auto" }}>

          {/* ── Appearance ── */}
          <div style={{ fontSize: 10, color: "#3d5afe", fontWeight: 700, letterSpacing: 1, marginTop: 16, marginBottom: 4, fontFamily: "monospace" }}>
            APPEARANCE
          </div>
          <Row label="Theme">
            <Select value={prefs.theme} onChange={v => set("theme", v as EditorPrefs["theme"])} options={[
              { label: "Dark (VS Dark)",    value: "vs-dark"  },
              { label: "Light",             value: "light"    },
              { label: "High Contrast",     value: "hc-black" },
            ]} />
          </Row>
          <Row label="Font Family">
            <Select value={prefs.fontFamily} onChange={v => set("fontFamily", v)} options={FONT_FAMILIES} />
          </Row>
          <Row label="Font Size">
            <NumberInput value={prefs.fontSize} min={10} max={24} onChange={v => set("fontSize", v)} />
          </Row>

          {/* ── Editor ── */}
          <div style={{ fontSize: 10, color: "#3d5afe", fontWeight: 700, letterSpacing: 1, marginTop: 20, marginBottom: 4, fontFamily: "monospace" }}>
            EDITOR
          </div>
          <Row label="Tab Size">
            <Select value={prefs.tabSize} onChange={v => set("tabSize", Number(v))} options={[
              { label: "2 spaces", value: 2 },
              { label: "4 spaces", value: 4 },
              { label: "8 spaces", value: 8 },
            ]} />
          </Row>
          <Row label="Word Wrap">
            <Toggle value={prefs.wordWrap === "on"} onChange={v => set("wordWrap", v ? "on" : "off")} />
          </Row>
          <Row label="Minimap">
            <Toggle value={prefs.minimap} onChange={v => set("minimap", v)} />
          </Row>
          <Row label="Line Numbers">
            <Select value={prefs.lineNumbers} onChange={v => set("lineNumbers", v as EditorPrefs["lineNumbers"])} options={[
              { label: "On",       value: "on"       },
              { label: "Relative", value: "relative" },
              { label: "Off",      value: "off"      },
            ]} />
          </Row>
          <Row label="Cursor Style">
            <Select value={prefs.cursorStyle} onChange={v => set("cursorStyle", v as EditorPrefs["cursorStyle"])} options={[
              { label: "Line",       value: "line"      },
              { label: "Block",      value: "block"     },
              { label: "Underline",  value: "underline" },
            ]} />
          </Row>

          {/* ── Formatting ── */}
          <div style={{ fontSize: 10, color: "#3d5afe", fontWeight: 700, letterSpacing: 1, marginTop: 20, marginBottom: 4, fontFamily: "monospace" }}>
            FORMATTING
          </div>
          <Row label="Render Whitespace">
            <Select value={prefs.renderWhitespace} onChange={v => set("renderWhitespace", v as EditorPrefs["renderWhitespace"])} options={[
              { label: "None",      value: "none"     },
              { label: "Boundary",  value: "boundary" },
              { label: "All",       value: "all"      },
            ]} />
          </Row>
          <Row label="Format on Save">
            <Toggle value={prefs.formatOnSave} onChange={v => set("formatOnSave", v)} />
          </Row>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 8,
          padding: "10px 20px", borderTop: "1px solid #161f30", background: "#060c18",
        }}>
          <button onClick={closePrefs} style={{
            padding: "5px 16px", fontSize: 12, borderRadius: 4, cursor: "pointer",
            background: "#3d5afe", border: "none", color: "white",
          }}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

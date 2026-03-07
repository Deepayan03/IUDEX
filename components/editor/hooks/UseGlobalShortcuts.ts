"use client"

import { useEffect } from "react"
import type { TitleBarAction } from "../titlebar/types"

interface Options {
  onAction: (action: TitleBarAction) => void
}

// Centralises every global keyboard shortcut.
// Each handler calls onAction so the same code-path runs
// whether the user uses the menu OR the keyboard.

export function useGlobalShortcuts({ onAction }: Options) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const meta  = e.metaKey || e.ctrlKey
      const shift = e.shiftKey
      const alt   = e.altKey
      const key   = e.key.toLowerCase()

      // Guard: don't steal shortcuts when typing in an <input>/<textarea>
      const tag = (e.target as HTMLElement).tagName
      const inInput = tag === "INPUT" || tag === "TEXTAREA"

      if (meta && key === "s" && !shift && !alt)    { e.preventDefault(); onAction("save") }
      if (meta && key === "s" &&  shift && !alt)    { e.preventDefault(); onAction("save-as") }
      if (meta && key === "s" && !shift &&  alt)    { e.preventDefault(); onAction("save-all") }
      if (meta && key === "n" && !shift)            { e.preventDefault(); onAction("new-file") }
      if (meta && key === "n" &&  shift)            { e.preventDefault(); onAction("new-window") }
      if (meta && key === "w")                      { e.preventDefault(); onAction("close-editor") }
      if (meta && key === "b")                      { e.preventDefault(); onAction("toggle-sidebar") }
      if (meta && key === "," )                     { e.preventDefault(); onAction("preferences") }

      // View
      if (meta && key === "=")                      { e.preventDefault(); onAction("zoom-in") }
      if (meta && key === "-")                      { e.preventDefault(); onAction("zoom-out") }
      if (meta && key === "0")                      { e.preventDefault(); onAction("zoom-reset") }
      if (meta && shift && key === "e")             { e.preventDefault(); onAction("toggle-explorer") }
      if (!inInput && key === "`" && e.ctrlKey)     { e.preventDefault(); onAction("toggle-terminal") }
      if (meta && shift && key === "p")             { e.preventDefault(); onAction("command-palette") }
      if (meta && key === "p" && !shift)            { e.preventDefault(); onAction("go-to-file") }

      // Edit (only when editor is focused, not in our own inputs)
      if (!inInput) {
        if (meta && key === "/")                    { e.preventDefault(); onAction("toggle-comment") }
        if (shift && alt && key === "f")            { e.preventDefault(); onAction("format-document") }
        if (e.ctrlKey && key === "g")               { e.preventDefault(); onAction("go-to-line") }
        if (key === "f5")                           { e.preventDefault(); onAction("start-debug") }
        if (key === "f9")                           { e.preventDefault(); onAction("toggle-breakpoint") }
      }
    }

    document.addEventListener("keydown", h)
    return () => document.removeEventListener("keydown", h)
  }, [onAction])
}
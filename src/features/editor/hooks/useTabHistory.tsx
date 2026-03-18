"use client"

import { useRef, useCallback, useState } from "react"
import type { FileNode } from "@/features/editor/lib/types"

// Keeps a history stack of visited file IDs so go-back/forward works
// exactly like VS Code's editor navigation history.

export function useTabHistory() {
  const stack   = useRef<string[]>([])   // file IDs
  const pointer = useRef(-1)             // current position in stack
  const [, bump] = useState(0)
  const rerender = () => bump(n => n + 1)

  const push = useCallback((fileId: string) => {
    stack.current = stack.current.slice(0, pointer.current + 1)
    if (stack.current[stack.current.length - 1] !== fileId) {
      stack.current.push(fileId)
      pointer.current = stack.current.length - 1
      rerender()
    }
  }, [])

  const back = useCallback((
    tabs: FileNode[],
    onSelect: (node: FileNode) => void
  ) => {
    if (pointer.current <= 0) return
    pointer.current -= 1
    rerender()
    const id   = stack.current[pointer.current]
    const node = tabs.find(t => t.id === id)
    if (node) onSelect(node)
  }, [])

  const forward = useCallback((
    tabs: FileNode[],
    onSelect: (node: FileNode) => void
  ) => {
    if (pointer.current >= stack.current.length - 1) return
    pointer.current += 1
    rerender()
    const id   = stack.current[pointer.current]
    const node = tabs.find(t => t.id === id)
    if (node) onSelect(node)
  }, [])

  const removeId = useCallback((fileId: string) => {
    stack.current = stack.current.filter(id => id !== fileId)
    pointer.current = Math.min(pointer.current, stack.current.length - 1)
    rerender()
  }, [])

  return { push, back, forward, removeId }
}

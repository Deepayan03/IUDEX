"use client"

import { useState, useRef, useEffect, useCallback } from "react"

interface UseResizablePanelOptions {
  axis: "horizontal" | "vertical"
  size: number
  setSize: (size: number) => void
  min: number
  max: number
}

interface UseResizablePanelReturn {
  isDragging: boolean
  onResizeDown: (e: React.MouseEvent) => void
}

export function useResizablePanel({
  axis,
  size,
  setSize,
  min,
  max,
}: UseResizablePanelOptions): UseResizablePanelReturn {
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef(0)
  const dragInit = useRef(size)

  const onResizeDown = useCallback(
    (e: React.MouseEvent) => {
      dragStart.current = axis === "horizontal" ? e.clientX : e.clientY
      dragInit.current = size
      setIsDragging(true)
      document.body.style.cursor =
        axis === "horizontal" ? "col-resize" : "row-resize"
      document.body.style.userSelect = "none"
    },
    [axis, size]
  )

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent) => {
      const delta =
        axis === "horizontal"
          ? e.clientX - dragStart.current
          : -(e.clientY - dragStart.current) // terminal grows upward
      setSize(Math.max(min, Math.min(max, dragInit.current + delta)))
    }
    const onUp = () => {
      setIsDragging(false)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [isDragging, axis, min, max, setSize])

  return { isDragging, onResizeDown }
}

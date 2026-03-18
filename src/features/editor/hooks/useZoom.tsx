"use client"

import { useState, useEffect, useCallback } from "react"

const MIN = 0.5
const MAX = 2.0
const STEP = 0.1

export function useZoom(initial = 1) {
  const [zoom, setZoom] = useState(initial)

  // Apply zoom as root font-size scaling
  useEffect(() => {
    document.documentElement.style.fontSize = `${zoom * 100}%`
    return () => { document.documentElement.style.fontSize = "" }
  }, [zoom])

  const zoomIn    = useCallback(() => setZoom(z => parseFloat(Math.min(z + STEP, MAX).toFixed(1))), [])
  const zoomOut   = useCallback(() => setZoom(z => parseFloat(Math.max(z - STEP, MIN).toFixed(1))), [])
  const zoomReset = useCallback(() => setZoom(1), [])

  return { zoom, zoomIn, zoomOut, zoomReset }
}
"use client"

import { useEffect, useRef } from "react"

function emitRenderProbe(
  scope: string,
  phase: string,
  data?: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV === "production") return

  const prefix = `[render-probe][${scope}] ${phase}`
  if (data) {
    console.info(prefix, data)
    return
  }

  console.info(prefix)
}

export function logRenderProbe(
  scope: string,
  phase: string,
  data?: Record<string, unknown>,
): void {
  emitRenderProbe(scope, phase, data)
}

export function useRenderLogger(
  scope: string,
  data?: Record<string, unknown>,
): void {
  const renderCountRef = useRef(0)
  const initialDataRef = useRef(data)

  useEffect(() => {
    renderCountRef.current += 1
    emitRenderProbe(scope, "commit", {
      renderCount: renderCountRef.current,
      ...data,
    })
  })

  useEffect(() => {
    emitRenderProbe(scope, "mount", initialDataRef.current)
    return () => {
      emitRenderProbe(scope, "unmount")
    }
  }, [scope])
}

"use client"

import { useEffect } from "react"

interface ToastProps {
  message: string
  onDone: () => void
}

export default function Toast({ message, onDone }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div style={{
      position: "fixed",
      bottom: 36,
      left: "50%",
      transform: "translateX(-50%)",
      background: "#1e2433",
      border: "1px solid #2d3a52",
      color: "#c8d6e5",
      fontSize: 12,
      padding: "7px 16px",
      borderRadius: 4,
      boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
      zIndex: 99999,
      whiteSpace: "nowrap",
      animation: "toastIn 0.15s ease both",
      fontFamily: "monospace",
    }}>
      {message}
    </div>
  )
}
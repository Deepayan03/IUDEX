"use client"

import { useEffect, useRef } from "react"

interface ConfirmActionModalProps {
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  tone?: "danger" | "primary"
  note?: string | null
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmActionModal({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  note = null,
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onCancel])

  const confirmStyles =
    tone === "danger"
      ? {
          background: "#ef4444",
          border: "1px solid rgba(248,113,113,0.45)",
          color: "#ffffff",
        }
      : {
          background: "#3d5afe",
          border: "1px solid rgba(61,90,254,0.45)",
          color: "#ffffff",
        }

  return (
    <div
      ref={overlayRef}
      onMouseDown={(event) => {
        if (event.target === overlayRef.current) {
          onCancel()
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(3, 8, 18, 0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        animation: "paletteIn 0.12s ease both",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          borderRadius: 18,
          overflow: "hidden",
          background: "linear-gradient(180deg, rgba(13,17,29,0.98), rgba(8,12,24,0.98))",
          border: "1px solid rgba(30,45,66,0.9)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.48)",
        }}
      >
        <div
          style={{
            padding: "18px 20px 14px",
            borderBottom: "1px solid #161f30",
            background: "rgba(6,12,24,0.88)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: "#f8fafc" }}>
            {title}
          </div>
        </div>

        <div style={{ padding: 20 }}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.7,
              color: "#c8d6e5",
            }}
          >
            {description}
          </p>

          {note ? (
            <div
              style={{
                marginTop: 14,
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(61,90,254,0.08)",
                border: "1px solid rgba(61,90,254,0.18)",
                color: "#9fb8ff",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              {note}
            </div>
          ) : null}

          <div
            style={{
              marginTop: 20,
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <button
              onClick={onCancel}
              type="button"
              style={{
                padding: "9px 14px",
                borderRadius: 10,
                border: "1px solid #243050",
                background: "#111827",
                color: "#c8d6e5",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {cancelLabel}
            </button>

            <button
              onClick={onConfirm}
              type="button"
              style={{
                padding: "9px 14px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                ...confirmStyles,
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

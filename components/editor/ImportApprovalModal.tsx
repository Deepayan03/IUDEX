"use client"

import { useEffect, useRef } from "react"

export interface ImportRequestData {
  id: string
  fromUserId: string
  fromUsername: string
  repoOwner: string
  repoName: string
  repoBranch: string
}

interface ImportApprovalModalProps {
  request: ImportRequestData
  onApprove: () => void
  onReject: () => void
}

export default function ImportApprovalModal({ request, onApprove, onReject }: ImportApprovalModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onReject() }
    document.addEventListener("keydown", h)
    return () => document.removeEventListener("keydown", h)
  }, [onReject])

  return (
    <div
      ref={overlayRef}
      onMouseDown={e => { if (e.target === overlayRef.current) onReject() }}
      style={{
        position: "fixed", inset: 0, zIndex: 99990,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "paletteIn 0.12s ease both",
      }}
    >
      <div style={{
        background: "#0d1525", border: "1px solid #1e2d42",
        borderRadius: 8, width: 480,
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>
              Import Request
            </span>
          </div>
          <button onClick={onReject} style={{
            background: "transparent", border: "none", color: "#4a6080",
            cursor: "pointer", fontSize: 16, padding: "0 4px",
            display: "flex", alignItems: "center",
          }}>&times;</button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>
          <p style={{ fontSize: 13, color: "#c8d6e5", lineHeight: 1.6, margin: 0 }}>
            <strong style={{ color: "#e2e8f0" }}>{request.fromUsername}</strong>
            {" "}wants to change the repository to{" "}
            <strong style={{ color: "#3d5afe" }}>
              {request.repoOwner}/{request.repoName}
            </strong>
            {request.repoBranch && (
              <span style={{ color: "#6b82a6" }}> ({request.repoBranch})</span>
            )}
          </p>
          <p style={{ fontSize: 11, color: "#4a6080", marginTop: 12, marginBottom: 0 }}>
            This will replace the current project for all collaborators in the room.
          </p>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 8,
          padding: "10px 20px", borderTop: "1px solid #161f30", background: "#060c18",
        }}>
          <button onClick={onReject} style={{
            padding: "6px 16px", fontSize: 12, borderRadius: 4, cursor: "pointer",
            background: "transparent", border: "1px solid #1e2d42", color: "#8899b0",
          }}>
            Reject
          </button>
          <button onClick={onApprove} style={{
            padding: "6px 16px", fontSize: 12, borderRadius: 4, cursor: "pointer",
            background: "#3d5afe", border: "none", color: "white",
            transition: "background 0.2s",
          }}>
            Approve
          </button>
        </div>
      </div>
    </div>
  )
}

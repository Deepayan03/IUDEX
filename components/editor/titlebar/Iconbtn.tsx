"use client"

import { useState } from "react"

interface IconBtnProps {
  children: React.ReactNode
  title: string
  onClick: () => void
  active?: boolean
}

export default function IconBtn({ children, title, onClick, active }: IconBtnProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0 10px",
        border: "none",
        cursor: "pointer",
        color: active ? "#3d5afe" : hovered ? "#cccccc" : "#858585",
        background: hovered ? "rgba(255,255,255,0.06)" : "transparent",
        transition: "color 0.1s, background 0.1s",
      }}
    >
      {children}
    </button>
  )
}
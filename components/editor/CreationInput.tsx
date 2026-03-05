"use client"

import { useEffect, useRef, useState } from "react"

interface CreationInputProps {
  type: "file" | "folder"
  onConfirm: (name: string) => void
  onCancel: () => void
}

export default function CreationInput({ type, onConfirm, onCancel }: CreationInputProps) {
  const [val, setVal] = useState("")
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { ref.current?.focus() }, [])

  return (
    <div className="flex items-center gap-1 px-2 py-1 mx-2 my-0.5 rounded-md bg-[#1a1f2e] border border-[#3d5afe]/40 animate-slideDown">
      <span className="text-[10px]">{type === "folder" ? "📂" : "📄"}</span>
      <input
        ref={ref}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && val.trim()) onConfirm(val.trim())
          if (e.key === "Escape") onCancel()
        }}
        onBlur={() => { if (!val.trim()) onCancel() }}
        placeholder={type === "folder" ? "folder-name" : "file.ts"}
        className="flex-1 bg-transparent text-[12px] text-white outline-none placeholder-[#4a5568] min-w-0"
      />
    </div>
  )
}
"use client"

import { useState } from "react"
import type { FileNode, InlineCreate } from "@/features/editor/lib/types"
import { getFileIcon } from "@/features/editor/lib/utils"
import CreationInput from "@/features/editor/components/CreationInput"

interface FileTreeNodeProps {
  node: FileNode
  depth: number
  activeFileId: string | null
  onSelect: (node: FileNode) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string, type: "file" | "folder") => void
  inlineCreate: InlineCreate
  setInlineCreate: (v: InlineCreate) => void
  onConfirmCreate: (parentId: string | null, name: string, type: "file" | "folder") => void
}

export default function FileTreeNode({
  node, depth, activeFileId, onSelect, onToggle, onDelete,
  onAddChild, inlineCreate, setInlineCreate, onConfirmCreate,
}: FileTreeNodeProps) {
  const [hovered, setHovered] = useState(false)
  const isActive = node.id === activeFileId
  const indent = depth * 12

  return (
    <div>
      {/* Row */}
      <div
        className={`
          group relative flex items-center gap-1.5 py-0.75 pr-2 rounded-md mx-1 cursor-pointer
          transition-all duration-150 select-none
          ${isActive ? "bg-[#1e2d4a] text-white" : "text-[#8899b0] hover:text-[#c8d6e5] hover:bg-[#141925]"}
        `}
        style={{ paddingLeft: `${8 + indent}px` }}
        onClick={() => node.type === "folder" ? onToggle(node.id) : onSelect(node)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Folder expand triangle */}
        {node.type === "folder" && (
          <svg
            width="10" height="10" viewBox="0 0 10 10"
            className={`shrink-0 transition-transform duration-200 ${node.isOpen ? "rotate-90" : ""}`}
            fill="currentColor"
          >
            <path d="M3 2l4 3-4 3V2z" />
          </svg>
        )}

        {/* Icon */}
        {node.type === "folder" ? (
          <span className="text-[11px] leading-none shrink-0" style={{ color: "#7b9ef7" }}>
            {node.isOpen ? "📂" : "📁"}
          </span>
        ) : (
          <span
            className="text-[9px] font-bold leading-none shrink-0 w-4.5 text-center"
            style={{ color: getFileIcon(node.name).color }}
          >
            {getFileIcon(node.name).icon}
          </span>
        )}

        {/* Name */}
        <span className={`text-[12px] truncate flex-1 ${isActive ? "text-white" : ""}`}>
          {node.name}
        </span>

        {/* Hover action buttons */}
        {hovered && (
          <div className="flex items-center gap-0.5 shrink-0 animate-fadeIn">
            {node.type === "folder" && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); onAddChild(node.id, "file") }}
                  className="p-0.5 rounded hover:bg-[#3d5afe]/20 text-[#7b9ef7] transition-colors"
                  title="New File"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
                  </svg>
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onAddChild(node.id, "folder") }}
                  className="p-0.5 rounded hover:bg-[#3d5afe]/20 text-[#7b9ef7] transition-colors"
                  title="New Folder"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
                  </svg>
                </button>
              </>
            )}
            <button
              onClick={e => { e.stopPropagation(); onDelete(node.id) }}
              className="p-0.5 rounded hover:bg-red-500/20 text-[#5a6878] hover:text-red-400 transition-colors"
              title="Delete"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
              </svg>
            </button>
          </div>
        )}

        {/* Active left-edge indicator */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3/4 rounded-full bg-[#3d5afe]" />
        )}
      </div>

      {/* Children (recursive) */}
      {node.type === "folder" && node.isOpen && (
        <div className="animate-expand">
          {inlineCreate?.parentId === node.id && (
            <CreationInput
              type={inlineCreate.type}
              onConfirm={name => onConfirmCreate(node.id, name, inlineCreate.type)}
              onCancel={() => setInlineCreate(null)}
            />
          )}
          {(node.children ?? []).map(child => (
            <FileTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              activeFileId={activeFileId}
              onSelect={onSelect}
              onToggle={onToggle}
              onDelete={onDelete}
              onAddChild={onAddChild}
              inlineCreate={inlineCreate}
              setInlineCreate={setInlineCreate}
              onConfirmCreate={onConfirmCreate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

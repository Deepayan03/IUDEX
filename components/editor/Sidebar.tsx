"use client"

import { useState } from "react"
import type { FileNode, InlineCreate } from "./types"
import { flatFiles } from "./utils"
import CreationInput from "@/components/editor/CreationInput"
import FileTreeNode from "@/components/editor/fileTreeNode"

interface SidebarProps {
  tree: FileNode[]
  activeFileId: string | null
  sidebarWidth: number
  inlineCreate: InlineCreate
  setInlineCreate: (v: InlineCreate) => void
  onSelect: (node: FileNode) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string, type: "file" | "folder") => void
  onConfirmCreate: (parentId: string | null, name: string, type: "file" | "folder") => void
}

export default function Sidebar({
  tree, activeFileId, sidebarWidth, inlineCreate, setInlineCreate,
  onSelect, onToggle, onDelete, onAddChild, onConfirmCreate,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)

  const allFiles = flatFiles(tree)
  const searchResults = searchQuery.trim()
    ? allFiles.filter(({ node }) =>
        node.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  return (
    <div
      className="sidebar-bg flex flex-col overflow-hidden shrink-0"
      style={{ width: sidebarWidth, minWidth: sidebarWidth, borderRight: "1px solid #0d1525" }}
    >
      {/* Header */}
      <div
        className="h-9 min-h-9 flex items-center justify-between px-3 shrink-0"
        style={{ borderBottom: "1px solid #0d1525" }}
      >
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#3a5080" }}>
          Explorer
        </span>
        <div className="flex items-center gap-1">
          {/* New File (root) */}
          <button
            onClick={() => setInlineCreate({ parentId: null, type: "file" })}
            className="p-1 rounded hover:bg-[#141925] text-[#3a5080] hover:text-[#7b9ef7] transition-all"
            title="New File"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          </button>
          {/* New Folder (root) */}
          <button
            onClick={() => setInlineCreate({ parentId: null, type: "folder" })}
            className="p-1 rounded hover:bg-[#141925] text-[#3a5080] hover:text-[#7b9ef7] transition-all"
            title="New Folder"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-2 shrink-0" style={{ borderBottom: "1px solid #0d1525" }}>
        <div
          className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-all duration-200 ${searchFocused ? "ring-1 ring-[#3d5afe]/50" : ""}`}
          style={{ background: "#0a1020" }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3a5080" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search files..."
            className="bg-transparent text-[12px] outline-none flex-1 placeholder-[#2a3a52]"
            style={{ color: "#8899b0" }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-[#3a5080] hover:text-[#8899b0] transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchQuery && (
          <div className="mt-1 animate-slideDown">
            {searchResults.length === 0 ? (
              <p className="text-[11px] text-[#3a5080] px-2 py-1">No files found</p>
            ) : (
              searchResults.slice(0, 8).map(({ node, path }) => (
                <button
                  key={node.id}
                  onClick={() => { onSelect(node); setSearchQuery("") }}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#141925] transition-colors"
                >
                  <div className="text-[12px]" style={{ color: "#c8d6e5" }}>{node.name}</div>
                  <div className="text-[10px]" style={{ color: "#3a5080" }}>{path}</div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto py-1 thin-scrollbar">
        {/* Root-level inline create */}
        {inlineCreate?.parentId === null && (
          <CreationInput
            type={inlineCreate.type}
            onConfirm={name => onConfirmCreate(null, name, inlineCreate.type)}
            onCancel={() => setInlineCreate(null)}
          />
        )}
        {tree.map(node => (
          <FileTreeNode
            key={node.id}
            node={node}
            depth={0}
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

      {/* Footer */}
      <div
        className="shrink-0 px-3 py-2 flex items-center justify-between"
        style={{ borderTop: "1px solid #0d1525" }}
      >
        <span className="text-[10px]" style={{ color: "#243050" }}>
          {allFiles.length} files
        </span>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#3d5afe] animate-pulse" />
          <span className="text-[10px]" style={{ color: "#243050" }}>CRDT live</span>
        </div>
      </div>
    </div>
  )
}
"use client"

import { useState, useRef, useEffect, useCallback } from "react"


import type { FileNode, InlineCreate } from "./types"
import { uid, getLanguage, addNode, toggleFolder, deleteNode, getBreadcrumb } from "./utils"
import { INITIAL_TREE } from "./initialTree"
import "./editorStyles.css"

import TitleBar    from "./Titlebar"
import ActivityBar from "./Activitybar"
import Sidebar     from "./Sidebar"
import EditorPane  from "./Editorpane"
import StatusBar   from "./Statusbar"

export default function EditorLayout() {
  const [tree, setTree]               = useState<FileNode[]>(INITIAL_TREE)
  const [activeFile, setActiveFile]   = useState<FileNode | null>(null)
  const [openTabs, setOpenTabs]       = useState<FileNode[]>([])
  const [inlineCreate, setInlineCreate] = useState<InlineCreate>(null)
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [isDragging, setIsDragging]   = useState(false)

  // ── File selection ──────────────────────────────────────────────────────────
  const selectFile = useCallback((node: FileNode) => {
    setActiveFile(node)
    setOpenTabs(prev =>
      prev.find(t => t.id === node.id) ? prev : [...prev, node]
    )
  }, [])

  // ── Close tab ───────────────────────────────────────────────────────────────
  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = openTabs.filter(t => t.id !== id)
    setOpenTabs(next)
    if (activeFile?.id === id) setActiveFile(next[next.length - 1] ?? null)
  }

  // ── Create node ─────────────────────────────────────────────────────────────
  const confirmCreate = (
    parentId: string | null,
    name: string,
    type: "file" | "folder"
  ) => {
    const node: FileNode = {
      id: uid(),
      name,
      type,
      ...(type === "file"
        ? { content: `// ${name}`, language: getLanguage(name) }
        : { children: [], isOpen: true }),
    }
    setTree(t => addNode(t, parentId, node))
    setInlineCreate(null)
    if (type === "file") setTimeout(() => selectFile(node), 50)
  }

  // ── Delete node ─────────────────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    setTree(t => deleteNode(t, id))
    setOpenTabs(p => p.filter(t => t.id !== id))
    if (activeFile?.id === id) setActiveFile(null)
  }

  // ── Sidebar resize drag ─────────────────────────────────────────────────────
  const dragStart     = useRef(0)
  const dragInitWidth = useRef(sidebarWidth)

  const onResizeMouseDown = (e: React.MouseEvent) => {
    dragStart.current    = e.clientX
    dragInitWidth.current = sidebarWidth
    setIsDragging(true)
    document.body.style.cursor     = "col-resize"
    document.body.style.userSelect = "none"
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging) return
      const delta = e.clientX - dragStart.current
      setSidebarWidth(Math.max(160, Math.min(500, dragInitWidth.current + delta)))
    }
    const onUp = () => {
      setIsDragging(false)
      document.body.style.cursor     = ""
      document.body.style.userSelect = ""
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [isDragging])

  // ── Breadcrumb ──────────────────────────────────────────────────────────────
  const breadcrumb = activeFile
    ? getBreadcrumb(tree, activeFile.id) ?? [activeFile.name]
    : []

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden ui-font"
      style={{ background: "#060c18", color: "#c8d6e5" }}
    >
      <TitleBar activeFileName={activeFile?.name ?? null} />

      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />

        <Sidebar
          tree={tree}
          activeFileId={activeFile?.id ?? null}
          sidebarWidth={sidebarWidth}
          inlineCreate={inlineCreate}
          setInlineCreate={setInlineCreate}
          onSelect={selectFile}
          onToggle={id => setTree(t => toggleFolder(t, id))}
          onDelete={handleDelete}
          onAddChild={(parentId, type) => setInlineCreate({ parentId, type })}
          onConfirmCreate={confirmCreate}
        />

        {/* Resize handle */}
        <div
          className={`relative w-[3px] flex-shrink-0 resize-handle ${isDragging ? "dragging" : ""}`}
          style={{ background: isDragging ? "rgba(61,90,254,0.3)" : "transparent" }}
          onMouseDown={onResizeMouseDown}
        />

        <EditorPane
          activeFile={activeFile}
          openTabs={openTabs}
          breadcrumb={breadcrumb}
          onTabClick={setActiveFile}
          onTabClose={closeTab}
        />
      </div>

      <StatusBar activeFile={activeFile} />
    </div>
  )
}
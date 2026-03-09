"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"

import type { FileNode, InlineCreate, EditorPrefs } from "./types"
import { DEFAULT_PREFS, loadPrefs, savePrefs }       from "./types"
import { fileIdFromPath, getLanguage, addNode, toggleFolder, deleteNode, getBreadcrumb } from "./utils"
import { INITIAL_TREE }                              from "./initialTree"
import "./editorStyles.css"

import { useEditorActions }   from "./hooks/UserEditorActions"
import { useTabHistory }      from "./hooks/UserTabHistory"
import { useZoom }            from "./hooks/Usezoom"
import { useGlobalShortcuts } from "./hooks/UseGlobalShortcuts"

import TitleBar, { type TitleBarAction } from "./titlebar/Titlebar"
import ActivityBar                       from "./Activitybar"
import Sidebar                           from "./Sidebar"
import EditorPane                        from "./Editorpane"
import StatusBar                         from "./Statusbar"
import PreferencesModal                  from "./PreferencesModal"
import ImportGitHubModal                 from "./ImportGitHubModal"
import ImportApprovalModal               from "./ImportApprovalModal"
import type { ImportRequestData }        from "./ImportApprovalModal"
import CollaboratorsPanel                from "./CollaboratorsPanel"
import Toast                             from "./titlebar/Toast"
import type { EditorInstance }           from "./CodeEditor"

import { useRealtimeEditor }     from "@/lib/yjs/useRealtimeEditor"
import { useRoomState }          from "@/lib/yjs/useRoomState"
import { addRoomToHistory }      from "@/lib/roomHistory"
import { useCollaborationStore } from "@/store/collaboration"

interface EditorLayoutProps {
  roomId?: string
  userInfo?: { userId: string; username: string } | null
}

export default function EditorLayout({ roomId, userInfo }: EditorLayoutProps) {
  // ── File tree + tabs ──────────────────────────────────────────────────────
  const [activeFile,   setActiveFile]   = useState<FileNode | null>(null)
  const [openTabs,     setOpenTabs]     = useState<FileNode[]>([])
  const [unsavedIds,   setUnsavedIds]   = useState<Set<string>>(new Set())
  const [inlineCreate, setInlineCreate] = useState<InlineCreate>(null)

  // ── Layout state ──────────────────────────────────────────────────────────
  const [sidebarVisible,   setSidebarVisible]   = useState(true)
  const [sidebarWidth,     setSidebarWidth]     = useState(260)
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false)

  // ── Terminal ──────────────────────────────────────────────────────────────
  const [terminalVisible,  setTerminalVisible]  = useState(false)
  const [terminalHeight,   setTerminalHeight]   = useState(220)
  const [isDraggingTerm,   setIsDraggingTerm]   = useState(false)

  // ── Debug ─────────────────────────────────────────────────────────────────
  const [isDebugging, setIsDebugging] = useState(false)

  // ── Preferences ───────────────────────────────────────────────────────────
  const [prefsOpen, setPrefsOpen]   = useState(false)
  const [prefs,     setPrefs]       = useState<EditorPrefs>(() =>
    typeof window !== "undefined" ? loadPrefs() : DEFAULT_PREFS
  )

  // ── GitHub import ───────────────────────────────────────────────────────────
  const [githubImportOpen, setGithubImportOpen] = useState(false)
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null)

  // ── Cursor position (from Monaco) ─────────────────────────────────────────
  const [cursorLine, setCursorLine] = useState(1)
  const [cursorCol,  setCursorCol]  = useState(1)

  // ── Import approval flow ──────────────────────────────────────────────────
  const [approvalModalData, setApprovalModalData] = useState<ImportRequestData | null>(null)
  const [importToast, setImportToast] = useState<string | null>(null)
  const pendingRequestRef = useRef<{ id: string; tree: FileNode[]; meta: { owner: string; repo: string; branch: string } } | null>(null)
  const handledRequestIds = useRef<Set<string>>(new Set())
  const handledResponseIds = useRef<Set<string>>(new Set())

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const { zoom, zoomIn, zoomOut, zoomReset } = useZoom()
  const { setEditor, getValue, actions: editorActions } = useEditorActions()
  const tabHistory = useTabHistory()

  // ── CRDT Collaboration ──────────────────────────────────────────────────
  const crdtEnabled = !!roomId && !!userInfo

  // ── Record room visit in history ─────────────────────────────────────────
  useEffect(() => {
    if (roomId) addRoomToHistory(roomId)
  }, [roomId])

  // Room-level shared state (tree sync + room-wide awareness)
  const {
    tree,
    githubRepo,
    setTreeLocal,
    syncTree,
    importProject,
    isCreator,
    roomCreatorId,
    providerRef,
  } = useRoomState({
    roomId: crdtEnabled ? roomId! : null,
    userInfo: userInfo ?? null,
    initialTree: INITIAL_TREE,
    activeFileName: activeFile?.name,
  })

  // Per-file content CRDT
  const fileRoomId = useMemo(
    () => (crdtEnabled && activeFile ? `${roomId}:${activeFile.id}` : null),
    [crdtEnabled, roomId, activeFile]
  )

  const { bindEditor } = useRealtimeEditor({
    roomId: fileRoomId,
    userInfo: userInfo ?? null,
    initialContent: activeFile?.content,
  })

  const connectionStatus = useCollaborationStore(s => s.connectionStatus)
  const collaborators    = useCollaborationStore(s => s.collaborators)

  // ── Persist prefs on change ───────────────────────────────────────────────
  useEffect(() => { savePrefs(prefs) }, [prefs])

  // ── Monaco mount + cursor tracking ───────────────────────────────────────
  const handleEditorMount = useCallback((editor: EditorInstance) => {
    setEditor(editor)
    editor.onDidChangeCursorPosition(e => {
      setCursorLine(e.position.lineNumber)
      setCursorCol(e.position.column)
    })
    // Bind CRDT if enabled
    if (crdtEnabled) {
      bindEditor(editor)
    }
  }, [setEditor, crdtEnabled, bindEditor])

  // ── Content change → mark dirty ──────────────────────────────────────────
  const handleContentChange = useCallback((value: string) => {
    if (!activeFile) return
    // Only mark dirty if content actually differs from saved content
    setUnsavedIds(prev => {
      const next = new Set(prev)
      next.add(activeFile.id)
      return next
    })
    // Keep in-memory content updated so go-back restores correct content
    // Content updates are local-only (not synced via room tree)
    setTreeLocal(t => updateContent(t, activeFile.id, value))
  }, [activeFile, setTreeLocal])

  // ── File selection ────────────────────────────────────────────────────────
  const selectFile = useCallback((node: FileNode) => {
    setActiveFile(node)
    setOpenTabs(prev => prev.find(t => t.id === node.id) ? prev : [...prev, node])
    tabHistory.push(node.id)

    // Lazy-load content for GitHub-imported files
    if (node.githubPath && node.content === undefined && githubRepo) {
      setLoadingFileId(node.id)
      const params = new URLSearchParams({
        owner: githubRepo.owner,
        repo: githubRepo.repo,
        branch: githubRepo.branch,
        path: node.githubPath,
      })
      fetch(`/api/github/content?${params}`)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to load file (${res.status})`)
          return res.json()
        })
        .then(data => {
          const content: string = data.content
          setTreeLocal(t => updateContent(t, node.id, content))
          setActiveFile(prev => prev?.id === node.id ? { ...prev, content } : prev)
          setOpenTabs(prev => prev.map(t => t.id === node.id ? { ...t, content } : t))
        })
        .catch(err => {
          const errorMsg = `// Error loading file: ${(err as Error).message}\n// Path: ${node.githubPath}`
          setTreeLocal(t => updateContent(t, node.id, errorMsg))
          setActiveFile(prev => prev?.id === node.id ? { ...prev, content: errorMsg } : prev)
        })
        .finally(() => {
          setLoadingFileId(prev => prev === node.id ? null : prev)
        })
    }
  }, [tabHistory, githubRepo, setTreeLocal])

  // ── Close tab ─────────────────────────────────────────────────────────────
  const closeTab = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const next = openTabs.filter(t => t.id !== id)
    setOpenTabs(next)
    setUnsavedIds(prev => { const s = new Set(prev); s.delete(id); return s })
    tabHistory.removeId(id)
    if (activeFile?.id === id) setActiveFile(next[next.length - 1] ?? null)
  }, [openTabs, activeFile, tabHistory])

  // ── Create node ───────────────────────────────────────────────────────────
  const confirmCreate = useCallback((parentId: string | null, name: string, type: "file" | "folder") => {
    const id = fileIdFromPath(parentId, name)
    const node: FileNode = {
      id, name, type,
      ...(type === "file"
        ? { content: `// ${name}\n`, language: getLanguage(name) }
        : { children: [], isOpen: true }),
    }
    // Structural change → synced to room
    syncTree(t => addNode(t, parentId, node))
    setInlineCreate(null)
    if (type === "file") setTimeout(() => selectFile(node), 50)
  }, [selectFile, syncTree])

  // ── Delete node ───────────────────────────────────────────────────────────
  const handleDelete = useCallback((id: string) => {
    // Structural change → synced to room
    syncTree(t => deleteNode(t, id))
    closeTab(id)
  }, [closeTab, syncTree])

  // ── Save file ─────────────────────────────────────────────────────────────
  const saveFile = useCallback((fileId?: string) => {
    const id = fileId ?? activeFile?.id
    if (!id) return
    if (prefs.formatOnSave) editorActions.formatDoc()
    setUnsavedIds(prev => { const s = new Set(prev); s.delete(id); return s })
  }, [activeFile, prefs.formatOnSave, editorActions])

  const saveAll = useCallback(() => {
    if (prefs.formatOnSave) editorActions.formatDoc()
    setUnsavedIds(new Set())
  }, [prefs.formatOnSave, editorActions])

  // ── Save As (download) ────────────────────────────────────────────────────
  const saveAs = useCallback(() => {
    if (!activeFile) return
    const content = getValue()
    const blob = new Blob([content], { type: "text/plain" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href     = url
    a.download = activeFile.name
    a.click()
    URL.revokeObjectURL(url)
    saveFile()
  }, [activeFile, getValue, saveFile])

  // ── Close all editors ─────────────────────────────────────────────────────
  const closeAllEditors = useCallback(() => {
    setOpenTabs([])
    setActiveFile(null)
    setUnsavedIds(new Set())
  }, [])

  // ── GitHub import handler ────────────────────────────────────────────────
  const handleGitHubImport = useCallback((
    importedTree: FileNode[],
    meta: { owner: string; repo: string; branch: string }
  ) => {
    setGithubImportOpen(false)

    if (!crdtEnabled || isCreator) {
      // Creator (or non-CRDT mode) can import directly
      importProject(importedTree, meta)
      setActiveFile(null)
      setOpenTabs([])
      setUnsavedIds(new Set())
      setLoadingFileId(null)
    } else {
      // Non-creator: send request via awareness
      const provider = providerRef.current
      if (!provider || !userInfo) return

      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      pendingRequestRef.current = { id: requestId, tree: importedTree, meta }

      provider.awareness.setLocalStateField("importRequest", {
        id: requestId,
        fromUserId: userInfo.userId,
        fromUsername: userInfo.username,
        repoOwner: meta.owner,
        repoName: meta.repo,
        repoBranch: meta.branch,
      })

      setImportToast("Import request sent. Waiting for room owner...")
    }
  }, [crdtEnabled, isCreator, importProject, providerRef, userInfo])

  // ── Import approval/rejection handlers (creator only) ─────────────────────
  const handleApproveImport = useCallback(() => {
    const provider = providerRef.current
    if (!provider || !approvalModalData) return

    provider.awareness.setLocalStateField("importResponse", {
      id: approvalModalData.id,
      approved: true,
    })

    setApprovalModalData(null)

    // Clear response after delay so the requester can read it
    setTimeout(() => {
      provider.awareness.setLocalStateField("importResponse", null)
    }, 5000)
  }, [providerRef, approvalModalData])

  const handleRejectImport = useCallback(() => {
    const provider = providerRef.current
    if (!provider || !approvalModalData) return

    provider.awareness.setLocalStateField("importResponse", {
      id: approvalModalData.id,
      approved: false,
    })

    setApprovalModalData(null)

    setTimeout(() => {
      provider.awareness.setLocalStateField("importResponse", null)
    }, 5000)
  }, [providerRef, approvalModalData])

  // ── Awareness listener for import request/response signaling ──────────────
  useEffect(() => {
    const provider = providerRef.current
    if (!provider || !crdtEnabled || !userInfo) return

    const handler = () => {
      const states = provider.awareness.getStates()

      states.forEach((state, clientId) => {
        if (clientId === provider.doc.clientID) return

        // If I am the creator, watch for incoming import requests
        if (isCreator && state.importRequest) {
          const req = state.importRequest as {
            id: string
            fromUserId: string
            fromUsername: string
            repoOwner: string
            repoName: string
            repoBranch: string
          }
          if (!handledRequestIds.current.has(req.id)) {
            handledRequestIds.current.add(req.id)
            setApprovalModalData({
              id: req.id,
              fromUserId: req.fromUserId,
              fromUsername: req.fromUsername,
              repoOwner: req.repoOwner,
              repoName: req.repoName,
              repoBranch: req.repoBranch,
            })
          }
        }

        // If I am a requester, watch for import responses from the creator
        if (!isCreator && state.importResponse && pendingRequestRef.current) {
          const resp = state.importResponse as { id: string; approved: boolean }
          if (resp.id === pendingRequestRef.current.id && !handledResponseIds.current.has(resp.id)) {
            handledResponseIds.current.add(resp.id)
            if (resp.approved) {
              const { tree: reqTree, meta: reqMeta } = pendingRequestRef.current
              importProject(reqTree, reqMeta)
              setActiveFile(null)
              setOpenTabs([])
              setUnsavedIds(new Set())
              setLoadingFileId(null)
              setImportToast("Import approved! Project updated.")
            } else {
              setImportToast("Import request was rejected by the room owner.")
            }
            pendingRequestRef.current = null
            provider.awareness.setLocalStateField("importRequest", null)
          }
        }
      })
    }

    provider.awareness.on("change", handler)
    return () => { provider.awareness.off("change", handler) }
    // connectionStatus is used as a proxy to re-run when the provider connects/reconnects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionStatus, crdtEnabled, isCreator, userInfo, importProject])

  // ── Debug ─────────────────────────────────────────────────────────────────
  const startDebug = useCallback(() => {
    setIsDebugging(true)
    if (!terminalVisible) setTerminalVisible(true)
  }, [terminalVisible])

  const stopDebug = useCallback(() => {
    setIsDebugging(false)
  }, [])

  // ── Main action handler ───────────────────────────────────────────────────
  const handleAction = useCallback((action: TitleBarAction) => {
    switch (action) {

      // ── File ────────────────────────────────────────────────────────────
      case "new-file":        setInlineCreate({ parentId: null, type: "file" });   break
      case "new-folder":      setInlineCreate({ parentId: null, type: "folder" }); break
      case "save":            saveFile();      break
      case "save-all":        saveAll();       break
      case "save-as":         saveAs();        break
      case "close-editor":    if (activeFile) closeTab(activeFile.id); break
      case "close-all-editors": closeAllEditors(); break
      case "preferences":     setPrefsOpen(true); break
      case "import-github":   setGithubImportOpen(true); break

      // ── Edit — delegated to Monaco ───────────────────────────────────────
      case "undo":            editorActions.undo();          break
      case "redo":            editorActions.redo();          break
      case "cut":             editorActions.trigger("editor.action.clipboardCutAction");  break
      case "copy":            editorActions.trigger("editor.action.clipboardCopyAction"); break
      case "paste":           editorActions.trigger("editor.action.clipboardPasteAction"); break
      case "select-all":      editorActions.selectAll();     break
      case "find":            editorActions.find();          break
      case "replace":         editorActions.replace();       break
      case "format-document": editorActions.formatDoc();     break
      case "toggle-comment":  editorActions.toggleComment(); break

      // ── View ────────────────────────────────────────────────────────────
      case "command-palette": break  // handled inside TitleBar
      case "toggle-sidebar":
      case "toggle-explorer": setSidebarVisible(v => !v);   break
      case "toggle-terminal": setTerminalVisible(v => !v);  break
      case "toggle-panel-layout": /* future split layout */ break
      case "zoom-in":         zoomIn();   break
      case "zoom-out":        zoomOut();  break
      case "zoom-reset":      zoomReset(); break

      // ── Go ──────────────────────────────────────────────────────────────
      case "go-back":          tabHistory.back(openTabs,    node => { setActiveFile(node) }); break
      case "go-forward":       tabHistory.forward(openTabs, node => { setActiveFile(node) }); break
      case "go-to-file":       editorActions.find();          break  // palette handles this
      case "go-to-line":       editorActions.goToLine();      break
      case "go-to-symbol":     editorActions.goToSymbol();    break
      case "go-to-definition": editorActions.goToDefinition();break

      // ── Run ─────────────────────────────────────────────────────────────
      case "start-debug":      startDebug();  break
      case "run-without-debug": startDebug(); break  // same UI, no breakpoints
      case "stop-debug":       stopDebug();   break
      case "restart-debug":    stopDebug(); setTimeout(startDebug, 200); break
      case "toggle-breakpoint":editorActions.toggleBreak(); break
      case "run-build-task":
        setTerminalVisible(true)
        break

      // ── Terminal ────────────────────────────────────────────────────────
      case "new-terminal":
      case "split-terminal":   setTerminalVisible(true);  break
      case "kill-terminal":    setTerminalVisible(false); break
      case "run-active-file":
        setTerminalVisible(true)
        break

      // ── Misc ────────────────────────────────────────────────────────────
      case "notifications": break
      case "open-recent":   break
    }
  }, [
    activeFile, openTabs,
    saveFile, saveAll, saveAs, closeTab, closeAllEditors,
    editorActions, tabHistory,
    zoomIn, zoomOut, zoomReset,
    startDebug, stopDebug,
  ])

  // ── Global keyboard shortcuts ─────────────────────────────────────────────
  useGlobalShortcuts({ onAction: handleAction })

  // ── Sidebar resize drag ───────────────────────────────────────────────────
  const sidebarDragStart = useRef(0)
  const sidebarDragInit  = useRef(sidebarWidth)

  const onSidebarResizeDown = (e: React.MouseEvent) => {
    sidebarDragStart.current = e.clientX
    sidebarDragInit.current  = sidebarWidth
    setIsDraggingSidebar(true)
    document.body.style.cursor     = "col-resize"
    document.body.style.userSelect = "none"
  }

  useEffect(() => {
    if (!isDraggingSidebar) return
    const onMove = (e: MouseEvent) =>
      setSidebarWidth(Math.max(160, Math.min(500, sidebarDragInit.current + e.clientX - sidebarDragStart.current)))
    const onUp = () => {
      setIsDraggingSidebar(false)
      document.body.style.cursor = document.body.style.userSelect = ""
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup",   onUp)
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
  }, [isDraggingSidebar])

  // ── Terminal resize drag ──────────────────────────────────────────────────
  const termDragStart = useRef(0)
  const termDragInit  = useRef(terminalHeight)

  const onTermResizeDown = (e: React.MouseEvent) => {
    termDragStart.current = e.clientY
    termDragInit.current  = terminalHeight
    setIsDraggingTerm(true)
    document.body.style.cursor     = "row-resize"
    document.body.style.userSelect = "none"
  }

  useEffect(() => {
    if (!isDraggingTerm) return
    const onMove = (e: MouseEvent) =>
      setTerminalHeight(Math.max(80, Math.min(600, termDragInit.current - (e.clientY - termDragStart.current))))
    const onUp = () => {
      setIsDraggingTerm(false)
      document.body.style.cursor = document.body.style.userSelect = ""
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup",   onUp)
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
  }, [isDraggingTerm])

  // ── Breadcrumb ────────────────────────────────────────────────────────────
  const breadcrumb = activeFile
    ? getBreadcrumb(tree, activeFile.id) ?? [activeFile.name]
    : []

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden ui-font" style={{ background: "#060c18", color: "#c8d6e5" }}>

      <TitleBar
        activeFileName={activeFile?.name ?? null}
        sidebarVisible={sidebarVisible}
        terminalVisible={terminalVisible}
        isDebugging={isDebugging}
        onAction={handleAction}
      />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <ActivityBar />

        {/* Sidebar */}
        <div style={{
          width:     sidebarVisible ? sidebarWidth : 0,
          minWidth:  sidebarVisible ? sidebarWidth : 0,
          overflow:  "hidden",
          flexShrink: 0,
          transition: "width 0.18s ease, min-width 0.18s ease",
        }}>
          {sidebarVisible && (
            <Sidebar
              tree={tree}
              activeFileId={activeFile?.id ?? null}
              sidebarWidth={sidebarWidth}
              inlineCreate={inlineCreate}
              setInlineCreate={setInlineCreate}
              onSelect={selectFile}
              onToggle={id => setTreeLocal(t => toggleFolder(t, id))}
              onDelete={handleDelete}
              onAddChild={(parentId, type) => setInlineCreate({ parentId, type })}
              onConfirmCreate={confirmCreate}
            />
          )}
        </div>

        {/* Sidebar resize handle */}
        {sidebarVisible && (
          <div
            className={`relative shrink-0 resize-handle ${isDraggingSidebar ? "dragging" : ""}`}
            style={{ width: 3, background: isDraggingSidebar ? "rgba(61,90,254,0.3)" : "transparent", cursor: "col-resize" }}
            onMouseDown={onSidebarResizeDown}
          />
        )}

        <EditorPane
          activeFile={activeFile}
          openTabs={openTabs}
          unsavedIds={unsavedIds}
          breadcrumb={breadcrumb}
          prefs={prefs}
          terminalVisible={terminalVisible}
          terminalHeight={terminalHeight}
          loadingFileId={loadingFileId}
          crdtMode={crdtEnabled}
          onAction={handleAction}
          onTabClick={selectFile}
          onTabClose={(id, e) => closeTab(id, e)}
          onEditorMount={handleEditorMount}
          onContentChange={handleContentChange}
          onTerminalResizeStart={onTermResizeDown}
        />
      </div>

      <StatusBar
        activeFile={activeFile}
        cursorLine={cursorLine}
        cursorCol={cursorCol}
        zoom={zoom}
        unsavedCount={unsavedIds.size}
        isDebugging={isDebugging}
        terminalVisible={terminalVisible}
        connectionStatus={crdtEnabled ? connectionStatus : undefined}
        collaboratorCount={crdtEnabled ? collaborators.length : undefined}
        isRoomCreator={crdtEnabled ? isCreator : undefined}
        roomId={roomId}
        onAction={a => handleAction(a as TitleBarAction)}
      />

      {/* Collaborators floating panel */}
      {crdtEnabled && (
        <CollaboratorsPanel
          collaborators={collaborators}
          connectionStatus={connectionStatus}
          roomCreatorId={roomCreatorId}
          isRoomCreator={isCreator}
        />
      )}

      {/* Preferences modal */}
      {prefsOpen && (
        <PreferencesModal
          prefs={prefs}
          onChange={setPrefs}
          onClose={() => setPrefsOpen(false)}
        />
      )}

      {/* GitHub import modal */}
      {githubImportOpen && (
        <ImportGitHubModal
          onImport={handleGitHubImport}
          onClose={() => setGithubImportOpen(false)}
        />
      )}

      {/* Import approval modal (shown to room creator) */}
      {approvalModalData && (
        <ImportApprovalModal
          request={approvalModalData}
          onApprove={handleApproveImport}
          onReject={handleRejectImport}
        />
      )}

      {/* Import-related toast notifications */}
      {importToast && (
        <Toast message={importToast} onDone={() => setImportToast(null)} />
      )}
    </div>
  )
}

// ── Pure helper: update content of a node in the tree ────────────────────────
function updateContent(nodes: import("./types").FileNode[], id: string, content: string): import("./types").FileNode[] {
  return nodes.map(n => {
    if (n.id === id) return { ...n, content }
    if (n.children) return { ...n, children: updateContent(n.children, id, content) }
    return n
  })
}

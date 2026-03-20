"use client"

import { useEffect, useCallback, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import type { FileNode } from "@/features/editor/lib/types"
import { fileIdFromPath, getLanguage, addNode, toggleFolder, deleteNode, getBreadcrumb, findNodeById, getParentId, flatFiles } from "@/features/editor/lib/utils"
import { INITIAL_TREE } from "@/features/editor/lib/initialTree"
import "@/features/editor/styles/editor.css"

import { useEditorActions }   from "@/features/editor/hooks/useEditorActions"
import { useTabHistory }      from "@/features/editor/hooks/useTabHistory"
import { useZoom }            from "@/features/editor/hooks/useZoom"
import { useGlobalShortcuts } from "@/features/editor/hooks/useGlobalShortcuts"
import { useResizablePanel }  from "@/features/editor/hooks/useResizablePanel"
import { useImportApproval }  from "@/features/editor/hooks/useImportApproval"

import TitleBar, { type TitleBarAction } from "@/features/editor/components/titlebar/TitleBar"
import ActivityBar                       from "@/features/editor/components/ActivityBar"
import Sidebar                           from "./Sidebar"
import SearchPanel                       from "./SearchPanel"
import ActivityLogPanel                  from "./ActivityLogPanel"
import EditorPane                        from "./EditorPane"
import StatusBar                         from "./StatusBar"
import PreferencesModal                  from "./PreferencesModal"
import ImportGitHubModal                 from "./ImportGitHubModal"
import ImportApprovalModal               from "./ImportApprovalModal"
import CollaboratorsPanel                from "./CollaboratorsPanel"
import Toast                             from "@/features/editor/components/titlebar/Toast"
import type { EditorInstance }           from "./CodeEditor"
import CommandPalette                    from "@/features/editor/components/titlebar/CommandPalette"
import QuickOpen                         from "@/features/editor/components/titlebar/QuickOpen"
import OpenRecentModal                   from "@/features/editor/components/titlebar/OpenRecentModal"

import { useRealtimeEditor }     from "@/features/editor/collaboration/useRealtimeEditor"
import { useRoomState }          from "@/features/editor/collaboration/useRoomState"
import { useActivityLog }        from "@/features/editor/activity-log/useActivityLog"
import { addRoomToHistory, type RoomHistoryEntry } from "@/shared/lib/roomHistory"
import { useCollaborationStore } from "@/shared/state/collaboration"
import { useEditorTabsStore }    from "@/shared/state/editorTabs"
import { useLayoutStore }        from "@/shared/state/layout"
import { usePreferencesStore }   from "@/shared/state/preferences"
import { useTerminalStore }      from "@/shared/state/terminal"

interface EditorLayoutProps {
  roomId?: string
  userInfo?: { userId: string; username: string } | null
}

type EditorOverlay = "command-palette" | "quick-open" | "open-recent" | null

export default function EditorLayout({ roomId, userInfo }: EditorLayoutProps) {
  // ── Store reads ─────────────────────────────────────────────────────────
  const activeFileId    = useEditorTabsStore(s => s.activeFileId)
  const openTabIds      = useEditorTabsStore(s => s.openTabIds)
  const unsavedIds      = useEditorTabsStore(s => s.unsavedIds)
  const inlineCreate    = useEditorTabsStore(s => s.inlineCreate)
  const loadingFileId   = useEditorTabsStore(s => s.loadingFileId)
  const cursorLine      = useEditorTabsStore(s => s.cursorLine)
  const cursorCol       = useEditorTabsStore(s => s.cursorCol)

  const sidebarVisible  = useLayoutStore(s => s.sidebarVisible)
  const sidebarWidth    = useLayoutStore(s => s.sidebarWidth)
  const activeSidebarView = useLayoutStore(s => s.activeSidebarView)
  const terminalVisible = useLayoutStore(s => s.terminalVisible)
  const terminalHeight  = useLayoutStore(s => s.terminalHeight)
  const githubImportOpen = useLayoutStore(s => s.githubImportOpen)

  const prefs           = usePreferencesStore(s => s.prefs)
  const prefsOpen       = usePreferencesStore(s => s.prefsOpen)

  const connectionStatus = useCollaborationStore(s => s.connectionStatus)

  // ── Hooks ───────────────────────────────────────────────────────────────
  const router = useRouter()
  const [overlay, setOverlay] = useState<EditorOverlay>(null)
  const { zoom, zoomIn, zoomOut, zoomReset } = useZoom()
  const { setEditor, getValue, actions: editorActions } = useEditorActions()
  const tabHistory = useTabHistory()
  const nodeMapRef = useRef<Map<string, FileNode>>(new Map())

  // ── CRDT Collaboration ────────────────────────────────────────────────
  const crdtEnabled = !!roomId && !!userInfo

  // ── Record room visit in history ──────────────────────────────────────
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
    activeFile: activeFileId
      ? { id: activeFileId, name: activeFileId.split("/").pop() ?? activeFileId }
      : null,
    cursorPosition: activeFileId
      ? { lineNumber: cursorLine, column: cursorCol }
      : null,
  })

  const nodeMap = useMemo(() => {
    const map = new Map<string, FileNode>()
    const collect = (nodes: FileNode[]) => {
      for (const node of nodes) {
        map.set(node.id, node)
        if (node.children) collect(node.children)
      }
    }
    collect(tree)
    return map
  }, [tree])

  useEffect(() => {
    nodeMapRef.current = nodeMap
  }, [nodeMap])

  const activeFile = activeFileId ? nodeMap.get(activeFileId) ?? null : null

  const openTabs = useMemo(
    () =>
      openTabIds.filter((id) => nodeMap.has(id)).map((id) => nodeMap.get(id) as FileNode),
    [nodeMap, openTabIds]
  )

  useEffect(() => {
    const tabs = useEditorTabsStore.getState()
    const validOpenTabIds = tabs.openTabIds.filter((id) => nodeMap.has(id))

    if (validOpenTabIds.length !== tabs.openTabIds.length) {
      tabs.setOpenTabIds(validOpenTabIds)
    }

    if (tabs.activeFileId && !nodeMap.has(tabs.activeFileId)) {
      tabs.setActiveFileId(validOpenTabIds[validOpenTabIds.length - 1] ?? null)
    }
  }, [nodeMap])

  // Per-file content CRDT
  const fileRoomId = useMemo(
    () => (crdtEnabled && activeFileId ? `${roomId}:${activeFileId}` : null),
    [activeFileId, crdtEnabled, roomId]
  )

  const { bindEditor } = useRealtimeEditor({
    roomId: fileRoomId,
    userInfo: userInfo ?? null,
    initialContent: activeFile?.content,
  })

  // ── Activity Log ────────────────────────────────────────────────────────
  const { logActivity, undoEntry, loadMore: loadMoreActivities } = useActivityLog({
    roomId: roomId ?? null,
    userInfo: userInfo ?? null,
    syncTree,
  })

  const quickOpenFiles = useMemo(() => flatFiles(tree), [tree])

  // ── Import approval flow ──────────────────────────────────────────────
  const {
    approvalModalData, importToast, clearImportToast,
    handleGitHubImport: onGitHubImport,
    handleApproveImport, handleRejectImport,
  } = useImportApproval({
    providerRef, crdtEnabled, isCreator, userInfo: userInfo ?? null,
    importProject, connectionStatus,
  })

  // ── Resizable panels ─────────────────────────────────────────────────
  const sidebarResize = useResizablePanel({
    axis: "horizontal",
    size: sidebarWidth,
    setSize: useLayoutStore.getState().setSidebarWidth,
    min: 160, max: 500,
  })
  const terminalResize = useResizablePanel({
    axis: "vertical",
    size: terminalHeight,
    setSize: useLayoutStore.getState().setTerminalHeight,
    min: 80, max: 600,
  })

  // ── Monaco mount + cursor tracking + edit activity logging ──────────────
  const handleEditorMount = useCallback((editor: EditorInstance) => {
    setEditor(editor)
    editor.onDidChangeCursorPosition(e => {
      useEditorTabsStore.getState().setCursorPosition(
        e.position.lineNumber,
        e.position.column
      )
    })

    // Log edit activities
    editor.onDidChangeModelContent(e => {
      const fileId = useEditorTabsStore.getState().activeFileId
      const file = fileId ? nodeMapRef.current.get(fileId) ?? null : null
      if (!file) return
      for (const change of e.changes) {
        logActivity(
          "edit",
          file.id,
          file.name,
          change.range.startLineNumber,
        )
      }
    })

    if (crdtEnabled) {
      bindEditor(editor)
    }
  }, [setEditor, crdtEnabled, bindEditor, logActivity])

  // ── Content change → mark dirty ───────────────────────────────────────
  const handleContentChange = useCallback((value: string) => {
    const fileId = useEditorTabsStore.getState().activeFileId
    if (!fileId) return
    useEditorTabsStore.getState().markDirty(fileId)
    setTreeLocal(t => updateContent(t, fileId, value))
  }, [setTreeLocal])

  // ── File selection ────────────────────────────────────────────────────
  const selectFile = useCallback((node: FileNode) => {
    const tabs = useEditorTabsStore.getState()
    tabs.setActiveFileId(node.id)
    tabs.addTabId(node.id)
    tabHistory.push(node.id)

    // Log file selection
    logActivity("select-file", node.id, node.name)

    // Lazy-load content for GitHub-imported files
    if (node.githubPath && node.content === undefined && githubRepo) {
      tabs.setLoadingFileId(node.id)
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
        })
        .catch(err => {
          const errorMsg = `// Error loading file: ${(err as Error).message}\n// Path: ${node.githubPath}`
          setTreeLocal(t => updateContent(t, node.id, errorMsg))
        })
        .finally(() => {
          const current = useEditorTabsStore.getState()
          if (current.loadingFileId === node.id) {
            current.setLoadingFileId(null)
          }
        })
    }
  }, [tabHistory, githubRepo, setTreeLocal, logActivity])

  // ── Close tab ─────────────────────────────────────────────────────────
  const closeTab = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    useEditorTabsStore.getState().removeTab(id)
    tabHistory.removeId(id)
  }, [tabHistory])

  const openSearchResult = useCallback((node: FileNode, lineNumber?: number) => {
    selectFile(node)
    if (lineNumber) {
      window.setTimeout(() => {
        editorActions.revealLine(lineNumber)
      }, 60)
    }
  }, [editorActions, selectFile])

  // ── Create node ───────────────────────────────────────────────────────
  const confirmCreate = useCallback((parentId: string | null, name: string, type: "file" | "folder") => {
    const id = fileIdFromPath(parentId, name)
    const node: FileNode = {
      id, name, type,
      ...(type === "file"
        ? { content: `// ${name}\n`, language: getLanguage(name) }
        : { children: [], isOpen: true }),
    }
    syncTree(t => addNode(t, parentId, node))
    useEditorTabsStore.getState().setInlineCreate(null)

    // Log file/folder creation
    logActivity(
      type === "file" ? "create-file" : "create-folder",
      id,
      name,
      undefined,
      { type: "create", filePath: id, fileType: type, parentId, language: type === "file" ? getLanguage(name) : undefined }
    )

    if (type === "file") setTimeout(() => selectFile(node), 50)
  }, [selectFile, syncTree, logActivity])

  // ── Delete node ───────────────────────────────────────────────────────
  const handleDelete = useCallback((id: string) => {
    // Capture node info before deletion for undo support
    const node = findNodeById(tree, id)
    const parentId = getParentId(id)

    syncTree(t => deleteNode(t, id))
    closeTab(id)

    // Log deletion with content for undo
    if (node) {
      logActivity(
        node.type === "file" ? "delete-file" : "delete-folder",
        id,
        node.name,
        undefined,
        {
          type: "delete",
          filePath: id,
          fileType: node.type,
          fileContent: node.content,
          parentId,
          language: node.language,
        }
      )
    }
  }, [closeTab, syncTree, tree, logActivity])

  // ── Save file ─────────────────────────────────────────────────────────
  const saveFile = useCallback((fileId?: string) => {
    const tabs = useEditorTabsStore.getState()
    const id = fileId ?? tabs.activeFileId
    if (!id) return
    const { formatOnSave } = usePreferencesStore.getState().prefs
    if (formatOnSave) editorActions.formatDoc()
    tabs.markClean(id)
  }, [editorActions])

  const saveAll = useCallback(() => {
    const { formatOnSave } = usePreferencesStore.getState().prefs
    if (formatOnSave) editorActions.formatDoc()
    useEditorTabsStore.getState().clearAllDirty()
  }, [editorActions])

  // ── Save As (download) ────────────────────────────────────────────────
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

  // ── GitHub import wrapper (close modal + delegate) ────────────────────
  const handleGitHubImport = useCallback((
    importedTree: FileNode[],
    meta: { owner: string; repo: string; branch: string }
  ) => {
    useLayoutStore.getState().setGithubImportOpen(false)
    onGitHubImport(importedTree, meta)
  }, [onGitHubImport])

  const handleOpenRecent = useCallback((entry: RoomHistoryEntry) => {
    addRoomToHistory(entry.roomId, entry.name)
    router.push(`/editor/${entry.roomId}`)
  }, [router])

  const handleReconnectCollaboration = useCallback(() => {
    providerRef.current?.connect()
  }, [providerRef])

  const runInTerminal = useCallback((command: string) => {
    useLayoutStore.getState().setTerminalVisible(true)
    useTerminalStore.getState().executeCommand(command)
  }, [])

  // ── Main action handler ───────────────────────────────────────────────
  const handleAction = useCallback((action: TitleBarAction) => {
    const tabs = useEditorTabsStore.getState()
    const layout = useLayoutStore.getState()

    switch (action) {
      // ── File ──────────────────────────────────────────────────────────
      case "new-file":          tabs.setInlineCreate({ parentId: null, type: "file" });   break
      case "new-folder":        tabs.setInlineCreate({ parentId: null, type: "folder" }); break
      case "save":              saveFile();      break
      case "save-all":          saveAll();       break
      case "save-as":           saveAs();        break
      case "close-editor":      if (tabs.activeFileId) closeTab(tabs.activeFileId); break
      case "close-all-editors": tabs.closeAllTabs(); break
      case "preferences":       usePreferencesStore.getState().openPrefs(); break
      case "open-recent":       setOverlay("open-recent"); break
      case "import-github":     layout.setGithubImportOpen(true); break

      // ── Edit — delegated to Monaco ────────────────────────────────────
      case "undo":              editorActions.undo();          break
      case "redo":              editorActions.redo();          break
      case "cut":               editorActions.trigger("editor.action.clipboardCutAction");  break
      case "copy":              editorActions.trigger("editor.action.clipboardCopyAction"); break
      case "paste":             editorActions.trigger("editor.action.clipboardPasteAction"); break
      case "select-all":        editorActions.selectAll();     break
      case "find":              editorActions.find();          break
      case "replace":           editorActions.replace();       break
      case "format-document":   editorActions.formatDoc();     break
      case "toggle-comment":    editorActions.toggleComment(); break

      // ── View ──────────────────────────────────────────────────────────
      case "command-palette":   setOverlay("command-palette"); break
      case "toggle-sidebar":
      case "toggle-explorer":   layout.toggleSidebar();   break
      case "toggle-search-panel": layout.setActiveSidebarView("search"); break
      case "toggle-terminal":   layout.toggleTerminal();  break
      case "toggle-activity-log": layout.setActiveSidebarView("activity-log"); break
      case "toggle-panel-layout": break
      case "zoom-in":           zoomIn();   break
      case "zoom-out":          zoomOut();  break
      case "zoom-reset":        zoomReset(); break

      // ── Go ────────────────────────────────────────────────────────────
      case "go-back":           tabHistory.back(tabs.openTabIds, tabs.setActiveFileId); break
      case "go-forward":        tabHistory.forward(tabs.openTabIds, tabs.setActiveFileId); break
      case "go-to-file":        setOverlay("quick-open");      break
      case "go-to-line":        editorActions.goToLine();      break
      case "go-to-symbol":      editorActions.goToSymbol();    break
      case "go-to-definition":  editorActions.goToDefinition();break

      // ── Run ───────────────────────────────────────────────────────────
      case "start-debug":       layout.startDebug();  break
      case "run-without-debug": layout.startDebug();  break
      case "stop-debug":        layout.stopDebug();   break
      case "restart-debug":     layout.stopDebug(); setTimeout(() => useLayoutStore.getState().startDebug(), 200); break
      case "toggle-breakpoint": editorActions.toggleBreak(); break
      case "run-build-task": {
        const command = getBuildTaskCommand(tree)
        runInTerminal(command ?? "echo No build task configured for this project")
        break
      }

      // ── Terminal ──────────────────────────────────────────────────────
      case "new-terminal":      useTerminalStore.getState().resetSession(); layout.setTerminalVisible(true); break
      case "split-terminal":    layout.setTerminalVisible(true);  break
      case "kill-terminal":     layout.setTerminalVisible(false); break
      case "run-active-file": {
        const command = activeFile ? getRunCommandForFile(activeFile) : null
        runInTerminal(command ?? `echo No runner configured for ${activeFile?.name ?? "the current file"}`)
        break
      }

      // ── Misc ──────────────────────────────────────────────────────────
      case "notifications": break
    }
  }, [activeFile, closeTab, editorActions, runInTerminal, saveAll, saveAs, saveFile, tabHistory, tree, zoomIn, zoomOut, zoomReset])

  // ── Global keyboard shortcuts ─────────────────────────────────────────
  useGlobalShortcuts({ onAction: handleAction })

  // ── Breadcrumb ────────────────────────────────────────────────────────
  const breadcrumb = activeFile
    ? getBreadcrumb(tree, activeFile.id) ?? [activeFile.name]
    : []

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden ui-font" style={{ background: "#060c18", color: "#c8d6e5" }}>

      <TitleBar
        activeFileName={activeFile?.name ?? null}
        hasOpenTabs={openTabIds.length > 0}
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
          {sidebarVisible && activeSidebarView === "files" && (
            <Sidebar
              tree={tree}
              activeFileId={activeFile?.id ?? null}
              sidebarWidth={sidebarWidth}
              inlineCreate={inlineCreate}
              setInlineCreate={useEditorTabsStore.getState().setInlineCreate}
              onSelect={selectFile}
              onToggle={id => setTreeLocal(t => toggleFolder(t, id))}
              onDelete={handleDelete}
              onAddChild={(parentId, type) => useEditorTabsStore.getState().setInlineCreate({ parentId, type })}
              onConfirmCreate={confirmCreate}
            />
          )}
          {sidebarVisible && activeSidebarView === "search" && (
            <SearchPanel
              tree={tree}
              sidebarWidth={sidebarWidth}
              onSelectResult={openSearchResult}
            />
          )}
          {sidebarVisible && activeSidebarView === "activity-log" && (
            <ActivityLogPanel
              sidebarWidth={sidebarWidth}
              onUndoEntry={undoEntry}
              onLoadMore={loadMoreActivities}
            />
          )}
        </div>

        {/* Sidebar resize handle */}
        {sidebarVisible && (
          <div
            className={`relative shrink-0 resize-handle ${sidebarResize.isDragging ? "dragging" : ""}`}
            style={{ width: 3, background: sidebarResize.isDragging ? "rgba(61,90,254,0.3)" : "transparent", cursor: "col-resize" }}
            onMouseDown={sidebarResize.onResizeDown}
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
          onTerminalResizeStart={terminalResize.onResizeDown}
        />
      </div>

      <StatusBar
        activeFile={activeFile}
        zoom={zoom}
        isRoomCreator={crdtEnabled ? isCreator : undefined}
        roomId={roomId}
        onAction={a => handleAction(a as TitleBarAction)}
      />

      {/* Collaborators floating panel */}
      {crdtEnabled && (
        <CollaboratorsPanel
          roomCreatorId={roomCreatorId}
          isRoomCreator={isCreator}
          userInfo={userInfo ?? null}
          activeFileName={activeFile?.name}
          cursorPosition={
            activeFile ? { lineNumber: cursorLine, column: cursorCol } : null
          }
          onReconnect={handleReconnectCollaboration}
        />
      )}

      {/* Preferences modal */}
      {prefsOpen && (
        <PreferencesModal />
      )}

      {overlay === "command-palette" && (
        <CommandPalette
          onAction={handleAction}
          onClose={() => setOverlay(null)}
        />
      )}

      {overlay === "quick-open" && (
        <QuickOpen
          files={quickOpenFiles}
          onSelect={selectFile}
          onClose={() => setOverlay(null)}
        />
      )}

      {overlay === "open-recent" && (
        <OpenRecentModal
          onSelect={handleOpenRecent}
          onClose={() => setOverlay(null)}
        />
      )}

      {/* GitHub import modal */}
      {githubImportOpen && (
        <ImportGitHubModal
          onImport={handleGitHubImport}
          onClose={() => useLayoutStore.getState().setGithubImportOpen(false)}
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
        <Toast message={importToast} onDone={clearImportToast} />
      )}
    </div>
  )
}

// ── Pure helper: update content of a node in the tree ────────────────────────
function updateContent(nodes: FileNode[], id: string, content: string): FileNode[] {
  return nodes.map(n => {
    if (n.id === id) return { ...n, content }
    if (n.children) return { ...n, children: updateContent(n.children, id, content) }
    return n
  })
}

function getBuildTaskCommand(tree: FileNode[]): string | null {
  const names = new Set(flatFiles(tree).map(({ node }) => node.name.toLowerCase()))

  if (names.has("package.json")) return "npm run build"
  if (names.has("cargo.toml")) return "cargo build"
  if (names.has("go.mod")) return "go build"

  return null
}

function getRunCommandForFile(file: FileNode): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase()

  switch (ext) {
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return `node ${file.name}`
    case "ts":
    case "tsx":
      return `tsx ${file.name}`
    case "py":
      return `python ${file.name}`
    case "sh":
      return `sh ${file.name}`
    case "php":
      return `php ${file.name}`
    default:
      return null
  }
}

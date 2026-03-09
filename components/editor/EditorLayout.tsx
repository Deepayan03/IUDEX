"use client"

import { useEffect, useCallback, useMemo } from "react"

import type { FileNode } from "./types"
import { fileIdFromPath, getLanguage, addNode, toggleFolder, deleteNode, getBreadcrumb } from "./utils"
import { INITIAL_TREE }                              from "./initialTree"
import "./editorStyles.css"

import { useEditorActions }   from "./hooks/UserEditorActions"
import { useTabHistory }      from "./hooks/UserTabHistory"
import { useZoom }            from "./hooks/Usezoom"
import { useGlobalShortcuts } from "./hooks/UseGlobalShortcuts"
import { useResizablePanel }  from "./hooks/useResizablePanel"
import { useImportApproval }  from "./hooks/useImportApproval"

import TitleBar, { type TitleBarAction } from "./titlebar/Titlebar"
import ActivityBar                       from "./Activitybar"
import Sidebar                           from "./Sidebar"
import EditorPane                        from "./Editorpane"
import StatusBar                         from "./Statusbar"
import PreferencesModal                  from "./PreferencesModal"
import ImportGitHubModal                 from "./ImportGitHubModal"
import ImportApprovalModal               from "./ImportApprovalModal"
import CollaboratorsPanel                from "./CollaboratorsPanel"
import Toast                             from "./titlebar/Toast"
import type { EditorInstance }           from "./CodeEditor"

import { useRealtimeEditor }     from "@/lib/yjs/useRealtimeEditor"
import { useRoomState }          from "@/lib/yjs/useRoomState"
import { addRoomToHistory }      from "@/lib/roomHistory"
import { useCollaborationStore } from "@/store/collaboration"
import { useEditorTabsStore }    from "@/store/editorTabs"
import { useLayoutStore }        from "@/store/layout"
import { usePreferencesStore }   from "@/store/preferences"

interface EditorLayoutProps {
  roomId?: string
  userInfo?: { userId: string; username: string } | null
}

export default function EditorLayout({ roomId, userInfo }: EditorLayoutProps) {
  // ── Store reads ─────────────────────────────────────────────────────────
  const activeFile      = useEditorTabsStore(s => s.activeFile)
  const openTabs        = useEditorTabsStore(s => s.openTabs)
  const unsavedIds      = useEditorTabsStore(s => s.unsavedIds)
  const inlineCreate    = useEditorTabsStore(s => s.inlineCreate)
  const loadingFileId   = useEditorTabsStore(s => s.loadingFileId)

  const sidebarVisible  = useLayoutStore(s => s.sidebarVisible)
  const sidebarWidth    = useLayoutStore(s => s.sidebarWidth)
  const terminalVisible = useLayoutStore(s => s.terminalVisible)
  const terminalHeight  = useLayoutStore(s => s.terminalHeight)
  const githubImportOpen = useLayoutStore(s => s.githubImportOpen)

  const prefs           = usePreferencesStore(s => s.prefs)
  const prefsOpen       = usePreferencesStore(s => s.prefsOpen)

  const connectionStatus = useCollaborationStore(s => s.connectionStatus)

  // ── Hooks ───────────────────────────────────────────────────────────────
  const { zoom, zoomIn, zoomOut, zoomReset } = useZoom()
  const { setEditor, getValue, actions: editorActions } = useEditorActions()
  const tabHistory = useTabHistory()

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

  // ── Monaco mount + cursor tracking ────────────────────────────────────
  const handleEditorMount = useCallback((editor: EditorInstance) => {
    setEditor(editor)
    editor.onDidChangeCursorPosition(e => {
      useEditorTabsStore.getState().setCursorPosition(
        e.position.lineNumber,
        e.position.column
      )
    })
    if (crdtEnabled) {
      bindEditor(editor)
    }
  }, [setEditor, crdtEnabled, bindEditor])

  // ── Content change → mark dirty ───────────────────────────────────────
  const handleContentChange = useCallback((value: string) => {
    const file = useEditorTabsStore.getState().activeFile
    if (!file) return
    useEditorTabsStore.getState().markDirty(file.id)
    setTreeLocal(t => updateContent(t, file.id, value))
  }, [setTreeLocal])

  // ── File selection ────────────────────────────────────────────────────
  const selectFile = useCallback((node: FileNode) => {
    const tabs = useEditorTabsStore.getState()
    tabs.setActiveFile(node)
    tabs.addTab(node)
    tabHistory.push(node.id)

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
          const current = useEditorTabsStore.getState()
          if (current.activeFile?.id === node.id) {
            current.setActiveFile({ ...current.activeFile, content })
          }
          current.setOpenTabs(prev =>
            prev.map(t => t.id === node.id ? { ...t, content } : t)
          )
        })
        .catch(err => {
          const errorMsg = `// Error loading file: ${(err as Error).message}\n// Path: ${node.githubPath}`
          setTreeLocal(t => updateContent(t, node.id, errorMsg))
          const current = useEditorTabsStore.getState()
          if (current.activeFile?.id === node.id) {
            current.setActiveFile({ ...current.activeFile, content: errorMsg })
          }
        })
        .finally(() => {
          const current = useEditorTabsStore.getState()
          if (current.loadingFileId === node.id) {
            current.setLoadingFileId(null)
          }
        })
    }
  }, [tabHistory, githubRepo, setTreeLocal])

  // ── Close tab ─────────────────────────────────────────────────────────
  const closeTab = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    useEditorTabsStore.getState().removeTab(id)
    tabHistory.removeId(id)
  }, [tabHistory])

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
    if (type === "file") setTimeout(() => selectFile(node), 50)
  }, [selectFile, syncTree])

  // ── Delete node ───────────────────────────────────────────────────────
  const handleDelete = useCallback((id: string) => {
    syncTree(t => deleteNode(t, id))
    closeTab(id)
  }, [closeTab, syncTree])

  // ── Save file ─────────────────────────────────────────────────────────
  const saveFile = useCallback((fileId?: string) => {
    const tabs = useEditorTabsStore.getState()
    const id = fileId ?? tabs.activeFile?.id
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
    const file = useEditorTabsStore.getState().activeFile
    if (!file) return
    const content = getValue()
    const blob = new Blob([content], { type: "text/plain" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href     = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
    saveFile()
  }, [getValue, saveFile])

  // ── GitHub import wrapper (close modal + delegate) ────────────────────
  const handleGitHubImport = useCallback((
    importedTree: FileNode[],
    meta: { owner: string; repo: string; branch: string }
  ) => {
    useLayoutStore.getState().setGithubImportOpen(false)
    onGitHubImport(importedTree, meta)
  }, [onGitHubImport])

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
      case "close-editor":      if (tabs.activeFile) closeTab(tabs.activeFile.id); break
      case "close-all-editors": tabs.closeAllTabs(); break
      case "preferences":       usePreferencesStore.getState().openPrefs(); break
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
      case "command-palette":   break
      case "toggle-sidebar":
      case "toggle-explorer":   layout.toggleSidebar();   break
      case "toggle-terminal":   layout.toggleTerminal();  break
      case "toggle-panel-layout": break
      case "zoom-in":           zoomIn();   break
      case "zoom-out":          zoomOut();  break
      case "zoom-reset":        zoomReset(); break

      // ── Go ────────────────────────────────────────────────────────────
      case "go-back":           tabHistory.back(tabs.openTabs, node => { tabs.setActiveFile(node) }); break
      case "go-forward":        tabHistory.forward(tabs.openTabs, node => { tabs.setActiveFile(node) }); break
      case "go-to-file":        editorActions.find();          break
      case "go-to-line":        editorActions.goToLine();      break
      case "go-to-symbol":      editorActions.goToSymbol();    break
      case "go-to-definition":  editorActions.goToDefinition();break

      // ── Run ───────────────────────────────────────────────────────────
      case "start-debug":       layout.startDebug();  break
      case "run-without-debug": layout.startDebug();  break
      case "stop-debug":        layout.stopDebug();   break
      case "restart-debug":     layout.stopDebug(); setTimeout(() => useLayoutStore.getState().startDebug(), 200); break
      case "toggle-breakpoint": editorActions.toggleBreak(); break
      case "run-build-task":    layout.setTerminalVisible(true); break

      // ── Terminal ──────────────────────────────────────────────────────
      case "new-terminal":
      case "split-terminal":    layout.setTerminalVisible(true);  break
      case "kill-terminal":     layout.setTerminalVisible(false); break
      case "run-active-file":   layout.setTerminalVisible(true);  break

      // ── Misc ──────────────────────────────────────────────────────────
      case "notifications": break
      case "open-recent":   break
    }
  }, [saveFile, saveAll, saveAs, closeTab, editorActions, tabHistory, zoomIn, zoomOut, zoomReset])

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
              setInlineCreate={useEditorTabsStore.getState().setInlineCreate}
              onSelect={selectFile}
              onToggle={id => setTreeLocal(t => toggleFolder(t, id))}
              onDelete={handleDelete}
              onAddChild={(parentId, type) => useEditorTabsStore.getState().setInlineCreate({ parentId, type })}
              onConfirmCreate={confirmCreate}
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
        />
      )}

      {/* Preferences modal */}
      {prefsOpen && (
        <PreferencesModal />
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

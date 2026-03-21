"use client";

import { useEffect, useCallback, useMemo } from "react";

import type { FileNode } from "@/features/editor/lib/types";
import { logEditorFlow } from "@/features/editor/lib/debug";
import {
  toggleFolder,
} from "@/features/editor/lib/utils";
import { INITIAL_TREE } from "@/features/editor/lib/initialTree";
import "@/features/editor/styles/editor.css";

import { useEditorActions } from "@/features/editor/hooks/useEditorActions";
import { useEditorCommandHandlers } from "@/features/editor/hooks/useEditorCommandHandlers";
import { useEditorFileManager } from "@/features/editor/hooks/useEditorFileManager";
import { useTabHistory } from "@/features/editor/hooks/useTabHistory";
import { useZoom } from "@/features/editor/hooks/useZoom";
import { useGlobalShortcuts } from "@/features/editor/hooks/useGlobalShortcuts";
import { useResizablePanel } from "@/features/editor/hooks/useResizablePanel";
import { useImportApproval } from "@/features/editor/hooks/useImportApproval";

import type { EditorInstance } from "./CodeEditor";
import EditorOverlays from "@/features/editor/components/EditorOverlays";
import EditorWorkbench from "@/features/editor/components/EditorWorkbench";

import { useRealtimeEditor } from "@/features/editor/collaboration/useRealtimeEditor";
import { useRoomState } from "@/features/editor/collaboration/useRoomState";
import { useActivityLog } from "@/features/editor/activity-log/useActivityLog";
import { buildFileRealtimeRoomId } from "@/features/editor/collaboration/shared";
import { addRoomToHistory } from "@/shared/lib/roomHistory";
import { useCollaborationStore } from "@/shared/state/collaboration";
import { useEditorTabsStore } from "@/shared/state/editorTabs";
import { useLayoutStore } from "@/shared/state/layout";
import { usePreferencesStore } from "@/shared/state/preferences";

interface EditorLayoutProps {
  roomId?: string;
  userInfo?: { userId: string; username: string } | null;
}

export default function EditorLayout({ roomId, userInfo }: EditorLayoutProps) {
  const activeFileId = useEditorTabsStore((s) => s.activeFileId);
  const openTabIds = useEditorTabsStore((s) => s.openTabIds);
  const unsavedIds = useEditorTabsStore((s) => s.unsavedIds);
  const inlineCreate = useEditorTabsStore((s) => s.inlineCreate);
  const loadingFileId = useEditorTabsStore((s) => s.loadingFileId);
  const cursorLine = useEditorTabsStore((s) => s.cursorLine);
  const cursorCol = useEditorTabsStore((s) => s.cursorCol);

  const sidebarVisible = useLayoutStore((s) => s.sidebarVisible);
  const sidebarWidth = useLayoutStore((s) => s.sidebarWidth);
  const activeSidebarView = useLayoutStore((s) => s.activeSidebarView);
  const terminalVisible = useLayoutStore((s) => s.terminalVisible);
  const terminalHeight = useLayoutStore((s) => s.terminalHeight);
  const githubImportOpen = useLayoutStore((s) => s.githubImportOpen);

  const prefs = usePreferencesStore((s) => s.prefs);
  const prefsOpen = usePreferencesStore((s) => s.prefsOpen);

  const connectionStatus = useCollaborationStore((s) => s.connectionStatus);

  const { zoom, zoomIn, zoomOut, zoomReset } = useZoom();
  const { setEditor, getValue, actions: editorActions } = useEditorActions();
  const tabHistory = useTabHistory();
  const crdtEnabled = !!roomId && !!userInfo;

  useEffect(() => {
    if (roomId) addRoomToHistory(roomId);
  }, [roomId]);

  const {
    tree,
    githubRepo,
    isImportedProjectReady,
    setTreeLocal,
    syncTree,
    importProject,
    roomConnectionStatus,
    isCreator,
    roomCreatorId,
    providerRef,
    metaDocRef,
  } = useRoomState({
    roomId: crdtEnabled ? roomId! : null,
    userInfo: userInfo ?? null,
    initialTree: INITIAL_TREE,
    activeFile: activeFileId
      ? {
          id: activeFileId,
          name: activeFileId.split("/").pop() ?? activeFileId,
        }
      : null,
    cursorPosition: activeFileId
      ? { lineNumber: cursorLine, column: cursorCol }
      : null,
  });

  const {
    logActivity,
    undoEntry,
    loadMore: loadMoreActivities,
  } = useActivityLog({
    roomId: crdtEnabled ? roomId! : null,
    userInfo: userInfo ?? null,
    syncTree,
    metaDocRef,
    roomConnectionStatus,
  });

  const {
    nodeMapRef,
    activeFile,
    openTabs,
    quickOpenFiles,
    breadcrumb,
    editorPaneKey,
    pendingLoadFileId,
    selectFile,
    closeTab,
    confirmCreate,
    handleDelete,
    handleContentChange,
  } = useEditorFileManager({
    tree,
    githubRepo,
    isImportedProjectReady,
    activeFileId,
    openTabIds,
    setTreeLocal,
    syncTree,
    logActivity,
    tabHistory,
  });

  const shouldOpenRealtimeDoc =
    crdtEnabled &&
    !!activeFileId &&
    !!activeFile &&
    (!activeFile.githubPath ||
      activeFile.content !== undefined ||
      isImportedProjectReady);

  const fileRoomId = useMemo(
    () =>
      shouldOpenRealtimeDoc && activeFileId && roomId
        ? buildFileRealtimeRoomId(roomId, activeFileId)
        : null,
    [activeFileId, roomId, shouldOpenRealtimeDoc],
  );

  const activeFileSourceState =
    activeFile?.githubPath && activeFile.content === undefined
      ? pendingLoadFileId === activeFile.id &&
        (!githubRepo || !isImportedProjectReady)
        ? "waiting-for-repo"
        : loadingFileId === activeFile.id
          ? "loading-content"
          : null
      : null;

  const { bindEditor, isDocumentReady } = useRealtimeEditor({
    roomId: fileRoomId,
    userInfo: userInfo ?? null,
    initialContent: activeFile?.content,
  });

  useEffect(() => {
    if (!activeFileId) return;

    logEditorFlow("editor-layout", "active-file:state", {
      activeFileId,
      fileName: activeFile?.name ?? null,
      hasContent: activeFile?.content !== undefined,
      contentLength: activeFile?.content?.length ?? 0,
      hasGithubPath: !!activeFile?.githubPath,
      sourceState: activeFileSourceState,
      fileRoomId,
      isDocumentReady,
    });
  }, [
    activeFileId,
    activeFile?.content,
    activeFile?.githubPath,
    activeFile?.name,
    activeFileSourceState,
    fileRoomId,
    isDocumentReady,
  ]);

  const {
    approvalModalData,
    importToast,
    clearImportToast,
    handleGitHubImport: onGitHubImport,
    handleApproveImport,
    handleRejectImport,
  } = useImportApproval({
    providerRef,
    crdtEnabled,
    isCreator,
    userInfo: userInfo ?? null,
    importProject,
    connectionStatus,
  });

  const sidebarResize = useResizablePanel({
    axis: "horizontal",
    size: sidebarWidth,
    setSize: useLayoutStore.getState().setSidebarWidth,
    min: 160,
    max: 500,
  });
  const terminalResize = useResizablePanel({
    axis: "vertical",
    size: terminalHeight,
    setSize: useLayoutStore.getState().setTerminalHeight,
    min: 80,
    max: 600,
  });

  const handleEditorMount = useCallback(
    (editor: EditorInstance) => {
      setEditor(editor);
      editor.onDidChangeCursorPosition((e) => {
        useEditorTabsStore
          .getState()
          .setCursorPosition(e.position.lineNumber, e.position.column);
      });

      // Log edit activities
      editor.onDidChangeModelContent((e) => {
        const fileId = useEditorTabsStore.getState().activeFileId;
        const file = fileId ? (nodeMapRef.current.get(fileId) ?? null) : null;
        if (!file) return;
        for (const change of e.changes) {
          logActivity("edit", file.id, file.name, change.range.startLineNumber);
        }
      });

      if (crdtEnabled) {
        bindEditor(editor);
      }
    },
    [setEditor, crdtEnabled, bindEditor, logActivity, nodeMapRef],
  );

  const openSearchResult = useCallback(
    (node: FileNode, lineNumber?: number) => {
      selectFile(node);
      if (lineNumber) {
        setTimeout(() => {
          editorActions.revealLine(lineNumber);
        }, 60);
      }
    },
    [editorActions, selectFile],
  );

  const {
    overlay,
    handleAction,
    handleGitHubImport,
    handleOpenRecent,
    handleReconnectCollaboration,
    closeOverlay,
  } = useEditorCommandHandlers({
    activeFile,
    tree,
    providerRef,
    onGitHubImport,
    editorActions,
    getValue,
    closeTab: (id) => closeTab(id),
    tabHistory,
    zoomIn,
    zoomOut,
    zoomReset,
  });

  useGlobalShortcuts({ onAction: handleAction });

  return (
    <>
      <EditorWorkbench
        openTabCount={openTabIds.length}
        activeFile={activeFile}
        tree={tree}
        activeSidebarView={activeSidebarView}
        sidebarVisible={sidebarVisible}
        sidebarWidth={sidebarWidth}
        inlineCreate={inlineCreate}
        onSetInlineCreate={useEditorTabsStore.getState().setInlineCreate}
        onSelectFile={selectFile}
        onToggleFolder={(id) => setTreeLocal((t) => toggleFolder(t, id))}
        onDeleteNode={handleDelete}
        onAddChild={(parentId, type) =>
          useEditorTabsStore.getState().setInlineCreate({ parentId, type })
        }
        onConfirmCreate={confirmCreate}
        onOpenSearchResult={openSearchResult}
        onUndoEntry={undoEntry}
        onLoadMoreActivities={loadMoreActivities}
        onAction={handleAction}
        isSidebarResizing={sidebarResize.isDragging}
        onSidebarResizeStart={sidebarResize.onResizeDown}
        editorPaneKey={editorPaneKey}
        openTabs={openTabs}
        unsavedIds={unsavedIds}
        breadcrumb={breadcrumb}
        prefs={prefs}
        terminalVisible={terminalVisible}
        terminalHeight={terminalHeight}
        activeFileSourceState={activeFileSourceState}
        crdtEnabled={crdtEnabled}
        isDocumentReady={isDocumentReady}
        onTabClose={(id, e) => closeTab(id, e)}
        onEditorMount={handleEditorMount}
        onContentChange={handleContentChange}
        onTerminalResizeStart={terminalResize.onResizeDown}
        zoom={zoom}
        roomId={roomId}
        isCreator={isCreator}
        roomCreatorId={roomCreatorId}
        userInfo={userInfo ?? null}
        cursorPosition={
          activeFile ? { lineNumber: cursorLine, column: cursorCol } : null
        }
        onReconnect={handleReconnectCollaboration}
      />

      <EditorOverlays
        prefsOpen={prefsOpen}
        overlay={overlay}
        onCloseOverlay={closeOverlay}
        onAction={handleAction}
        quickOpenFiles={quickOpenFiles}
        onSelectFile={selectFile}
        onSelectRecent={handleOpenRecent}
        githubImportOpen={githubImportOpen}
        onImportGitHub={handleGitHubImport}
        onCloseGitHubImport={() =>
          useLayoutStore.getState().setGithubImportOpen(false)
        }
        approvalModalData={approvalModalData}
        onApproveImport={handleApproveImport}
        onRejectImport={handleRejectImport}
        importToast={importToast}
        onToastDone={clearImportToast}
      />
    </>
  );
}

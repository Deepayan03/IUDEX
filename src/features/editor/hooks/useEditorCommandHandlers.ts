"use client";

import { useCallback, useState, type MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import type { WebsocketProvider } from "y-websocket";

import type { FileNode } from "@/features/editor/lib/types";
import type { EditorOverlay, GitHubImportMeta } from "@/features/editor/lib/editorLayoutTypes";
import { getBuildTaskCommand, getRunCommandForFile } from "@/features/editor/lib/editorLayoutUtils";
import type { TitleBarAction } from "@/features/editor/components/titlebar/TitleBar";
import { addRoomToHistory, type RoomHistoryEntry } from "@/shared/lib/roomHistory";
import { useEditorTabsStore } from "@/shared/state/editorTabs";
import { useLayoutStore } from "@/shared/state/layout";
import { usePreferencesStore } from "@/shared/state/preferences";
import { useTerminalStore } from "@/shared/state/terminal";

interface EditorActionHandlers {
  undo: () => void;
  redo: () => void;
  selectAll: () => void;
  find: () => void;
  replace: () => void;
  formatDoc: () => void;
  toggleComment: () => void;
  goToLine: () => void;
  goToSymbol: () => void;
  goToDefinition: () => void;
  toggleBreak: () => void;
  trigger: (handlerId: string, payload?: unknown) => void;
}

interface TabHistoryLike {
  back: (openTabIds: string[], onSelect: (fileId: string) => void) => void;
  forward: (openTabIds: string[], onSelect: (fileId: string) => void) => void;
}

interface UseEditorCommandHandlersOptions {
  activeFile: FileNode | null;
  tree: FileNode[];
  providerRef: MutableRefObject<WebsocketProvider | null>;
  onGitHubImport: (tree: FileNode[], meta: GitHubImportMeta) => void;
  editorActions: EditorActionHandlers;
  getValue: () => string;
  closeTab: (id: string) => void;
  tabHistory: TabHistoryLike;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
}

interface UseEditorCommandHandlersReturn {
  overlay: EditorOverlay;
  handleAction: (action: TitleBarAction) => void;
  handleGitHubImport: (
    importedTree: FileNode[],
    meta: GitHubImportMeta,
  ) => void;
  handleOpenRecent: (entry: RoomHistoryEntry) => void;
  handleReconnectCollaboration: () => void;
  closeOverlay: () => void;
}

export function useEditorCommandHandlers({
  activeFile,
  tree,
  providerRef,
  onGitHubImport,
  editorActions,
  getValue,
  closeTab,
  tabHistory,
  zoomIn,
  zoomOut,
  zoomReset,
}: UseEditorCommandHandlersOptions): UseEditorCommandHandlersReturn {
  const router = useRouter();
  const [overlay, setOverlay] = useState<EditorOverlay>(null);

  const saveFile = useCallback(
    (fileId?: string) => {
      const tabs = useEditorTabsStore.getState();
      const id = fileId ?? tabs.activeFileId;
      if (!id) return;

      const { formatOnSave } = usePreferencesStore.getState().prefs;
      if (formatOnSave) editorActions.formatDoc();
      tabs.markClean(id);
    },
    [editorActions],
  );

  const saveAll = useCallback(() => {
    const { formatOnSave } = usePreferencesStore.getState().prefs;
    if (formatOnSave) editorActions.formatDoc();
    useEditorTabsStore.getState().clearAllDirty();
  }, [editorActions]);

  const saveAs = useCallback(() => {
    if (!activeFile) return;

    const content = getValue();
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = activeFile.name;
    link.click();

    URL.revokeObjectURL(url);
    saveFile();
  }, [activeFile, getValue, saveFile]);

  const runInTerminal = useCallback((command: string) => {
    useLayoutStore.getState().setTerminalVisible(true);
    useTerminalStore.getState().executeCommand(command);
  }, []);

  const handleGitHubImport = useCallback(
    (importedTree: FileNode[], meta: GitHubImportMeta) => {
      useLayoutStore.getState().setGithubImportOpen(false);
      onGitHubImport(importedTree, meta);
    },
    [onGitHubImport],
  );

  const handleOpenRecent = useCallback(
    (entry: RoomHistoryEntry) => {
      addRoomToHistory(entry.roomId, entry.name);
      router.push(`/editor/${entry.roomId}`);
    },
    [router],
  );

  const handleReconnectCollaboration = useCallback(() => {
    providerRef.current?.connect();
  }, [providerRef]);

  const handleAction = useCallback(
    (action: TitleBarAction) => {
      const tabs = useEditorTabsStore.getState();
      const layout = useLayoutStore.getState();

      switch (action) {
        case "new-file":
          tabs.setInlineCreate({ parentId: null, type: "file" });
          break;
        case "new-folder":
          tabs.setInlineCreate({ parentId: null, type: "folder" });
          break;
        case "save":
          saveFile();
          break;
        case "save-all":
          saveAll();
          break;
        case "save-as":
          saveAs();
          break;
        case "close-editor":
          if (tabs.activeFileId) closeTab(tabs.activeFileId);
          break;
        case "close-all-editors":
          tabs.closeAllTabs();
          break;
        case "preferences":
          usePreferencesStore.getState().openPrefs();
          break;
        case "open-recent":
          setOverlay("open-recent");
          break;
        case "import-github":
          layout.setGithubImportOpen(true);
          break;

        case "undo":
          editorActions.undo();
          break;
        case "redo":
          editorActions.redo();
          break;
        case "cut":
          editorActions.trigger("editor.action.clipboardCutAction");
          break;
        case "copy":
          editorActions.trigger("editor.action.clipboardCopyAction");
          break;
        case "paste":
          editorActions.trigger("editor.action.clipboardPasteAction");
          break;
        case "select-all":
          editorActions.selectAll();
          break;
        case "find":
          editorActions.find();
          break;
        case "replace":
          editorActions.replace();
          break;
        case "format-document":
          editorActions.formatDoc();
          break;
        case "toggle-comment":
          editorActions.toggleComment();
          break;

        case "command-palette":
          setOverlay("command-palette");
          break;
        case "toggle-sidebar":
        case "toggle-explorer":
          layout.toggleSidebar();
          break;
        case "toggle-search-panel":
          layout.setActiveSidebarView("search");
          break;
        case "toggle-terminal":
          layout.toggleTerminal();
          break;
        case "toggle-activity-log":
          layout.setActiveSidebarView("activity-log");
          break;
        case "toggle-panel-layout":
          break;
        case "zoom-in":
          zoomIn();
          break;
        case "zoom-out":
          zoomOut();
          break;
        case "zoom-reset":
          zoomReset();
          break;

        case "go-back":
          tabHistory.back(tabs.openTabIds, tabs.setActiveFileId);
          break;
        case "go-forward":
          tabHistory.forward(tabs.openTabIds, tabs.setActiveFileId);
          break;
        case "go-to-file":
          setOverlay("quick-open");
          break;
        case "go-to-line":
          editorActions.goToLine();
          break;
        case "go-to-symbol":
          editorActions.goToSymbol();
          break;
        case "go-to-definition":
          editorActions.goToDefinition();
          break;

        case "start-debug":
          layout.startDebug();
          break;
        case "run-without-debug":
          layout.startDebug();
          break;
        case "stop-debug":
          layout.stopDebug();
          break;
        case "restart-debug":
          layout.stopDebug();
          setTimeout(() => useLayoutStore.getState().startDebug(), 200);
          break;
        case "toggle-breakpoint":
          editorActions.toggleBreak();
          break;
        case "run-build-task": {
          const command = getBuildTaskCommand(tree);
          runInTerminal(
            command ?? "echo No build task configured for this project",
          );
          break;
        }

        case "new-terminal":
          useTerminalStore.getState().resetSession();
          layout.setTerminalVisible(true);
          break;
        case "split-terminal":
          layout.setTerminalVisible(true);
          break;
        case "kill-terminal":
          layout.setTerminalVisible(false);
          break;
        case "run-active-file": {
          const command = activeFile ? getRunCommandForFile(activeFile) : null;
          runInTerminal(
            command ??
              `echo No runner configured for ${activeFile?.name ?? "the current file"}`,
          );
          break;
        }

        case "notifications":
          break;
      }
    },
    [
      activeFile,
      closeTab,
      editorActions,
      runInTerminal,
      saveAll,
      saveAs,
      saveFile,
      tabHistory,
      tree,
      zoomIn,
      zoomOut,
      zoomReset,
    ],
  );

  const closeOverlay = useCallback(() => {
    setOverlay(null);
  }, []);

  return {
    overlay,
    handleAction,
    handleGitHubImport,
    handleOpenRecent,
    handleReconnectCollaboration,
    closeOverlay,
  };
}

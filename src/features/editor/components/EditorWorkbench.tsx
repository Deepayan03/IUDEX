"use client";

import ActivityBar from "@/features/editor/components/ActivityBar";
import ActivityLogPanel from "@/features/editor/components/ActivityLogPanel";
import CollaboratorsPanel from "@/features/editor/components/CollaboratorsPanel";
import EditorPane from "@/features/editor/components/EditorPane";
import SearchPanel from "@/features/editor/components/SearchPanel";
import Sidebar from "@/features/editor/components/Sidebar";
import StatusBar from "@/features/editor/components/StatusBar";
import TitleBar, {
  type TitleBarAction,
} from "@/features/editor/components/titlebar/TitleBar";
import type { FileNode, InlineCreate, EditorPrefs } from "@/features/editor/lib/types";
import type { EditorInstance } from "@/features/editor/components/CodeEditor";
import type { SidebarView } from "@/shared/state/layout";

interface EditorWorkbenchProps {
  openTabCount: number;
  activeFile: FileNode | null;
  tree: FileNode[];
  activeSidebarView: SidebarView;
  sidebarVisible: boolean;
  sidebarWidth: number;
  inlineCreate: InlineCreate;
  onSetInlineCreate: (value: InlineCreate) => void;
  onSelectFile: (node: FileNode) => void;
  onToggleFolder: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onAddChild: (parentId: string, type: "file" | "folder") => void;
  onConfirmCreate: (
    parentId: string | null,
    name: string,
    type: "file" | "folder",
  ) => void;
  onOpenSearchResult: (node: FileNode, lineNumber?: number) => void;
  onUndoEntry: (entryId: string) => void;
  onLoadMoreActivities: () => void;
  onAction: (action: TitleBarAction) => void;
  isSidebarResizing: boolean;
  onSidebarResizeStart: (e: React.MouseEvent) => void;
  editorPaneKey: string;
  openTabs: FileNode[];
  unsavedIds: Set<string>;
  breadcrumb: string[];
  prefs: EditorPrefs;
  terminalVisible: boolean;
  terminalHeight: number;
  activeFileSourceState: "waiting-for-repo" | "loading-content" | null;
  crdtEnabled: boolean;
  isDocumentReady: boolean;
  onTabClose: (id: string, e: React.MouseEvent) => void;
  onEditorMount: (editor: EditorInstance) => void;
  onContentChange: (value: string) => void;
  onTerminalResizeStart: (e: React.MouseEvent) => void;
  zoom: number;
  roomId?: string;
  isCreator: boolean;
  roomCreatorId: string | null;
  userInfo?: { userId: string; username: string } | null;
  cursorPosition: { lineNumber: number; column: number } | null;
  onReconnect: () => void;
}

export default function EditorWorkbench({
  openTabCount,
  activeFile,
  tree,
  activeSidebarView,
  sidebarVisible,
  sidebarWidth,
  inlineCreate,
  onSetInlineCreate,
  onSelectFile,
  onToggleFolder,
  onDeleteNode,
  onAddChild,
  onConfirmCreate,
  onOpenSearchResult,
  onUndoEntry,
  onLoadMoreActivities,
  onAction,
  isSidebarResizing,
  onSidebarResizeStart,
  editorPaneKey,
  openTabs,
  unsavedIds,
  breadcrumb,
  prefs,
  terminalVisible,
  terminalHeight,
  activeFileSourceState,
  crdtEnabled,
  isDocumentReady,
  onTabClose,
  onEditorMount,
  onContentChange,
  onTerminalResizeStart,
  zoom,
  roomId,
  isCreator,
  roomCreatorId,
  userInfo,
  cursorPosition,
  onReconnect,
}: EditorWorkbenchProps) {
  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden ui-font"
      style={{ background: "#060c18", color: "#c8d6e5" }}
    >
      <TitleBar
        activeFileName={activeFile?.name ?? null}
        hasOpenTabs={openTabCount > 0}
        onAction={onAction}
      />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <ActivityBar />

        <div
          className="flex h-full min-h-0"
          style={{
            width: sidebarVisible ? sidebarWidth : 0,
            minWidth: sidebarVisible ? sidebarWidth : 0,
            overflow: "hidden",
            flexShrink: 0,
            transition: "width 0.18s ease, min-width 0.18s ease",
          }}
        >
          {sidebarVisible && activeSidebarView === "files" && (
            <Sidebar
              tree={tree}
              activeFileId={activeFile?.id ?? null}
              sidebarWidth={sidebarWidth}
              inlineCreate={inlineCreate}
              setInlineCreate={onSetInlineCreate}
              onSelect={onSelectFile}
              onToggle={onToggleFolder}
              onDelete={onDeleteNode}
              onAddChild={onAddChild}
              onConfirmCreate={onConfirmCreate}
            />
          )}

          {sidebarVisible && activeSidebarView === "search" && (
            <SearchPanel
              tree={tree}
              sidebarWidth={sidebarWidth}
              onSelectResult={onOpenSearchResult}
            />
          )}

          {sidebarVisible && activeSidebarView === "activity-log" && (
            <ActivityLogPanel
              sidebarWidth={sidebarWidth}
              onUndoEntry={onUndoEntry}
              onLoadMore={onLoadMoreActivities}
            />
          )}
        </div>

        {sidebarVisible && (
          <div
            className={`relative shrink-0 resize-handle ${isSidebarResizing ? "dragging" : ""}`}
            style={{
              width: 3,
              background: isSidebarResizing
                ? "rgba(61,90,254,0.3)"
                : "transparent",
              cursor: "col-resize",
            }}
            onMouseDown={onSidebarResizeStart}
          />
        )}

        <EditorPane
          key={editorPaneKey}
          activeFile={activeFile}
          openTabs={openTabs}
          unsavedIds={unsavedIds}
          breadcrumb={breadcrumb}
          prefs={prefs}
          terminalVisible={terminalVisible}
          terminalHeight={terminalHeight}
          activeFileSourceState={activeFileSourceState}
          crdtMode={crdtEnabled}
          crdtPending={crdtEnabled && !!activeFile && !isDocumentReady}
          onAction={onAction}
          onTabClick={onSelectFile}
          onTabClose={onTabClose}
          onEditorMount={onEditorMount}
          onContentChange={onContentChange}
          onTerminalResizeStart={onTerminalResizeStart}
        />
      </div>

      <StatusBar
        activeFile={activeFile}
        zoom={zoom}
        isRoomCreator={crdtEnabled ? isCreator : undefined}
        roomId={roomId}
        onAction={(action) => onAction(action as TitleBarAction)}
      />

      {crdtEnabled && (
        <CollaboratorsPanel
          roomCreatorId={roomCreatorId}
          isRoomCreator={isCreator}
          userInfo={userInfo ?? null}
          activeFileName={activeFile?.name}
          cursorPosition={cursorPosition}
          onReconnect={onReconnect}
        />
      )}
    </div>
  );
}

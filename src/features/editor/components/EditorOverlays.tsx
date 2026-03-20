"use client";

import CommandPalette from "@/features/editor/components/titlebar/CommandPalette";
import OpenRecentModal from "@/features/editor/components/titlebar/OpenRecentModal";
import QuickOpen from "@/features/editor/components/titlebar/QuickOpen";
import ImportApprovalModal, {
  type ImportRequestData,
} from "@/features/editor/components/ImportApprovalModal";
import ImportGitHubModal from "@/features/editor/components/ImportGitHubModal";
import PreferencesModal from "@/features/editor/components/PreferencesModal";
import Toast from "@/features/editor/components/titlebar/Toast";
import type { FileNode } from "@/features/editor/lib/types";
import type { EditorOverlay, GitHubImportMeta } from "@/features/editor/lib/editorLayoutTypes";
import type { TitleBarAction } from "@/features/editor/components/titlebar/TitleBar";
import type { RoomHistoryEntry } from "@/shared/lib/roomHistory";

interface EditorOverlaysProps {
  prefsOpen: boolean;
  overlay: EditorOverlay;
  onCloseOverlay: () => void;
  onAction: (action: TitleBarAction) => void;
  quickOpenFiles: Array<{ node: FileNode; path: string }>;
  onSelectFile: (node: FileNode) => void;
  onSelectRecent: (entry: RoomHistoryEntry) => void;
  githubImportOpen: boolean;
  onImportGitHub: (
    importedTree: FileNode[],
    meta: GitHubImportMeta,
  ) => void;
  onCloseGitHubImport: () => void;
  approvalModalData: ImportRequestData | null;
  onApproveImport: () => void;
  onRejectImport: () => void;
  importToast: string | null;
  onToastDone: () => void;
}

export default function EditorOverlays({
  prefsOpen,
  overlay,
  onCloseOverlay,
  onAction,
  quickOpenFiles,
  onSelectFile,
  onSelectRecent,
  githubImportOpen,
  onImportGitHub,
  onCloseGitHubImport,
  approvalModalData,
  onApproveImport,
  onRejectImport,
  importToast,
  onToastDone,
}: EditorOverlaysProps) {
  return (
    <>
      {prefsOpen && <PreferencesModal />}

      {overlay === "command-palette" && (
        <CommandPalette onAction={onAction} onClose={onCloseOverlay} />
      )}

      {overlay === "quick-open" && (
        <QuickOpen
          files={quickOpenFiles}
          onSelect={onSelectFile}
          onClose={onCloseOverlay}
        />
      )}

      {overlay === "open-recent" && (
        <OpenRecentModal
          onSelect={onSelectRecent}
          onClose={onCloseOverlay}
        />
      )}

      {githubImportOpen && (
        <ImportGitHubModal
          onImport={onImportGitHub}
          onClose={onCloseGitHubImport}
        />
      )}

      {approvalModalData && (
        <ImportApprovalModal
          request={approvalModalData}
          onApprove={onApproveImport}
          onReject={onRejectImport}
        />
      )}

      {importToast && <Toast message={importToast} onDone={onToastDone} />}
    </>
  );
}

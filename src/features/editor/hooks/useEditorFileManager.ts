"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import type { ActivityAction, ActivityDelta } from "@/features/editor/activity-log/types";
import type { GithubMeta } from "@/features/editor/collaboration/types";
import type { FileNode } from "@/features/editor/lib/types";
import {
  addNode,
  deleteNode,
  fileIdFromPath,
  findNodeById,
  flatFiles,
  getBreadcrumb,
  getLanguage,
  getParentId,
} from "@/features/editor/lib/utils";
import { updateContent } from "@/features/editor/lib/editorLayoutUtils";
import { useEditorTabsStore } from "@/shared/state/editorTabs";

interface TabHistoryLike {
  push: (fileId: string) => void;
  removeId: (fileId: string) => void;
}

type SyncTree = (
  updater: FileNode[] | ((prev: FileNode[]) => FileNode[]),
) => void;

type LogActivity = (
  action: ActivityAction,
  targetFile: string,
  targetFileName: string,
  lineNumber?: number,
  delta?: ActivityDelta,
) => void;

interface UseEditorFileManagerOptions {
  tree: FileNode[];
  githubRepo: GithubMeta | null;
  activeFileId: string | null;
  openTabIds: string[];
  setTreeLocal: Dispatch<SetStateAction<FileNode[]>>;
  syncTree: SyncTree;
  logActivity: LogActivity;
  tabHistory: TabHistoryLike;
}

interface UseEditorFileManagerReturn {
  nodeMap: Map<string, FileNode>;
  nodeMapRef: MutableRefObject<Map<string, FileNode>>;
  activeFile: FileNode | null;
  openTabs: FileNode[];
  quickOpenFiles: Array<{ node: FileNode; path: string }>;
  breadcrumb: string[];
  editorPaneKey: string;
  selectFile: (node: FileNode) => void;
  closeTab: (id: string, e?: React.MouseEvent) => void;
  confirmCreate: (
    parentId: string | null,
    name: string,
    type: "file" | "folder",
  ) => void;
  handleDelete: (id: string) => void;
  handleContentChange: (value: string) => void;
}

export function useEditorFileManager({
  tree,
  githubRepo,
  activeFileId,
  openTabIds,
  setTreeLocal,
  syncTree,
  logActivity,
  tabHistory,
}: UseEditorFileManagerOptions): UseEditorFileManagerReturn {
  const nodeMapRef = useRef<Map<string, FileNode>>(new Map());
  const previousGithubRepoKeyRef = useRef<string | null>(null);
  const inFlightLoadControllersRef = useRef(new Map<string, AbortController>());

  const nodeMap = useMemo(() => {
    const map = new Map<string, FileNode>();
    const collect = (nodes: FileNode[]) => {
      for (const node of nodes) {
        map.set(node.id, node);
        if (node.children) collect(node.children);
      }
    };
    collect(tree);
    return map;
  }, [tree]);

  useEffect(() => {
    nodeMapRef.current = nodeMap;
  }, [nodeMap]);

  const activeFile = activeFileId ? (nodeMap.get(activeFileId) ?? null) : null;

  const editorPaneKey = activeFile
    ? `${activeFile.id}:${activeFile.content === undefined ? "loading" : "ready"}`
    : "no-active-file";

  const openTabs = useMemo(
    () =>
      openTabIds
        .filter((id) => nodeMap.has(id))
        .map((id) => nodeMap.get(id) as FileNode),
    [nodeMap, openTabIds],
  );

  const quickOpenFiles = useMemo(() => flatFiles(tree), [tree]);

  const breadcrumb = activeFile
    ? (getBreadcrumb(tree, activeFile.id) ?? [activeFile.name])
    : [];

  useEffect(() => {
    const tabs = useEditorTabsStore.getState();
    const validOpenTabIds = tabs.openTabIds.filter((id) => nodeMap.has(id));

    if (validOpenTabIds.length !== tabs.openTabIds.length) {
      tabs.setOpenTabIds(validOpenTabIds);
    }

    if (tabs.activeFileId && !nodeMap.has(tabs.activeFileId)) {
      tabs.setActiveFileId(validOpenTabIds[validOpenTabIds.length - 1] ?? null);
    }
  }, [nodeMap]);

  const handleContentChange = useCallback(
    (value: string) => {
      const fileId = useEditorTabsStore.getState().activeFileId;
      if (!fileId) return;
      useEditorTabsStore.getState().markDirty(fileId);
      setTreeLocal((t) => updateContent(t, fileId, value));
    },
    [setTreeLocal],
  );

  const loadGitHubFile = useCallback(
    (
      node: FileNode,
      repo: { owner: string; repo: string; branch: string },
      signal?: AbortSignal,
    ) => {
      const params = new URLSearchParams({
        owner: repo.owner,
        repo: repo.repo,
        branch: repo.branch,
        path: node.githubPath!,
      });

      fetch(`/api/github/content?${params}`, signal ? { signal } : undefined)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load file (${res.status})`);
          return res.json();
        })
        .then((data) => {
          if (signal?.aborted) return;

          const latestNode = nodeMapRef.current.get(node.id);
          if (!latestNode || latestNode.content !== undefined) return;

          const content: string = data.content;
          setTreeLocal((t) => updateContent(t, node.id, content));
        })
        .catch((err) => {
          if (
            signal?.aborted ||
            (err instanceof DOMException && err.name === "AbortError")
          ) {
            return;
          }

          const latestNode = nodeMapRef.current.get(node.id);
          if (!latestNode || latestNode.content !== undefined) return;

          const errorMsg = `// Error loading file: ${(err as Error).message}\n// Path: ${node.githubPath}`;
          setTreeLocal((t) => updateContent(t, node.id, errorMsg));
        })
        .finally(() => {
          if (signal?.aborted) return;

          inFlightLoadControllersRef.current.delete(node.id);

          const current = useEditorTabsStore.getState();
          if (current.loadingFileId === node.id) {
            current.setLoadingFileId(null);
          }
        });
    },
    [setTreeLocal],
  );

  const selectFile = useCallback(
    (node: FileNode) => {
      const tabs = useEditorTabsStore.getState();

      tabs.setActiveFileId(node.id);
      tabs.addTabId(node.id);
      tabHistory.push(node.id);

      logActivity("select-file", node.id, node.name);

      if (node.githubPath && node.content === undefined && githubRepo) {
        const existingController = inFlightLoadControllersRef.current.get(
          node.id,
        );

        if (!existingController) {
          const controller = new AbortController();
          inFlightLoadControllersRef.current.set(node.id, controller);

          tabs.setLoadingFileId(node.id);
          loadGitHubFile(node, githubRepo, controller.signal);
        } else {
          tabs.setLoadingFileId(node.id);
        }
      }
    },
    [tabHistory, logActivity, githubRepo, loadGitHubFile],
  );

  useEffect(() => {
    const repoKey = githubRepo
      ? `${githubRepo.owner}/${githubRepo.repo}@${githubRepo.branch}`
      : null;

    const previousRepoKey = previousGithubRepoKeyRef.current;
    previousGithubRepoKeyRef.current = repoKey;

    if (!repoKey || repoKey === previousRepoKey) return;
    if (!activeFile?.githubPath || activeFile.content !== undefined) return;

    const repo = githubRepo;
    if (!repo) return;

    const existingController = inFlightLoadControllersRef.current.get(
      activeFile.id,
    );
    if (existingController) {
      useEditorTabsStore.getState().setLoadingFileId(activeFile.id);
      return;
    }

    const controller = new AbortController();
    const inFlightLoads = inFlightLoadControllersRef.current;
    inFlightLoads.set(activeFile.id, controller);

    useEditorTabsStore.getState().setLoadingFileId(activeFile.id);
    loadGitHubFile(activeFile, repo, controller.signal);

    return () => {
      controller.abort();
      inFlightLoads.delete(activeFile.id);
    };
  }, [activeFile, githubRepo, loadGitHubFile]);

  useEffect(() => {
    const inFlightLoads = inFlightLoadControllersRef.current;

    return () => {
      for (const controller of inFlightLoads.values()) {
        controller.abort();
      }
      inFlightLoads.clear();
    };
  }, []);

  const closeTab = useCallback(
    (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      useEditorTabsStore.getState().removeTab(id);
      tabHistory.removeId(id);
    },
    [tabHistory],
  );

  const confirmCreate = useCallback(
    (parentId: string | null, name: string, type: "file" | "folder") => {
      const id = fileIdFromPath(parentId, name);
      const node: FileNode = {
        id,
        name,
        type,
        ...(type === "file"
          ? { content: `// ${name}\n`, language: getLanguage(name) }
          : { children: [], isOpen: true }),
      };

      syncTree((t) => addNode(t, parentId, node));
      useEditorTabsStore.getState().setInlineCreate(null);

      logActivity(
        type === "file" ? "create-file" : "create-folder",
        id,
        name,
        undefined,
        {
          type: "create",
          filePath: id,
          fileType: type,
          parentId,
          language: type === "file" ? getLanguage(name) : undefined,
        },
      );

      if (type === "file") {
        setTimeout(() => selectFile(node), 50);
      }
    },
    [logActivity, selectFile, syncTree],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const node = findNodeById(tree, id);
      const parentId = getParentId(id);

      syncTree((t) => deleteNode(t, id));
      closeTab(id);

      if (!node) return;

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
        },
      );
    },
    [closeTab, logActivity, syncTree, tree],
  );

  return {
    nodeMap,
    nodeMapRef,
    activeFile,
    openTabs,
    quickOpenFiles,
    breadcrumb,
    editorPaneKey,
    selectFile,
    closeTab,
    confirmCreate,
    handleDelete,
    handleContentChange,
  };
}

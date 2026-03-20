"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import {
  useCollaborationStore,
  type CollaboratorInfo,
} from "@/shared/state/collaboration";
import type { FileNode } from "@/features/editor/lib/types";
import { stripLocalFields, mergeRemoteTree } from "@/features/editor/lib/utils";

// ── Cursor color palette (shared with useRealtimeEditor) ─────────────────

const CURSOR_COLORS = [
  "#f87171", "#fb923c", "#facc15", "#4ade80", "#22d3ee",
  "#60a5fa", "#a78bfa", "#f472b6", "#34d399", "#fbbf24",
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

function describeCloseReason(event: CloseEvent | null): string {
  if (event?.reason) return event.reason;

  switch (event?.code) {
    case 1000:
      return "Collaboration session closed";
    case 1001:
      return "Server went away";
    case 1006:
      return "Network connection lost";
    case 1011:
      return "Collaboration server error";
    default:
      return "Connection lost";
  }
}

// ── Types ────────────────────────────────────────────────────────────────

export interface GithubMeta {
  owner: string;
  repo: string;
  branch: string;
}

interface UseRoomStateOptions {
  roomId: string | null;
  userInfo: { userId: string; username: string } | null;
  /** The default tree used to seed the room if no shared state exists yet. */
  initialTree: FileNode[];
  /** File the local user currently has open (broadcast via awareness). */
  activeFile?: { id: string; name: string } | null;
  /** Cursor position for the active file (broadcast via awareness). */
  cursorPosition?: { lineNumber: number; column: number } | null;
}

interface UseRoomStateReturn {
  /** Current file tree (with local isOpen/content merged in). */
  tree: FileNode[];
  /** GitHub repo metadata (synced to all clients). */
  githubRepo: GithubMeta | null;
  /**
   * Update the tree locally only (e.g. toggle folder, update content).
   * These changes are NOT synced to other clients.
   */
  setTreeLocal: React.Dispatch<React.SetStateAction<FileNode[]>>;
  /**
   * Update the tree and sync the structural change to the room.
   * Use for add/delete operations.
   */
  syncTree: (updater: FileNode[] | ((prev: FileNode[]) => FileNode[])) => void;
  /**
   * Replace the entire project (GitHub import). Syncs tree + repo metadata.
   */
  importProject: (tree: FileNode[], meta: GithubMeta) => void;
  /** Room-level connection status. */
  roomConnectionStatus: "disconnected" | "connecting" | "connected";
  /** userId of the room creator (first user to seed the room). */
  roomCreatorId: string | null;
  /** Whether the current user is the room creator. */
  isCreator: boolean;
  /** Ref to the WebSocket provider (for awareness access). */
  providerRef: React.MutableRefObject<WebsocketProvider | null>;
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useRoomState({
  roomId,
  userInfo,
  initialTree,
  activeFile,
  cursorPosition,
}: UseRoomStateOptions): UseRoomStateReturn {
  const [tree, setTree] = useState<FileNode[]>(initialTree);
  const [githubRepo, setGithubRepo] = useState<GithubMeta | null>(null);
  const [roomCreatorId, setRoomCreatorId] = useState<string | null>(null);

  const providerRef = useRef<WebsocketProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const disposedRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const hasConnectedRef = useRef(false);
  const hasHydratedRemoteTreeRef = useRef(false);
  const cursorBroadcastTimerRef = useRef<number | null>(null);
  const userId = userInfo?.userId ?? null;
  const username = userInfo?.username ?? null;
  const activeFileId = activeFile?.id ?? null;
  const activeFileName = activeFile?.name ?? null;
  const cursorLine = cursorPosition?.lineNumber ?? null;
  const cursorColumn = cursorPosition?.column ?? null;

  // Keep volatile values in refs so reconnect logic doesn't re-run on every
  // cursor movement or active tab change.
  const treeRef = useRef(tree);
  const activeFileRef = useRef(activeFile ?? null);
  const cursorPositionRef = useRef(cursorPosition ?? null);

  useEffect(() => {
    treeRef.current = tree;
  }, [tree]);

  useEffect(() => {
    activeFileRef.current =
      activeFileId && activeFileName
        ? { id: activeFileId, name: activeFileName }
        : null;
  }, [activeFileId, activeFileName]);

  useEffect(() => {
    cursorPositionRef.current =
      cursorLine !== null && cursorColumn !== null
        ? { lineNumber: cursorLine, column: cursorColumn }
        : null;
  }, [cursorLine, cursorColumn]);

  const setCollaborators = useCollaborationStore((s) => s.setCollaborators);
  const roomConnectionStatus = useCollaborationStore((s) => s.connectionStatus);
  const updateConnection = useCollaborationStore((s) => s.updateConnection);
  const resetConnection = useCollaborationStore((s) => s.resetConnection);
  const setActiveRoomId = useCollaborationStore((s) => s.setActiveRoomId);

  // ── Cleanup ──────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    disposedRef.current = true;
    hasHydratedRemoteTreeRef.current = false;
    if (providerRef.current) {
      providerRef.current.disconnect();
      providerRef.current.destroy();
      providerRef.current = null;
    }
    if (ydocRef.current) {
      ydocRef.current.destroy();
      ydocRef.current = null;
    }
    if (cursorBroadcastTimerRef.current !== null) {
      window.clearTimeout(cursorBroadcastTimerRef.current);
      cursorBroadcastTimerRef.current = null;
    }
  }, []);

  // ── Write tree to Y.Map ─────────────────────────────────────────────
  const writeTreeToYMap = useCallback((newTree: FileNode[]) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;
    const ymap = ydoc.getMap("room");
    const stripped = stripLocalFields(newTree);
    ymap.set("tree", JSON.stringify(stripped));
  }, []);

  const writeGithubRepoToYMap = useCallback((meta: GithubMeta | null) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;
    const ymap = ydoc.getMap("room");
    ymap.set("githubRepo", meta ? JSON.stringify(meta) : "");
  }, []);

  const stripTreeContent = useCallback((nodes: FileNode[]): FileNode[] => {
    return nodes.map((node) => ({
      ...node,
      content: undefined,
      children: node.children ? stripTreeContent(node.children) : undefined,
    }));
  }, []);

  // ── Public API ──────────────────────────────────────────────────────

  const syncTree = useCallback(
    (updater: FileNode[] | ((prev: FileNode[]) => FileNode[])) => {
      setTree((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        writeTreeToYMap(next);
        return next;
      });
    },
    [writeTreeToYMap]
  );

  const importProject = useCallback(
    (newTree: FileNode[], meta: GithubMeta) => {
      setTree(newTree);
      setGithubRepo(meta);
      writeTreeToYMap(newTree);
      writeGithubRepoToYMap(meta);
    },
    [writeTreeToYMap, writeGithubRepoToYMap]
  );

  // ── Connect to room-level Y.Doc ────────────────────────────────────
  useEffect(() => {
    if (!roomId || !userId || !username) {
      cleanup();
      setActiveRoomId(null);
      setCollaborators([]);
      resetConnection();
      return;
    }

    cleanup();
    disposedRef.current = false;
    reconnectAttemptRef.current = 0;
    hasConnectedRef.current = false;
    updateConnection({
      connectionStatus: "connecting",
      syncStatus: "syncing",
      reconnectAttempt: 0,
      lastDisconnectReason: null,
    });

    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ??
      (typeof window !== "undefined"
        ? `ws://${window.location.hostname}:4000`
        : "ws://localhost:4000");

    const metaRoomId = `${roomId}:__meta__`;
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const provider = new WebsocketProvider(wsUrl, metaRoomId, ydoc, {
      connect: true,
      params: {},
      resyncInterval: 30000,
      maxBackoffTime: 10000,
    });
    providerRef.current = provider;

    const ymap = ydoc.getMap("room");

    // ── Awareness: broadcast user presence at room level ──────────
    const color = getUserColor(userId);
    provider.awareness.setLocalState({
      ...provider.awareness.getLocalState(),
      user: {
        name: username,
        color,
        userId,
      },
      activeFile: activeFileRef.current
        ? {
            id: activeFileRef.current.id,
            name: activeFileRef.current.name,
          }
        : null,
      cursor:
        activeFileRef.current && cursorPositionRef.current
          ? {
              lineNumber: cursorPositionRef.current.lineNumber,
              column: cursorPositionRef.current.column,
            }
          : null,
    });

    // ── Observe shared Y.Map for tree + githubRepo changes ───────
    const ymapObserver = () => {
      const rawTree = ymap.get("tree") as string | undefined;
      const rawRepo = ymap.get("githubRepo") as string | undefined;
      const rawCreator = ymap.get("creator") as string | undefined;

      if (rawTree) {
        try {
          const remote: FileNode[] = JSON.parse(rawTree);
          setTree((prev) =>
            mergeRemoteTree(
              remote,
              hasHydratedRemoteTreeRef.current ? prev : stripTreeContent(prev)
            )
          );
          hasHydratedRemoteTreeRef.current = true;
        } catch {
          /* ignore malformed JSON */
        }
      }

      if (rawRepo) {
        try {
          setGithubRepo(JSON.parse(rawRepo));
        } catch {
          /* ignore */
        }
      } else if (rawRepo === "") {
        setGithubRepo(null);
      }

      if (rawCreator) {
        setRoomCreatorId(rawCreator);
      }
    };

    // ── Connection status ─────────────────────────────────────────
    const statusHandler = ({
      status,
    }: {
      status: "connected" | "disconnected" | "connecting";
    }) => {
      if (disposedRef.current || providerRef.current !== provider) return;

      if (status === "connecting") {
        if (hasConnectedRef.current) {
          reconnectAttemptRef.current += 1;
        }

        updateConnection({
          connectionStatus: "connecting",
          syncStatus: "syncing",
          reconnectAttempt: reconnectAttemptRef.current,
        });
        return;
      }

      if (status === "connected") {
        hasConnectedRef.current = true;
        reconnectAttemptRef.current = 0;
        updateConnection({
          connectionStatus: "connected",
          syncStatus: provider.synced ? "synced" : "syncing",
          reconnectAttempt: 0,
          lastConnectedAt: Date.now(),
          lastDisconnectReason: null,
        });
        return;
      }

      updateConnection({
        connectionStatus: "disconnected",
        syncStatus: "idle",
        lastDisconnectedAt: Date.now(),
      });
    };

    const connectionCloseHandler = (event: CloseEvent | null) => {
      if (disposedRef.current || providerRef.current !== provider) return;
      updateConnection({
        connectionStatus: "disconnected",
        syncStatus: "idle",
        lastDisconnectedAt: Date.now(),
        lastDisconnectReason: describeCloseReason(event),
      });
    };

    const connectionErrorHandler = () => {
      if (disposedRef.current || providerRef.current !== provider) return;
      updateConnection({
        lastDisconnectReason: "Unable to reach the collaboration server",
      });
    };

    const syncHandler = (isSynced: boolean) => {
      if (disposedRef.current || providerRef.current !== provider) return;

      updateConnection({
        syncStatus: isSynced ? "synced" : provider.wsconnected ? "syncing" : "idle",
      });

      if (!isSynced) return;

      hasConnectedRef.current = true;
      updateConnection({
        connectionStatus: "connected",
        lastConnectedAt: Date.now(),
        lastDisconnectReason: null,
      });

      const existingTree = ymap.get("tree") as string | undefined;
      const existingCreator = ymap.get("creator") as string | undefined;

      if (!existingTree) {
        const stripped = stripLocalFields(treeRef.current);
        ymap.set("tree", JSON.stringify(stripped));
        ymap.set("creator", userId);
        hasHydratedRemoteTreeRef.current = true;
      } else {
        ymapObserver();
      }

      if (!existingCreator) {
        ymap.set("creator", userId);
      }
    };

    provider.on("status", statusHandler);
    provider.on("connection-close", connectionCloseHandler);
    provider.on("connection-error", connectionErrorHandler);
    provider.on("sync", syncHandler);
    setActiveRoomId(roomId);

    // ── Track room-wide collaborators via awareness ──────────────
    const awarenessHandler = () => {
      const states = provider.awareness.getStates();
      const collabs: CollaboratorInfo[] = [];

      states.forEach((state, clientId) => {
        if (clientId === ydoc.clientID) return;
        const user = state.user as
          | { name?: string; color?: string; userId?: string }
          | undefined;
        const activeFileState = state.activeFile as
          | { id?: string; name?: string }
          | string
          | null
          | undefined;
        const cursorState = state.cursor as
          | { lineNumber?: number; column?: number }
          | null
          | undefined;
        if (user) {
          collabs.push({
            clientId,
            userId: user.userId ?? `client-${clientId}`,
            username: user.name ?? "Anonymous",
            color: user.color ?? "#888",
            activeFile:
              typeof activeFileState === "string"
                ? activeFileState
                : activeFileState?.name ?? undefined,
            activeFileId:
              typeof activeFileState === "string"
                ? undefined
                : activeFileState?.id,
            cursor:
              typeof cursorState?.lineNumber === "number" &&
              typeof cursorState?.column === "number"
                ? {
                    lineNumber: cursorState.lineNumber,
                    column: cursorState.column,
                  }
                : undefined,
          });
        }
      });

      setCollaborators(collabs);
    };

    ymap.observe(ymapObserver);
    provider.awareness.on("change", awarenessHandler);
    awarenessHandler();

    return () => {
      provider.awareness.off("change", awarenessHandler);
      provider.off("status", statusHandler);
      provider.off("connection-close", connectionCloseHandler);
      provider.off("connection-error", connectionErrorHandler);
      provider.off("sync", syncHandler);
      ymap.unobserve(ymapObserver);
      cleanup();
      setActiveRoomId(null);
      setCollaborators([]);
      resetConnection();
    };
  }, [
    roomId,
    userId,
    username,
    cleanup,
    stripTreeContent,
    setCollaborators,
    updateConnection,
    resetConnection,
    setActiveRoomId,
  ]);

  // ── Broadcast active file via room-level awareness ────────────────
  useEffect(() => {
    const provider = providerRef.current;
    if (!provider) return;

    provider.awareness.setLocalStateField(
      "activeFile",
      activeFileId && activeFileName
        ? {
            id: activeFileId,
            name: activeFileName,
          }
        : null
    );
    provider.awareness.setLocalStateField("cursor", null);
  }, [activeFileId, activeFileName]);

  // ── Broadcast cursor position via room-level awareness ────────────
  useEffect(() => {
    const provider = providerRef.current;
    if (!provider) return;

    if (cursorBroadcastTimerRef.current !== null) {
      window.clearTimeout(cursorBroadcastTimerRef.current);
    }

    cursorBroadcastTimerRef.current = window.setTimeout(() => {
      provider.awareness.setLocalStateField(
        "cursor",
        activeFileId && cursorLine !== null && cursorColumn !== null
          ? {
              lineNumber: cursorLine,
              column: cursorColumn,
            }
          : null
      );
      cursorBroadcastTimerRef.current = null;
    }, 80);

    return () => {
      if (cursorBroadcastTimerRef.current !== null) {
        window.clearTimeout(cursorBroadcastTimerRef.current);
        cursorBroadcastTimerRef.current = null;
      }
    };
  }, [activeFileId, cursorLine, cursorColumn]);

  return {
    tree,
    githubRepo,
    setTreeLocal: setTree,
    syncTree,
    importProject,
    roomConnectionStatus,
    roomCreatorId,
    isCreator: !!(userId && roomCreatorId === userId),
    providerRef,
  };
}

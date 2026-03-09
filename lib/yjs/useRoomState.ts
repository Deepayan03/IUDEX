"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import {
  useCollaborationStore,
  type CollaboratorInfo,
} from "@/store/collaboration";
import type { FileNode } from "@/components/editor/types";
import { stripLocalFields, mergeRemoteTree } from "@/components/editor/utils";

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
  /** Name of the file the local user currently has open (broadcast via awareness). */
  activeFileName?: string;
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
  activeFileName,
}: UseRoomStateOptions): UseRoomStateReturn {
  const [tree, setTree] = useState<FileNode[]>(initialTree);
  const [githubRepo, setGithubRepo] = useState<GithubMeta | null>(null);
  const [roomCreatorId, setRoomCreatorId] = useState<string | null>(null);
  const [roomConnectionStatus, setRoomConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");

  const providerRef = useRef<WebsocketProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const disposedRef = useRef(false);

  // Keep tree in a ref so callbacks always have the latest value
  const treeRef = useRef(tree);
  treeRef.current = tree;

  const setCollaborators = useCollaborationStore((s) => s.setCollaborators);
  const setConnectionStatus = useCollaborationStore(
    (s) => s.setConnectionStatus
  );
  const setActiveRoomId = useCollaborationStore((s) => s.setActiveRoomId);

  // ── Cleanup ──────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    disposedRef.current = true;
    if (providerRef.current) {
      providerRef.current.disconnect();
      providerRef.current.destroy();
      providerRef.current = null;
    }
    if (ydocRef.current) {
      ydocRef.current.destroy();
      ydocRef.current = null;
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
    if (!roomId || !userInfo) {
      cleanup();
      setRoomConnectionStatus("disconnected");
      setConnectionStatus("disconnected");
      setActiveRoomId(null);
      setCollaborators([]);
      return;
    }

    cleanup();
    disposedRef.current = false;

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
      maxBackoffTime: 10000,
    });
    providerRef.current = provider;

    // ── Awareness: broadcast user presence at room level ──────────
    const color = getUserColor(userInfo.userId);
    provider.awareness.setLocalStateField("user", {
      name: userInfo.username,
      color,
      userId: userInfo.userId,
    });

    // ── Connection status ─────────────────────────────────────────
    provider.on(
      "status",
      ({
        status,
      }: {
        status: "connected" | "disconnected" | "connecting";
      }) => {
        setRoomConnectionStatus(status);
        setConnectionStatus(status);
      }
    );
    setRoomConnectionStatus("connecting");
    setConnectionStatus("connecting");
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
        if (user) {
          collabs.push({
            clientId,
            userId: user.userId ?? `client-${clientId}`,
            username: user.name ?? "Anonymous",
            color: user.color ?? "#888",
            activeFile: (state.activeFile as string) ?? undefined,
          });
        }
      });

      setCollaborators(collabs);
    };
    provider.awareness.on("change", awarenessHandler);

    // ── Observe shared Y.Map for tree + githubRepo changes ───────
    const ymap = ydoc.getMap("room");

    const ymapObserver = () => {
      const rawTree = ymap.get("tree") as string | undefined;
      const rawRepo = ymap.get("githubRepo") as string | undefined;
      const rawCreator = ymap.get("creator") as string | undefined;

      if (rawTree) {
        try {
          const remote: FileNode[] = JSON.parse(rawTree);
          setTree((prev) => mergeRemoteTree(remote, prev));
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

    ymap.observe(ymapObserver);

    // ── Seed room if empty (first client) ─────────────────────────
    // Wait for sync before seeding so we don't overwrite persisted state.
    provider.on("sync", (isSynced: boolean) => {
      if (!isSynced) return;
      const existingTree = ymap.get("tree") as string | undefined;
      const existingCreator = ymap.get("creator") as string | undefined;

      if (!existingTree) {
        // First client to join — publish the initial tree and claim creator
        const stripped = stripLocalFields(treeRef.current);
        ymap.set("tree", JSON.stringify(stripped));
        ymap.set("creator", userInfo.userId);
      } else {
        // Another client already seeded — apply their tree
        ymapObserver();
      }

      // Legacy rooms without a creator — first syncing client claims it
      if (!existingCreator) {
        ymap.set("creator", userInfo.userId);
      }
    });

    return () => {
      provider.awareness.off("change", awarenessHandler);
      ymap.unobserve(ymapObserver);
      cleanup();
      setRoomConnectionStatus("disconnected");
      setConnectionStatus("disconnected");
      setCollaborators([]);
    };
  }, [
    roomId,
    userInfo?.userId,
    userInfo?.username,
    cleanup,
    setCollaborators,
    setConnectionStatus,
    setActiveRoomId,
  ]);

  // ── Broadcast active file name via room-level awareness ────────────
  useEffect(() => {
    const provider = providerRef.current;
    if (!provider) return;
    provider.awareness.setLocalStateField("activeFile", activeFileName ?? null);
  }, [activeFileName]);

  return {
    tree,
    githubRepo,
    setTreeLocal: setTree,
    syncTree,
    importProject,
    roomConnectionStatus,
    roomCreatorId,
    isCreator: !!(userInfo && roomCreatorId === userInfo.userId),
    providerRef,
  };
}

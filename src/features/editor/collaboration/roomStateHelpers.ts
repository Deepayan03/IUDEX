"use client";

import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";
import * as Y from "yjs";

import type { CollaboratorInfo } from "@/shared/state/collaboration";
import type { FileNode } from "@/features/editor/lib/types";
import { mergeRemoteTree, stripLocalFields } from "@/features/editor/lib/utils";
import { getUserColor } from "@/features/editor/collaboration/shared";
import type {
  ActiveFilePresence,
  CollaborationUserInfo,
  CursorPosition,
  GithubMeta,
} from "@/features/editor/collaboration/types";

export function stripTreeContent(nodes: FileNode[]): FileNode[] {
  return nodes.map((node) => ({
    ...node,
    content: undefined,
    children: node.children ? stripTreeContent(node.children) : undefined,
  }));
}

interface ApplyRoomMapSnapshotOptions {
  ymap: Y.Map<unknown>;
  setTree: Dispatch<SetStateAction<FileNode[]>>;
  setGithubRepo: Dispatch<SetStateAction<GithubMeta | null>>;
  setRoomCreatorId: Dispatch<SetStateAction<string | null>>;
  hasHydratedRemoteTreeRef: MutableRefObject<boolean>;
}

export function applyRoomMapSnapshot({
  ymap,
  setTree,
  setGithubRepo,
  setRoomCreatorId,
  hasHydratedRemoteTreeRef,
}: ApplyRoomMapSnapshotOptions): void {
  const rawTree = ymap.get("tree") as string | undefined;
  const rawRepo = ymap.get("githubRepo") as string | undefined;
  const rawCreator = ymap.get("creator") as string | undefined;

  if (rawTree) {
    try {
      const remote: FileNode[] = JSON.parse(rawTree);
      setTree((prev) =>
        mergeRemoteTree(
          remote,
          hasHydratedRemoteTreeRef.current ? prev : stripTreeContent(prev),
        ),
      );
      hasHydratedRemoteTreeRef.current = true;
    } catch {
      // Ignore malformed room snapshots so the connection can continue.
    }
  }

  if (rawRepo) {
    try {
      setGithubRepo(JSON.parse(rawRepo));
    } catch {
      // Ignore malformed repo metadata.
    }
  } else if (rawRepo === "") {
    setGithubRepo(null);
  }

  if (rawCreator) {
    setRoomCreatorId(rawCreator);
  }
}

interface WriteImportedProjectSnapshotOptions {
  ydoc: Y.Doc;
  tree: FileNode[];
  githubRepo: GithubMeta | null;
}

export function writeImportedProjectSnapshot({
  ydoc,
  tree,
  githubRepo,
}: WriteImportedProjectSnapshotOptions): void {
  const ymap = ydoc.getMap("room");

  ydoc.transact(() => {
    ymap.set("tree", JSON.stringify(stripLocalFields(tree)));
    ymap.set("githubRepo", githubRepo ? JSON.stringify(githubRepo) : "");
  });
}

interface CreateLocalAwarenessStateOptions {
  existingState: Record<string, unknown> | null;
  userInfo: CollaborationUserInfo;
  activeFile: ActiveFilePresence | null;
  cursor: CursorPosition | null;
}

export function createLocalAwarenessState({
  existingState,
  userInfo,
  activeFile,
  cursor,
}: CreateLocalAwarenessStateOptions): Record<string, unknown> {
  return {
    ...(existingState ?? {}),
    user: {
      name: userInfo.username,
      color: getUserColor(userInfo.userId),
      userId: userInfo.userId,
    },
    activeFile: activeFile
      ? {
          id: activeFile.id,
          name: activeFile.name,
        }
      : null,
    cursor:
      activeFile && cursor
        ? {
            lineNumber: cursor.lineNumber,
            column: cursor.column,
          }
        : null,
  };
}

export function buildCollaborators(
  states: Map<number, unknown>,
  currentClientId: number,
): CollaboratorInfo[] {
  const collaborators: CollaboratorInfo[] = [];

  states.forEach((value, clientId) => {
    if (clientId === currentClientId) return;

    const state = value as {
      user?:
        | {
            name?: string;
            color?: string;
            userId?: string;
          }
        | undefined;
      activeFile?:
        | {
            id?: string;
            name?: string;
          }
        | string
        | null
        | undefined;
      cursor?:
        | {
            lineNumber?: number;
            column?: number;
          }
        | null
        | undefined;
    };

    if (!state.user) return;

    collaborators.push({
      clientId,
      userId: state.user.userId ?? `client-${clientId}`,
      username: state.user.name ?? "Anonymous",
      color: state.user.color ?? "#888",
      activeFile:
        typeof state.activeFile === "string"
          ? state.activeFile
          : state.activeFile?.name ?? undefined,
      activeFileId:
        typeof state.activeFile === "string"
          ? undefined
          : state.activeFile?.id,
      cursor:
        typeof state.cursor?.lineNumber === "number" &&
        typeof state.cursor?.column === "number"
          ? {
              lineNumber: state.cursor.lineNumber,
              column: state.cursor.column,
            }
          : undefined,
    });
  });

  return collaborators;
}

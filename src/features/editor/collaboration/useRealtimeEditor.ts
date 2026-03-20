"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { MonacoBinding } from "y-monaco";
import type * as Monaco from "monaco-editor";
import {
  loadMonacoBinding,
  seedYTextIfEmpty,
} from "@/features/editor/collaboration/realtimeEditorHelpers";
import {
  getUserColor,
  resolveRealtimeWsUrl,
} from "@/features/editor/collaboration/shared";
import type { CollaborationUserInfo } from "@/features/editor/collaboration/types";

// ── Hook ──────────────────────────────────────────────────────────────────

interface UseRealtimeEditorOptions {
  roomId: string | null;
  userInfo: CollaborationUserInfo | null;
  /** Content to seed into an empty Y.Doc (from file tree / GitHub import). */
  initialContent?: string;
}

interface UseRealtimeEditorReturn {
  /** Bind a Monaco editor instance to the CRDT document. Call on editor mount. */
  bindEditor: (editor: Monaco.editor.IStandaloneCodeEditor) => void;
  /** True once the file room has synced at least once and Monaco is bound. */
  isDocumentReady: boolean;
}

export function useRealtimeEditor({
  roomId,
  userInfo,
  initialContent,
}: UseRealtimeEditorOptions): UseRealtimeEditorReturn {
  const [readyRoomId, setReadyRoomId] = useState<string | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const disposedRef = useRef(false);
  const providerSyncedRef = useRef(false);
  const initialSyncCompleteRef = useRef(false);
  const bindingRequestRef = useRef(0);
  const userId = userInfo?.userId ?? null;
  const username = userInfo?.username ?? null;

  // Keep initialContent in a ref so it's always current when createBinding
  // runs, regardless of render/effect timing. This avoids stale closures.
  const initialContentRef = useRef<string | undefined>(initialContent);

  useEffect(() => {
    initialContentRef.current = initialContent;
  }, [initialContent]);

  const markDocumentReady = useCallback(() => {
    if (!roomId || disposedRef.current) return;
    if (!bindingRef.current || !initialSyncCompleteRef.current) return;
    setReadyRoomId(roomId);
  }, [roomId]);

  // Clean up current connection
  const cleanup = useCallback(() => {
    disposedRef.current = true;
    providerSyncedRef.current = false;
    initialSyncCompleteRef.current = false;
    bindingRequestRef.current += 1;
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }
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

  const maybeSeedInitialContent = useCallback(() => {
    const ydoc = ydocRef.current;
    if (!ydoc || !providerSyncedRef.current) return;

    seedYTextIfEmpty(ydoc, initialContentRef.current);
  }, []);

  // Create binding when we have an editor and a provider
  const createBinding = useCallback(async () => {
    const editor = editorRef.current;
    const provider = providerRef.current;
    const ydoc = ydocRef.current;

    if (!editor || !provider || !ydoc) return;

    // Destroy previous binding
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }

    const model = editor.getModel();
    if (!model) return;

    const ytext = ydoc.getText("content");
    const requestId = ++bindingRequestRef.current;
    maybeSeedInitialContent();

    const { MonacoBinding } = await loadMonacoBinding();

    // Guard: if cleanup or a newer bind request ran while the import was in-flight,
    // don't attach a stale binding to the editor.
    if (
      disposedRef.current ||
      bindingRequestRef.current !== requestId ||
      providerRef.current !== provider ||
      ydocRef.current !== ydoc ||
      editorRef.current !== editor
    ) {
      return;
    }

    bindingRef.current = new MonacoBinding(
      ytext,
      model,
      new Set([editor]),
      provider.awareness
    );
    markDocumentReady();

    // y-monaco auto-destroys itself via model.onWillDispose when the Monaco editor
    // unmounts. Null out our ref so cleanup() doesn't call destroy() a second time
    // (which triggers yjs's "Tried to remove event handler" console.error).
    model.onWillDispose(() => {
      bindingRef.current = null;
    });
  }, [markDocumentReady, maybeSeedInitialContent]);

  // Setup connection when roomId changes
  useEffect(() => {
    if (!roomId || !userId || !username) {
      cleanup();
      return;
    }

    // Clean up previous connection
    cleanup();
    disposedRef.current = false;
    void loadMonacoBinding();

    const wsUrl = resolveRealtimeWsUrl();

    // Create new Y.Doc and WebSocket provider
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const provider = new WebsocketProvider(wsUrl, roomId, ydoc, {
      connect: true,
      params: {},
      resyncInterval: 30000,
      maxBackoffTime: 10000,
    });
    providerRef.current = provider;

    const syncHandler = (isSynced: boolean) => {
      if (disposedRef.current || providerRef.current !== provider) return;
      providerSyncedRef.current = isSynced;
      if (isSynced) {
        initialSyncCompleteRef.current = true;
        maybeSeedInitialContent();
        markDocumentReady();
      }
    };
    provider.on("sync", syncHandler);
    providerSyncedRef.current = provider.synced;
    if (provider.synced) {
      initialSyncCompleteRef.current = true;
      maybeSeedInitialContent();
      queueMicrotask(markDocumentReady);
    }

    // Set local awareness state (used by y-monaco for remote cursor display)
    const color = getUserColor(userId);
    provider.awareness.setLocalStateField("user", {
      name: username,
      color,
      userId,
    });

    // If we already have an editor, create binding immediately.
    // Use setTimeout so the Y.Doc and provider refs are fully committed.
    if (editorRef.current) {
      setTimeout(createBinding, 0);
    }

    return () => {
      provider.off("sync", syncHandler);
      cleanup();
    };
  }, [
    roomId,
    userId,
    username,
    cleanup,
    createBinding,
    markDocumentReady,
    maybeSeedInitialContent,
  ]);

  // ── Seed content when it arrives late (e.g. GitHub lazy-loaded files) ────
  useEffect(() => {
    maybeSeedInitialContent();
  }, [initialContent, maybeSeedInitialContent]);

  // Bind editor callback — just stores the editor ref and attempts binding.
  // The actual content seeding is driven by initialContent (hook param + ref).
  const bindEditor = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      createBinding();
    },
    [createBinding]
  );

  return {
    bindEditor,
    isDocumentReady: !!roomId && readyRoomId === roomId,
  };
}

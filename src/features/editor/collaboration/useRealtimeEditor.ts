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
import { logEditorFlow } from "@/features/editor/lib/debug";
import type { CollaborationUserInfo } from "@/features/editor/collaboration/types";

// ── Hook ──────────────────────────────────────────────────────────────────

// FIX 1: Pre-warm the dynamic import as soon as this client module loads so
// the first binding attempt does not pay the network/parse cost on the
// critical path. Subsequent calls to loadMonacoBinding() return this same
// cached promise.
const monacoBindingPromise = loadMonacoBinding();

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

  // FIX 2: Two independent refs track the two async conditions that must both
  // be true before the document is considered ready. markDocumentReady() is
  // called from both paths (sync event and binding creation) and succeeds only
  // when both flags are set — whichever path finishes last wins cleanly.
  const isSyncedRef = useRef(false);
  const isBindingReadyRef = useRef(false);

  const bindingRequestRef = useRef(0);
  const userId = userInfo?.userId ?? null;
  const username = userInfo?.username ?? null;

  // Keep initialContent in a ref so it's always current when createBinding
  // runs, regardless of render/effect timing. This avoids stale closures.
  const roomIdRef = useRef<string | null>(roomId);
  const initialContentRef = useRef<string | undefined>(initialContent);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    initialContentRef.current = initialContent;
  }, [initialContent]);

  // FIX 2: markDocumentReady reads from refs (not closure values) so it is
  // safe to have an empty dep array — it never goes stale regardless of which
  // render cycle calls it. Both isSyncedRef and isBindingReadyRef must be true
  // for setReadyRoomId to fire, preventing either async path from racing ahead.
  const markDocumentReady = useCallback(() => {
    const activeRoomId = roomIdRef.current;
    if (!activeRoomId || disposedRef.current) return;
    if (!isSyncedRef.current || !isBindingReadyRef.current) return;
    setReadyRoomId(activeRoomId);
  }, []);

  // Clean up current connection
  const cleanup = useCallback(() => {
    disposedRef.current = true;
    providerSyncedRef.current = false;
    // FIX 2: Reset both flags on cleanup so a new room starts clean.
    isSyncedRef.current = false;
    isBindingReadyRef.current = false;
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

    logEditorFlow("realtime-editor", "seed:attempt", {
      roomId: roomIdRef.current ?? "none",
      hasInitialContent: initialContentRef.current !== undefined,
      initialContentLength: initialContentRef.current?.length ?? 0,
    });
    seedYTextIfEmpty(ydoc, initialContentRef.current);
  }, []);

  // Create binding when we have an editor and a provider
  const createBinding = useCallback(async () => {
    const editor = editorRef.current;
    const provider = providerRef.current;
    const ydoc = ydocRef.current;

    if (!editor || !provider || !ydoc) return;

    // Destroy previous binding before creating a new one
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }
    // FIX 2: Reset binding flag whenever we start a fresh binding attempt.
    isBindingReadyRef.current = false;

    const model = editor.getModel();
    if (!model) return;

    const ytext = ydoc.getText("content");

    // FIX 3: Bump the request counter and capture it locally. Every await
    // boundary below re-validates this id to ensure no stale binding attaches
    // after a cleanup() or a newer createBinding() call.
    const requestId = ++bindingRequestRef.current;
    maybeSeedInitialContent();

    logEditorFlow("realtime-editor", "binding:create", {
      roomId: roomIdRef.current ?? "none",
      requestId,
      yTextLength: ytext.length,
      hasInitialContent: initialContentRef.current !== undefined,
    });

    // FIX 1: monacoBindingPromise is pre-warmed at module load time so this
    // await resolves from cache and does not introduce meaningful latency.
    const { MonacoBinding } = await monacoBindingPromise;

    // Guard: if cleanup or a newer bind request ran while the import was
    // in-flight, discard this stale continuation entirely.
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
    // FIX 2: Mark binding as ready then attempt to mark the document ready.
    // If sync has already completed, markDocumentReady() will fire immediately.
    isBindingReadyRef.current = true;
    logEditorFlow("realtime-editor", "binding:attached", {
      roomId: roomIdRef.current ?? "none",
      yTextLength: ytext.length,
    });
    markDocumentReady();

    // y-monaco auto-destroys itself via model.onWillDispose when the Monaco
    // editor unmounts. Null out our ref so cleanup() doesn't call destroy() a
    // second time (which triggers yjs's "Tried to remove event handler" error).
    model.onWillDispose(() => {
      bindingRef.current = null;
      // FIX 5: Reset binding flag on model disposal so markDocumentReady works
      // correctly if the same file is re-opened after the model is discarded.
      isBindingReadyRef.current = false;
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

    // FIX 3: Extra epoch bump after cleanup() so any in-flight async work from
    // the previous room (e.g. the monacoBindingPromise.then continuation) sees
    // a mismatched requestId and self-aborts before touching the new refs.
    bindingRequestRef.current += 1;
    disposedRef.current = false;

    // FIX B: Capture initialContent synchronously at effect start time into a
    // local const. This value is what we actually want to seed — the value that
    // was current when the user clicked the file. Reading only from
    // initialContentRef.current later (at seed time) is risky because the ref
    // can be overwritten by a re-render that happens between now and when the
    // WS syncs (e.g. triggered by useRoomState receiving the remote tree).
    // We still keep the ref for the late-seed path, but the connection-startup
    // seed path below uses this captured snapshot.
    const capturedInitialContent = initialContent;

    const wsUrl = resolveRealtimeWsUrl();
    logEditorFlow("realtime-editor", "connect:start", {
      roomId,
      userId,
      wsUrl,
      hasInitialContent: capturedInitialContent !== undefined,
    });

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

    // FIX B (continued): seedWithCapturedContent uses the value captured at
    // effect-start time, not whatever initialContentRef.current is at the
    // moment the WS sync event fires (which may be undefined if the tree was
    // re-rendered in the interim).
    const seedWithCapturedContent = () => {
      const ydocCurrent = ydocRef.current;
      if (!ydocCurrent || !providerSyncedRef.current) return;
      logEditorFlow("realtime-editor", "seed:captured-attempt", {
        roomId,
        hasInitialContent: capturedInitialContent !== undefined,
        initialContentLength: capturedInitialContent?.length ?? 0,
      });
      seedYTextIfEmpty(ydocCurrent, capturedInitialContent);
    };

    const syncHandler = (isSynced: boolean) => {
      if (disposedRef.current || providerRef.current !== provider) return;
      providerSyncedRef.current = isSynced;
      logEditorFlow("realtime-editor", "sync:event", {
        roomId,
        isSynced,
        hasInitialContent: capturedInitialContent !== undefined,
      });
      if (isSynced) {
        // FIX 2: Set isSyncedRef then call markDocumentReady. If the binding
        // is already set up, this call completes the ready sequence.
        isSyncedRef.current = true;
        // Seed using the captured snapshot first, then fall back to the ref
        // (handles late-arriving content from GitHub lazy loading).
        seedWithCapturedContent();
        // Also run the ref-based seed so that content arriving after this
        // effect (e.g. GitHub file fetch completing) still gets applied.
        maybeSeedInitialContent();
        markDocumentReady();
      }
    };

    provider.on("sync", syncHandler);
    providerSyncedRef.current = provider.synced;
    if (provider.synced) {
      isSyncedRef.current = true;
      seedWithCapturedContent();
      maybeSeedInitialContent();
      markDocumentReady();
    }

    // Set local awareness state (used by y-monaco for remote cursor display)
    const color = getUserColor(userId);
    provider.awareness.setLocalStateField("user", {
      name: username,
      color,
      userId,
    });

    // FIX 4: Call createBinding directly (no setTimeout) — refs are already
    // committed synchronously above. setTimeout added an unnecessary task-queue
    // delay that widened the window where the sync event could fire before the
    // binding existed, causing markDocumentReady to exit early from both paths.
    if (editorRef.current) {
      void createBinding();
    }

    return () => {
      provider.off("sync", syncHandler);
      cleanup();
    };
  }, [
    roomId,
    userId,
    username,
    initialContent,
    cleanup,
    createBinding,
    markDocumentReady,
    maybeSeedInitialContent,
  ]);

  // ── Seed content when it arrives late (e.g. GitHub lazy-loaded files) ────
  // This covers the case where initialContent changes from undefined to a real
  // value after the WS is already synced (GitHub file fetch completing after
  // the connection is established).
  useEffect(() => {
    maybeSeedInitialContent();
  }, [maybeSeedInitialContent, initialContent]);

  // Bind editor callback — stores the editor ref and attempts binding.
  const bindEditor = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      logEditorFlow("realtime-editor", "editor:mounted", {
        roomId: roomIdRef.current ?? "none",
      });
      void createBinding();
    },
    [createBinding]
  );

  return {
    bindEditor,
    isDocumentReady: !!roomId && readyRoomId === roomId,
  };
}
"use client";

import { useEffect, useRef, useCallback } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { MonacoBinding } from "y-monaco";
import type * as Monaco from "monaco-editor";

// ── Cursor color palette ──────────────────────────────────────────────────

const CURSOR_COLORS = [
  "#f87171", // red
  "#fb923c", // orange
  "#facc15", // yellow
  "#4ade80", // green
  "#22d3ee", // cyan
  "#60a5fa", // blue
  "#a78bfa", // violet
  "#f472b6", // pink
  "#34d399", // emerald
  "#fbbf24", // amber
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

// ── Hook ──────────────────────────────────────────────────────────────────

interface UseRealtimeEditorOptions {
  roomId: string | null;
  userInfo: { userId: string; username: string } | null;
  /** Content to seed into an empty Y.Doc (from file tree / GitHub import). */
  initialContent?: string;
}

interface UseRealtimeEditorReturn {
  /** Bind a Monaco editor instance to the CRDT document. Call on editor mount. */
  bindEditor: (editor: Monaco.editor.IStandaloneCodeEditor) => void;
}

export function useRealtimeEditor({
  roomId,
  userInfo,
  initialContent,
}: UseRealtimeEditorOptions): UseRealtimeEditorReturn {
  const providerRef = useRef<WebsocketProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const disposedRef = useRef(false);

  // Keep initialContent in a ref so it's always current when createBinding
  // runs, regardless of render/effect timing. This avoids stale closures.
  const initialContentRef = useRef<string | undefined>(initialContent);
  initialContentRef.current = initialContent;

  // Clean up current connection
  const cleanup = useCallback(() => {
    disposedRef.current = true;
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

    // Seed the Y.Text with initial file content if the document is empty
    // (no persisted state from the server). This ensures existing file content
    // from the tree / GitHub import appears in the editor.
    if (ytext.length === 0 && initialContentRef.current) {
      ytext.insert(0, initialContentRef.current);
    }

    // Dynamically import y-monaco to avoid SSR issues (it imports monaco-editor which requires window)
    const { MonacoBinding } = await import("y-monaco");

    // Guard: if cleanup ran while the import was in-flight, don't create a binding
    if (disposedRef.current) return;

    bindingRef.current = new MonacoBinding(
      ytext,
      model,
      new Set([editor]),
      provider.awareness
    );

    // y-monaco auto-destroys itself via model.onWillDispose when the Monaco editor
    // unmounts. Null out our ref so cleanup() doesn't call destroy() a second time
    // (which triggers yjs's "Tried to remove event handler" console.error).
    model.onWillDispose(() => {
      bindingRef.current = null;
    });
  }, []);

  // Setup connection when roomId changes
  useEffect(() => {
    if (!roomId || !userInfo) {
      cleanup();
      return;
    }

    // Clean up previous connection
    cleanup();
    disposedRef.current = false;

    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ??
      (typeof window !== "undefined"
        ? `ws://${window.location.hostname}:4000`
        : "ws://localhost:4000");

    // Create new Y.Doc and WebSocket provider
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const provider = new WebsocketProvider(wsUrl, roomId, ydoc, {
      connect: true,
      params: {},
      maxBackoffTime: 10000,
    });
    providerRef.current = provider;

    // Set local awareness state (used by y-monaco for remote cursor display)
    const color = getUserColor(userInfo.userId);
    provider.awareness.setLocalStateField("user", {
      name: userInfo.username,
      color,
      userId: userInfo.userId,
    });

    // If we already have an editor, create binding immediately.
    // Use setTimeout so the Y.Doc and provider refs are fully committed.
    if (editorRef.current) {
      setTimeout(createBinding, 0);
    }

    return () => {
      cleanup();
    };
  }, [
    roomId,
    userInfo?.userId,
    userInfo?.username,
    cleanup,
    createBinding,
  ]);

  // ── Seed content when it arrives late (e.g. GitHub lazy-loaded files) ────
  // If the Y.Doc exists and is empty but we now have content, insert it.
  useEffect(() => {
    const ydoc = ydocRef.current;
    if (!ydoc || !initialContent) return;
    const ytext = ydoc.getText("content");
    if (ytext.length === 0) {
      ytext.insert(0, initialContent);
    }
  }, [initialContent]);

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
  };
}

/**
 * IUDEX Realtime Collaboration Server
 *
 * A WebSocket server that speaks the y-websocket protocol (v3 compatible).
 * Each document room is backed by a Y.Doc instance, with optional Redis
 * pub/sub for horizontal scaling and Supabase for persistence.
 */

import "dotenv/config";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

import { createPersistence } from "./persistence.js";
import {
  createPubSub,
  wireDocToPubSub,
  unwireDocFromPubSub,
  type PubSubService,
} from "./redis.js";

// ── Message types (must match y-websocket client) ─────────────────────────

const messageSync = 0;
const messageAwareness = 1;
const messageAuth = 2;
const messageQueryAwareness = 3;
const HEARTBEAT_INTERVAL_MS = 30000;
const ROOM_CLOSE_GRACE_MS = 30000;

// ── Document Room ─────────────────────────────────────────────────────────

interface WSClient extends WebSocket {
  isAlive?: boolean;
  docNames?: Set<string>;
}

interface DocumentRoom {
  ydoc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  clients: Set<WSClient>;
  clientAwarenessIds: Map<WSClient, Set<number>>;
  isDirty: boolean;
  persistVersion: number;
  persistInFlight: Promise<void> | null;
  closeTimer: ReturnType<typeof setTimeout> | null;
  lastPersistedAt: string | null;
  updateHandler: (update: Uint8Array, origin: unknown) => void;
  awarenessUpdateHandler: (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) => void;
}

const docs = new Map<string, DocumentRoom>();
let isShuttingDown = false;

// ── Persistence & PubSub ──────────────────────────────────────────────────

const persistence = createPersistence();
let pubsub: PubSubService;

function clearRoomCloseTimer(room: DocumentRoom): void {
  if (room.closeTimer) {
    clearTimeout(room.closeTimer);
    room.closeTimer = null;
  }
}

function markRoomDirty(_docName: string, room: DocumentRoom): void {
  room.isDirty = true;
  room.persistVersion += 1;
}

async function persistRoom(
  docName: string,
  room: DocumentRoom,
  options: { reason: string; force?: boolean; flushTail?: boolean }
): Promise<boolean> {
  const force = options.force ?? false;
  const flushTail = options.flushTail ?? false;

  if (room.persistInFlight) {
    await room.persistInFlight;
  }

  if (!force && !room.isDirty) {
    return true;
  }

  const snapshotVersion = room.persistVersion;
  let didPersist = false;

  const writeOperation = (async () => {
    didPersist = await persistence.writeState(docName, room.ydoc);

    if (!didPersist) {
      return;
    }

    room.lastPersistedAt = new Date().toISOString();
    if (room.persistVersion === snapshotVersion) {
      room.isDirty = false;
    }
  })();

  room.persistInFlight = writeOperation;

  try {
    await writeOperation;
  } finally {
    if (room.persistInFlight === writeOperation) {
      room.persistInFlight = null;
    }
  }

  if (!didPersist) {
    return false;
  }

  if (!room.isDirty) {
    return true;
  }

  if (flushTail) {
    return persistRoom(docName, room, {
      reason: `${options.reason}:follow-up`,
      flushTail: true,
    });
  }

  return true;
}

// ── Room management ───────────────────────────────────────────────────────

async function getOrCreateRoom(docName: string): Promise<DocumentRoom> {
  let room = docs.get(docName);
  if (room) return room;

  const ydoc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(ydoc);

  // Load persisted state
  await persistence.bindState(docName, ydoc);

  room = {
    ydoc,
    awareness,
    clients: new Set(),
    clientAwarenessIds: new Map(),
    isDirty: false,
    persistVersion: 0,
    persistInFlight: null,
    closeTimer: null,
    lastPersistedAt: null,
    updateHandler: (update: Uint8Array, origin: unknown) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);
      const excludeConn =
        origin && room?.clients.has(origin as WSClient)
          ? (origin as WSClient)
          : undefined;
      broadcastToRoom(room!, message, excludeConn);
      markRoomDirty(docName, room!);
    },
    awarenessUpdateHandler: (
      {
        added,
        updated,
        removed,
      }: {
        added: number[];
        updated: number[];
        removed: number[];
      },
      origin: unknown
    ) => {
      const changedClients = [...added, ...updated, ...removed];
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(room!.awareness, changedClients)
      );
      const excludeConn =
        origin && room?.clients.has(origin as WSClient)
          ? (origin as WSClient)
          : undefined;
      broadcastToRoom(room!, encoding.toUint8Array(encoder), excludeConn);
    },
  };
  docs.set(docName, room);

  room.ydoc.on("update", room.updateHandler);
  room.awareness.on("update", room.awarenessUpdateHandler);

  // Wire to pub/sub for cross-server sync
  if (pubsub) {
    wireDocToPubSub(docName, ydoc, pubsub);
  }

  console.log(`[room] Created room: ${docName}`);
  return room;
}

async function closeRoom(docName: string): Promise<void> {
  const room = docs.get(docName);
  if (!room) return;

  clearRoomCloseTimer(room);
  const persisted = await persistRoom(docName, room, {
    reason: "room-close",
    flushTail: true,
  });

  if (!persisted && room.isDirty) {
    console.warn(
      `[room] Preserving dirty room in memory after failed close persistence: ${docName}`
    );
    return;
  }

  // Clean up pub/sub
  if (pubsub) {
    unwireDocFromPubSub(docName, pubsub);
  }

  // Clean up awareness
  awarenessProtocol.removeAwarenessStates(
    room.awareness,
    Array.from(room.awareness.getStates().keys()),
    null
  );

  room.ydoc.off("update", room.updateHandler);
  room.awareness.off("update", room.awarenessUpdateHandler);
  room.ydoc.destroy();
  docs.delete(docName);
  console.log(`[room] Closed room: ${docName}`);
}

// ── Send helpers ──────────────────────────────────────────────────────────

function send(conn: WSClient, message: Uint8Array): void {
  if (conn.readyState === WebSocket.OPEN) {
    conn.send(message, (err) => {
      if (err) console.error("[ws] Send error:", err);
    });
  }
}

function broadcastToRoom(
  room: DocumentRoom,
  message: Uint8Array,
  excludeConn?: WSClient
): void {
  room.clients.forEach((client) => {
    if (client !== excludeConn) {
      send(client, message);
    }
  });
}

// ── Sync a new client into a room ─────────────────────────────────────────

function initSync(conn: WSClient, room: DocumentRoom): void {
  // Send sync step 1 (our state vector)
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeSyncStep1(encoder, room.ydoc);
  send(conn, encoding.toUint8Array(encoder));

  // Send current awareness states
  const awarenessStates = room.awareness.getStates();
  if (awarenessStates.size > 0) {
    const encoder2 = encoding.createEncoder();
    encoding.writeVarUint(encoder2, messageAwareness);
    encoding.writeVarUint8Array(
      encoder2,
      awarenessProtocol.encodeAwarenessUpdate(
        room.awareness,
        Array.from(awarenessStates.keys())
      )
    );
    send(conn, encoding.toUint8Array(encoder2));
  }
}

function decodeAwarenessClients(update: Uint8Array): {
  addedOrUpdated: number[];
  removed: number[];
} {
  const decoder = decoding.createDecoder(update);
  const addedOrUpdated: number[] = [];
  const removed: number[] = [];
  const len = decoding.readVarUint(decoder);

  for (let i = 0; i < len; i += 1) {
    const clientId = decoding.readVarUint(decoder);
    decoding.readVarUint(decoder); // awareness clock
    const rawState = decoding.readVarString(decoder);

    if (rawState === "null") {
      removed.push(clientId);
    } else {
      addedOrUpdated.push(clientId);
    }
  }

  return { addedOrUpdated, removed };
}

// ── Message handler ───────────────────────────────────────────────────────

function handleMessage(
  conn: WSClient,
  room: DocumentRoom,
  message: Uint8Array
): void {
  try {
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case messageSync: {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(
          decoder,
          encoder,
          room.ydoc,
          conn
        );

        // If the response encoder has content, send it back
        if (encoding.length(encoder) > 1) {
          send(conn, encoding.toUint8Array(encoder));
        }

        // If this was a sync step 2 or update, broadcast the update
        // The Y.Doc 'update' event handler will take care of broadcasting
        break;
      }

      case messageAwareness: {
        const update = decoding.readVarUint8Array(decoder);
        const trackedIds =
          room.clientAwarenessIds.get(conn) ?? new Set<number>();
        room.clientAwarenessIds.set(conn, trackedIds);

        const { addedOrUpdated, removed } = decodeAwarenessClients(update);
        addedOrUpdated.forEach((clientId) => trackedIds.add(clientId));
        removed.forEach((clientId) => trackedIds.delete(clientId));

        awarenessProtocol.applyAwarenessUpdate(
          room.awareness,
          update,
          conn
        );
        break;
      }

      case messageQueryAwareness: {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(
            room.awareness,
            Array.from(room.awareness.getStates().keys())
          )
        );
        send(conn, encoding.toUint8Array(encoder));
        break;
      }

      case messageAuth:
        // Auth message -- we handle auth at connection level, not per-message
        break;

      default:
        console.warn(`[ws] Unknown message type: ${messageType}`);
    }
  } catch (err) {
    console.error("[ws] Error handling message:", err);
  }
}

// ── Connection handler ────────────────────────────────────────────────────

async function handleConnection(
  conn: WSClient,
  req: http.IncomingMessage
): Promise<void> {
  // Extract room name from URL path: /ws/{docName}
  // The docName may contain colons and slashes (encoded as %2F)
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const pathParts = url.pathname.split("/").filter(Boolean);

  // Expect: /ws/{docName} or just /{docName}
  let docName: string;
  if (pathParts[0] === "ws" && pathParts.length >= 2) {
    docName = decodeURIComponent(pathParts.slice(1).join("/"));
  } else if (pathParts.length >= 1) {
    docName = decodeURIComponent(pathParts.join("/"));
  } else {
    console.error("[ws] No document name in URL:", req.url);
    conn.close(4400, "Missing document name");
    return;
  }

  conn.isAlive = true;
  conn.docNames = conn.docNames ?? new Set();
  conn.docNames.add(docName);

  // Setup ping/pong
  conn.on("pong", () => {
    conn.isAlive = true;
  });

  // Get or create room
  const room = await getOrCreateRoom(docName);
  clearRoomCloseTimer(room);
  room.clients.add(conn);
  room.clientAwarenessIds.set(conn, new Set());

  // Send initial sync
  initSync(conn, room);

  // Handle incoming messages
  conn.on("message", (data: Buffer | ArrayBuffer | Buffer[]) => {
    let message: Uint8Array;
    if (Array.isArray(data)) {
      message = new Uint8Array(Buffer.concat(data as Uint8Array[]));
    } else {
      message = new Uint8Array(data as ArrayBuffer);
    }
    handleMessage(conn, room, message);
  });

  // Handle disconnect
  conn.on("close", () => {
    room.clients.delete(conn);
    const trackedAwarenessIds = Array.from(
      room.clientAwarenessIds.get(conn) ?? []
    );
    room.clientAwarenessIds.delete(conn);

    // Remove awareness state for this client
    if (trackedAwarenessIds.length > 0) {
      awarenessProtocol.removeAwarenessStates(
        room.awareness,
        trackedAwarenessIds,
        conn
      );
    }

    console.log(
      `[ws] Client disconnected from ${docName} (${room.clients.size} remaining)`
    );

    // Close room if empty
    if (!isShuttingDown && room.clients.size === 0) {
      // Delay cleanup to allow reconnections
      room.closeTimer = setTimeout(async () => {
        room.closeTimer = null;
        const currentRoom = docs.get(docName);
        if (currentRoom && currentRoom.clients.size === 0) {
          await closeRoom(docName);
        }
      }, ROOM_CLOSE_GRACE_MS);
    }
  });

  console.log(
    `[ws] Client connected to ${docName} (${room.clients.size} clients)`
  );
}

// ── Server setup ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const PORT = parseInt(process.env.REALTIME_WS_PORT ?? "4000", 10);

  // Initialize pub/sub
  pubsub = await createPubSub(process.env.REDIS_URL);

  // Create HTTP + WS server
  const httpServer = http.createServer((_req, res) => {
    const roomSummaries = Array.from(docs.entries()).map(([roomId, room]) => ({
      roomId,
      clients: room.clients.size,
      dirty: room.isDirty,
      lastPersistedAt: room.lastPersistedAt,
    }));

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        rooms: docs.size,
        totalClients: Array.from(docs.values()).reduce(
          (sum, r) => sum + r.clients.size,
          0
        ),
        dirtyRooms: roomSummaries.filter((room) => room.dirty).length,
        roomCloseGraceMs: ROOM_CLOSE_GRACE_MS,
        roomSummaries,
      })
    );
  });

  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (ws: WSClient, req: http.IncomingMessage) => {
    handleConnection(ws, req).catch((err) => {
      console.error("[ws] Connection setup error:", err);
      ws.close(4500, "Internal server error");
    });
  });

  // Heartbeat: detect dead connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as WSClient;
      if (client.isAlive === false) {
        client.terminate();
        return;
      }
      client.isAlive = false;
      client.ping();
    });
  }, HEARTBEAT_INTERVAL_MS);

  // Graceful shutdown
  const shutdown = async () => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    console.log("\n[server] Shutting down...");
    clearInterval(heartbeatInterval);

    // Stop accepting more in-flight work from existing sockets.
    wss.clients.forEach((ws) => ws.close());

    // Persist all rooms
    for (const [docName, room] of docs) {
      try {
        clearRoomCloseTimer(room);
        await persistRoom(docName, room, {
          reason: "shutdown",
          flushTail: true,
        });
      } catch (err) {
        console.error(`[persistence] Shutdown save failed for ${docName}:`, err);
      }
    }

    // Clean up pub/sub
    if (pubsub) {
      await pubsub.destroy();
    }

    httpServer.close(() => {
      console.log("[server] Server closed");
      process.exit(0);
    });

    // Force exit after 5s
    setTimeout(() => process.exit(1), 5000);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  httpServer.listen(PORT, () => {
    console.log(`[server] IUDEX Realtime Server listening on port ${PORT}`);
    console.log(
      `[server] Redis: ${process.env.REDIS_URL ? "enabled" : "disabled (in-memory)"}`
    );
    console.log(
      `[server] Persistence: ${process.env.SUPABASE_URL ? "enabled (Supabase)" : "disabled"}`
    );
    console.log(
      "[server] Persistence policy: room-empty flush + shutdown flush"
    );
  });
}

main().catch((err) => {
  console.error("[server] Fatal error:", err);
  process.exit(1);
});

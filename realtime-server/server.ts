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

// ── Document Room ─────────────────────────────────────────────────────────

interface WSClient extends WebSocket {
  isAlive?: boolean;
  docNames?: Set<string>;
}

interface DocumentRoom {
  ydoc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  clients: Set<WSClient>;
}

const docs = new Map<string, DocumentRoom>();

// ── Persistence & PubSub ──────────────────────────────────────────────────

const persistence = createPersistence();
let pubsub: PubSubService;

// ── Room management ───────────────────────────────────────────────────────

async function getOrCreateRoom(docName: string): Promise<DocumentRoom> {
  let room = docs.get(docName);
  if (room) return room;

  const ydoc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(ydoc);

  // Load persisted state
  await persistence.bindState(docName, ydoc);

  room = { ydoc, awareness, clients: new Set() };
  docs.set(docName, room);

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

  // Persist before closing
  await persistence.writeState(docName, room.ydoc);

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
        const syncMessageType = syncProtocol.readSyncMessage(
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
  room.clients.add(conn);

  // Wire Y.Doc updates to broadcast to room clients
  const updateHandler = (update: Uint8Array, origin: unknown) => {
    // Don't echo back to the origin client
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);
    broadcastToRoom(room, message, origin === conn ? conn : undefined);
  };
  room.ydoc.on("update", updateHandler);

  // Wire awareness updates to broadcast
  const awarenessChangeHandler = (
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
      awarenessProtocol.encodeAwarenessUpdate(room.awareness, changedClients)
    );
    broadcastToRoom(
      room,
      encoding.toUint8Array(encoder),
      origin === conn ? conn : undefined
    );
  };
  room.awareness.on("update", awarenessChangeHandler);

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
    room.ydoc.off("update", updateHandler);
    room.awareness.off("update", awarenessChangeHandler);
    room.clients.delete(conn);

    // Remove awareness state for this client
    awarenessProtocol.removeAwarenessStates(
      room.awareness,
      [room.ydoc.clientID],
      null
    );

    console.log(
      `[ws] Client disconnected from ${docName} (${room.clients.size} remaining)`
    );

    // Close room if empty
    if (room.clients.size === 0) {
      // Delay cleanup to allow reconnections
      setTimeout(async () => {
        const currentRoom = docs.get(docName);
        if (currentRoom && currentRoom.clients.size === 0) {
          await closeRoom(docName);
        }
      }, 30000); // 30s grace period
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
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        rooms: docs.size,
        totalClients: Array.from(docs.values()).reduce(
          (sum, r) => sum + r.clients.size,
          0
        ),
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
  }, 30000);

  // Periodic persistence: save all active rooms every 30s
  const persistInterval = setInterval(async () => {
    for (const [docName, room] of docs) {
      if (room.clients.size > 0) {
        try {
          await persistence.writeState(docName, room.ydoc);
        } catch (err) {
          console.error(
            `[persistence] Periodic save failed for ${docName}:`,
            err
          );
        }
      }
    }
  }, 30000);

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\n[server] Shutting down...");
    clearInterval(heartbeatInterval);
    clearInterval(persistInterval);

    // Persist all rooms
    for (const [docName, room] of docs) {
      try {
        await persistence.writeState(docName, room.ydoc);
      } catch (err) {
        console.error(`[persistence] Shutdown save failed for ${docName}:`, err);
      }
    }

    // Close all connections
    wss.clients.forEach((ws) => ws.close());

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
  });
}

main().catch((err) => {
  console.error("[server] Fatal error:", err);
  process.exit(1);
});

import { EventEmitter } from "events";
import Redis from "ioredis";
import * as Y from "yjs";

// ── PubSub Interface ──────────────────────────────────────────────────────────

export interface PubSubService {
  /**
   * Subscribe to updates for a document room.
   * The callback receives raw Yjs update bytes.
   */
  subscribe(
    roomId: string,
    onUpdate: (update: Uint8Array) => void
  ): Promise<void>;

  /** Unsubscribe from a document room. */
  unsubscribe(roomId: string): Promise<void>;

  /** Publish a Yjs update to other servers for this room. */
  publish(roomId: string, update: Uint8Array): Promise<void>;

  /** Clean shutdown. */
  destroy(): Promise<void>;
}

// ── Memory PubSub (single-server development fallback) ────────────────────────

class MemoryPubSub implements PubSubService {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
    console.log("[pubsub] Using in-memory pub/sub (single-server mode)");
  }

  async subscribe(
    roomId: string,
    onUpdate: (update: Uint8Array) => void
  ): Promise<void> {
    this.emitter.on(`doc:${roomId}`, onUpdate);
  }

  async unsubscribe(roomId: string): Promise<void> {
    this.emitter.removeAllListeners(`doc:${roomId}`);
  }

  async publish(roomId: string, update: Uint8Array): Promise<void> {
    this.emitter.emit(`doc:${roomId}`, update);
  }

  async destroy(): Promise<void> {
    this.emitter.removeAllListeners();
  }
}

// ── Redis PubSub (multi-server production) ────────────────────────────────────

class RedisPubSub implements PubSubService {
  private pub: Redis;
  private sub: Redis;
  private handlers = new Map<string, (update: Uint8Array) => void>();

  constructor(redisUrl: string) {
    this.pub = new Redis(redisUrl, { lazyConnect: true });
    this.sub = new Redis(redisUrl, { lazyConnect: true });

    this.sub.on("messageBuffer", (channelBuf: Buffer, messageBuf: Buffer) => {
      const channel = channelBuf.toString();
      const roomId = channel.replace("yjs:", "");
      const handler = this.handlers.get(roomId);
      if (handler) {
        handler(new Uint8Array(messageBuf));
      }
    });

    console.log("[pubsub] Using Redis pub/sub for horizontal scaling");
  }

  async connect(): Promise<void> {
    await this.pub.connect();
    await this.sub.connect();
    console.log("[pubsub] Redis connected");
  }

  async subscribe(
    roomId: string,
    onUpdate: (update: Uint8Array) => void
  ): Promise<void> {
    this.handlers.set(roomId, onUpdate);
    await this.sub.subscribe(`yjs:${roomId}`);
  }

  async unsubscribe(roomId: string): Promise<void> {
    this.handlers.delete(roomId);
    await this.sub.unsubscribe(`yjs:${roomId}`);
  }

  async publish(roomId: string, update: Uint8Array): Promise<void> {
    await this.pub.publish(`yjs:${roomId}`, Buffer.from(update) as unknown as string);
  }

  async destroy(): Promise<void> {
    this.handlers.clear();
    this.pub.disconnect();
    this.sub.disconnect();
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export async function createPubSub(
  redisUrl?: string
): Promise<PubSubService> {
  if (redisUrl) {
    const redisPubSub = new RedisPubSub(redisUrl);
    await redisPubSub.connect();
    return redisPubSub;
  }
  return new MemoryPubSub();
}

// ── Y.Doc <-> PubSub wiring ─────────────────────────────────────────────────

const subscribedDocs = new Set<string>();

/**
 * Wire a Y.Doc to the pub/sub layer so updates propagate across servers.
 * Call this after y-websocket creates/retrieves a doc for a room.
 */
export function wireDocToPubSub(
  roomId: string,
  ydoc: Y.Doc,
  pubsub: PubSubService
): void {
  if (subscribedDocs.has(roomId)) return;
  subscribedDocs.add(roomId);

  // Local updates -> publish to other servers
  ydoc.on("update", (update: Uint8Array, origin: unknown) => {
    // Only publish updates that originated from a WebSocket client (not from Redis)
    if (origin !== "redis") {
      pubsub.publish(roomId, update).catch((err) => {
        console.error(`[pubsub] Failed to publish update for ${roomId}:`, err);
      });
    }
  });

  // Remote updates -> apply to local Y.Doc
  pubsub
    .subscribe(roomId, (update: Uint8Array) => {
      Y.applyUpdate(ydoc, update, "redis");
    })
    .catch((err) => {
      console.error(`[pubsub] Failed to subscribe to ${roomId}:`, err);
    });
}

/**
 * Clean up pub/sub subscription for a room.
 */
export function unwireDocFromPubSub(
  roomId: string,
  pubsub: PubSubService
): void {
  subscribedDocs.delete(roomId);
  pubsub.unsubscribe(roomId).catch((err) => {
    console.error(`[pubsub] Failed to unsubscribe from ${roomId}:`, err);
  });
}

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as Y from "yjs";

interface PersistenceCallbacks {
  bindState: (docName: string, ydoc: Y.Doc) => Promise<void>;
  writeState: (docName: string, ydoc: Y.Doc) => Promise<boolean>;
}

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables"
      );
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

/**
 * Load persisted document state from Supabase and apply it to the Y.Doc.
 * Called by y-websocket when a new document room is created.
 */
async function bindState(docName: string, ydoc: Y.Doc): Promise<void> {
  const client = getClient();

  const { data, error } = await client
    .from("documents")
    .select("state_update")
    .eq("room_id", docName)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = "no rows returned" which is expected for new documents
    console.error(`[persistence] Error loading document ${docName}:`, error);
    return;
  }

  if (data?.state_update) {
    try {
      // Supabase stores bytea as hex-encoded string prefixed with \x
      const hex = data.state_update as string;
      const cleanHex = hex.startsWith("\\x") ? hex.slice(2) : hex;
      const update = Buffer.from(cleanHex, "hex");
      Y.applyUpdate(ydoc, new Uint8Array(update));
      console.log(`[persistence] Loaded document ${docName} (${update.length} bytes)`);
    } catch (e) {
      console.error(`[persistence] Failed to apply persisted state for ${docName}:`, e);
    }
  }
}

/**
 * Persist the current Y.Doc state to Supabase.
 * Called by y-websocket when all clients disconnect from a room.
 */
async function writeState(docName: string, ydoc: Y.Doc): Promise<boolean> {
  const client = getClient();

  const state = Y.encodeStateAsUpdate(ydoc);
  const hexString = "\\x" + Buffer.from(state).toString("hex");

  const { error } = await client.from("documents").upsert(
    {
      room_id: docName,
      state_update: hexString,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "room_id" }
  );

  if (error) {
    console.error(`[persistence] Error saving document ${docName}:`, error);
    return false;
  } else {
    console.log(`[persistence] Saved document ${docName} (${state.length} bytes)`);
    return true;
  }
}

/**
 * Create the persistence object expected by y-websocket's setPersistence.
 */
export function createPersistence(): PersistenceCallbacks {
  // Verify env vars are set
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.warn(
      "[persistence] SUPABASE_URL or SUPABASE_SERVICE_KEY not set. Persistence disabled."
    );
    return {
      bindState: async () => {},
      writeState: async () => true,
    };
  }

  console.log("[persistence] Supabase persistence enabled");
  return { bindState, writeState };
}

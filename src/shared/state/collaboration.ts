import { create } from "zustand";

export interface CollaboratorInfo {
  clientId: number;
  userId: string;
  username: string;
  color: string;
  cursor?: { lineNumber: number; column: number };
  activeFile?: string;
  activeFileId?: string;
}

export type CollaborationConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected";

export type CollaborationSyncStatus = "idle" | "syncing" | "synced";

interface CollaborationState {
  connectionStatus: CollaborationConnectionStatus;
  syncStatus: CollaborationSyncStatus;
  reconnectAttempt: number;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
  lastDisconnectReason: string | null;
  collaborators: CollaboratorInfo[];
  activeRoomId: string | null;

  updateConnection: (
    patch: Partial<
      Pick<
        CollaborationState,
        | "connectionStatus"
        | "syncStatus"
        | "reconnectAttempt"
        | "lastConnectedAt"
        | "lastDisconnectedAt"
        | "lastDisconnectReason"
      >
    >
  ) => void;
  resetConnection: () => void;
  setCollaborators: (collaborators: CollaboratorInfo[]) => void;
  setActiveRoomId: (roomId: string | null) => void;
}

export const useCollaborationStore = create<CollaborationState>((set) => ({
  connectionStatus: "disconnected",
  syncStatus: "idle",
  reconnectAttempt: 0,
  lastConnectedAt: null,
  lastDisconnectedAt: null,
  lastDisconnectReason: null,
  collaborators: [],
  activeRoomId: null,

  updateConnection: (patch) => set(patch),
  resetConnection: () =>
    set({
      connectionStatus: "disconnected",
      syncStatus: "idle",
      reconnectAttempt: 0,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      lastDisconnectReason: null,
    }),
  setCollaborators: (collaborators) => set({ collaborators }),
  setActiveRoomId: (roomId) => set({ activeRoomId: roomId }),
}));

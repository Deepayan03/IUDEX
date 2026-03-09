import { create } from "zustand";

export interface CollaboratorInfo {
  clientId: number;
  userId: string;
  username: string;
  color: string;
  cursor?: { lineNumber: number; column: number };
  activeFile?: string;
}

interface CollaborationState {
  connectionStatus: "disconnected" | "connecting" | "connected";
  collaborators: CollaboratorInfo[];
  activeRoomId: string | null;

  setConnectionStatus: (
    status: "disconnected" | "connecting" | "connected"
  ) => void;
  setCollaborators: (collaborators: CollaboratorInfo[]) => void;
  setActiveRoomId: (roomId: string | null) => void;
}

export const useCollaborationStore = create<CollaborationState>((set) => ({
  connectionStatus: "disconnected",
  collaborators: [],
  activeRoomId: null,

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setCollaborators: (collaborators) => set({ collaborators }),
  setActiveRoomId: (roomId) => set({ activeRoomId: roomId }),
}));

"use client";

const CURSOR_COLORS = [
  "#f87171",
  "#fb923c",
  "#facc15",
  "#4ade80",
  "#22d3ee",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#fbbf24",
];

export function getUserColor(userId: string): string {
  let hash = 0;

  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash << 5) - hash + userId.charCodeAt(index);
    hash |= 0;
  }

  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export function resolveRealtimeWsUrl(): string {
  return (
    process.env.NEXT_PUBLIC_WS_URL ??
    (typeof window !== "undefined"
      ? `ws://${window.location.hostname}:4000`
      : "ws://localhost:4000")
  );
}

export function buildFileRealtimeRoomId(roomId: string, fileId: string): string {
  return `${roomId}:file:${encodeURIComponent(fileId)}`;
}

export function describeCloseReason(event: CloseEvent | null): string {
  if (event?.reason) return event.reason;

  switch (event?.code) {
    case 1000:
      return "Collaboration session closed";
    case 1001:
      return "Server went away";
    case 1006:
      return "Network connection lost";
    case 1011:
      return "Collaboration server error";
    default:
      return "Connection lost";
  }
}

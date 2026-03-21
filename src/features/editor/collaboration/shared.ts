"use client";

const CURSOR_COLORS = [
  "#ff6b6b",
  "#ff8e3c",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#ef4444",
  "#fb7185",
  "#f97316",
  "#facc15",
  "#2dd4bf",
  "#38bdf8",
  "#818cf8",
];

interface AwarenessUserLike {
  name?: string;
  userId?: string;
}

interface AwarenessStateLike {
  user?: AwarenessUserLike;
}

function getStringHash(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function getUserColor(userId: string): string {
  return CURSOR_COLORS[getStringHash(userId) % CURSOR_COLORS.length];
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const normalizedSaturation = Math.max(0, Math.min(100, saturation)) / 100;
  const normalizedLightness = Math.max(0, Math.min(100, lightness)) / 100;

  const chroma =
    (1 - Math.abs(2 * normalizedLightness - 1)) * normalizedSaturation;
  const hueSegment = normalizedHue / 60;
  const x = chroma * (1 - Math.abs((hueSegment % 2) - 1));

  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSegment >= 0 && hueSegment < 1) {
    red = chroma;
    green = x;
  } else if (hueSegment < 2) {
    red = x;
    green = chroma;
  } else if (hueSegment < 3) {
    green = chroma;
    blue = x;
  } else if (hueSegment < 4) {
    green = x;
    blue = chroma;
  } else if (hueSegment < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const match = normalizedLightness - chroma / 2;

  const toHex = (value: number) =>
    Math.round((value + match) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function getDistinctCursorColor(identity: string, attempt: number): string {
  const hash = getStringHash(identity);

  if (attempt < CURSOR_COLORS.length) {
    const paletteIndex = (hash + attempt) % CURSOR_COLORS.length;
    return CURSOR_COLORS[paletteIndex];
  }

  const overflowAttempt = attempt - CURSOR_COLORS.length;
  const hue = (hash + overflowAttempt * 137.508) % 360;
  const saturation = 74 + (overflowAttempt % 3) * 4;
  const lightness = overflowAttempt % 2 === 0 ? 60 : 54;
  return hslToHex(hue, saturation, lightness);
}

export function buildDistinctPresenceColorMap(
  states: Map<number, unknown>,
): Map<number, string> {
  const participants: Array<{
    clientId: number;
    username: string;
    userId: string;
  }> = [];

  states.forEach((value, clientId) => {
    const state = value as AwarenessStateLike;
    if (!state.user) return;

    participants.push({
      clientId,
      username: state.user.name?.trim() || "Anonymous",
      userId: state.user.userId?.trim() || `client-${clientId}`,
    });
  });

  participants.sort((left, right) => {
    const userIdComparison = left.userId.localeCompare(right.userId);
    if (userIdComparison !== 0) return userIdComparison;

    const usernameComparison = left.username.localeCompare(right.username);
    if (usernameComparison !== 0) return usernameComparison;

    return left.clientId - right.clientId;
  });

  const usedColors = new Set<string>();
  const colorMap = new Map<number, string>();

  participants.forEach((participant) => {
    const identity = `${participant.userId}:${participant.clientId}`;
    let attempt = 0;
    let color = getDistinctCursorColor(identity, attempt);

    while (usedColors.has(color)) {
      attempt += 1;
      color = getDistinctCursorColor(identity, attempt);
    }

    usedColors.add(color);
    colorMap.set(participant.clientId, color);
  });

  return colorMap;
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

const STORAGE_KEY = "iudex-room-history"
const MAX_ENTRIES = 50

export interface RoomHistoryEntry {
  roomId: string
  name: string
  lastVisited: number
}

export function getRoomHistory(): RoomHistoryEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const entries: RoomHistoryEntry[] = JSON.parse(raw)
    return entries.sort((a, b) => b.lastVisited - a.lastVisited)
  } catch {
    return []
  }
}

export function addRoomToHistory(roomId: string, name?: string): void {
  if (typeof window === "undefined") return
  const history = getRoomHistory()
  const idx = history.findIndex(e => e.roomId === roomId)
  if (idx !== -1) {
    history[idx].lastVisited = Date.now()
    if (name !== undefined && name !== "") history[idx].name = name
  } else {
    history.unshift({ roomId, name: name ?? "", lastVisited: Date.now() })
  }
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(history.slice(0, MAX_ENTRIES))
  )
}

export function removeRoomFromHistory(roomId: string): void {
  if (typeof window === "undefined") return
  const history = getRoomHistory().filter(e => e.roomId !== roomId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
}

export function generateRoomId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function extractRoomIdFromInput(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const editorMatch = trimmed.match(/\/editor\/([a-z0-9]+)/i)
  if (editorMatch) return editorMatch[1]

  if (/^[a-z0-9]{4,20}$/i.test(trimmed)) return trimmed

  return null
}

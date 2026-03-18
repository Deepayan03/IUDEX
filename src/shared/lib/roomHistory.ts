const STORAGE_KEY = "iudex-room-history"
const MAX_ENTRIES = 50
const CHANGE_EVENT = "iudex-room-history-change"
const EMPTY_HISTORY: RoomHistoryEntry[] = []

let cachedRaw: string | null | undefined
let cachedHistory: RoomHistoryEntry[] = EMPTY_HISTORY

export interface RoomHistoryEntry {
  roomId: string
  name: string
  lastVisited: number
}

export function getRoomHistoryServerSnapshot(): RoomHistoryEntry[] {
  return EMPTY_HISTORY
}

export function getRoomHistory(): RoomHistoryEntry[] {
  if (typeof window === "undefined") return EMPTY_HISTORY
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === cachedRaw) return cachedHistory

    cachedRaw = raw

    if (!raw) {
      cachedHistory = EMPTY_HISTORY
      return cachedHistory
    }

    const entries: RoomHistoryEntry[] = JSON.parse(raw)
    cachedHistory = [...entries].sort((a, b) => b.lastVisited - a.lastVisited)
    return cachedHistory
  } catch {
    cachedRaw = null
    cachedHistory = EMPTY_HISTORY
    return cachedHistory
  }
}

function notifyRoomHistoryChange(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function subscribeToRoomHistory(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {}

  const handler = (event: Event) => {
    if (event instanceof StorageEvent && event.key && event.key !== STORAGE_KEY) {
      return
    }
    callback()
  }

  window.addEventListener("storage", handler)
  window.addEventListener(CHANGE_EVENT, handler)

  return () => {
    window.removeEventListener("storage", handler)
    window.removeEventListener(CHANGE_EVENT, handler)
  }
}

export function addRoomToHistory(roomId: string, name?: string): void {
  if (typeof window === "undefined") return
  const history = [...getRoomHistory()]
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
  notifyRoomHistoryChange()
}

export function removeRoomFromHistory(roomId: string): void {
  if (typeof window === "undefined") return
  const history = getRoomHistory().filter(e => e.roomId !== roomId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  notifyRoomHistoryChange()
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

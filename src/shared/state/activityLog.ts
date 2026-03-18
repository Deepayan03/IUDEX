import { create } from "zustand"
import type { ActivityLogEntry } from "@/features/editor/activity-log/types"

interface ActivityLogState {
  entries: ActivityLogEntry[]
  isLoading: boolean
  hasMore: boolean

  addEntry: (entry: ActivityLogEntry) => void
  addEntries: (entries: ActivityLogEntry[]) => void
  setEntries: (entries: ActivityLogEntry[]) => void
  appendOlderEntries: (entries: ActivityLogEntry[]) => void
  markUndone: (entryId: string) => void
  setLoading: (v: boolean) => void
  setHasMore: (v: boolean) => void
  clear: () => void
}

export const useActivityLogStore = create<ActivityLogState>((set) => ({
  entries: [],
  isLoading: false,
  hasMore: true,

  addEntry: (entry) =>
    set((s) => ({ entries: [entry, ...s.entries] })),

  addEntries: (newEntries) =>
    set((s) => {
      const existingIds = new Set(s.entries.map((e) => e.id))
      const unique = newEntries.filter((e) => !existingIds.has(e.id))
      if (unique.length === 0) return s
      return { entries: [...unique, ...s.entries].sort((a, b) => b.timestamp - a.timestamp) }
    }),

  setEntries: (entries) => set({ entries }),

  appendOlderEntries: (older) =>
    set((s) => {
      const existingIds = new Set(s.entries.map((e) => e.id))
      const unique = older.filter((e) => !existingIds.has(e.id))
      return { entries: [...s.entries, ...unique] }
    }),

  markUndone: (entryId) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === entryId ? { ...e, undone: true } : e
      ),
    })),

  setLoading: (v) => set({ isLoading: v }),
  setHasMore: (v) => set({ hasMore: v }),
  clear: () => set({ entries: [], hasMore: true, isLoading: false }),
}))

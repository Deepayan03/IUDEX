import { create } from "zustand"
import type { InlineCreate } from "@/features/editor/lib/types"

interface EditorTabsState {
  // State
  activeFileId: string | null
  openTabIds: string[]
  unsavedIds: Set<string>
  inlineCreate: InlineCreate
  loadingFileId: string | null
  cursorLine: number
  cursorCol: number

  // Actions
  setActiveFileId: (id: string | null) => void
  setOpenTabIds: (ids: string[] | ((prev: string[]) => string[])) => void
  addTabId: (id: string) => void
  removeTab: (id: string) => void
  closeAllTabs: () => void
  markDirty: (id: string) => void
  markClean: (id: string) => void
  clearAllDirty: () => void
  setInlineCreate: (v: InlineCreate) => void
  setLoadingFileId: (id: string | null) => void
  setCursorPosition: (line: number, col: number) => void
}

export const useEditorTabsStore = create<EditorTabsState>((set) => ({
  activeFileId: null,
  openTabIds: [],
  unsavedIds: new Set(),
  inlineCreate: null,
  loadingFileId: null,
  cursorLine: 1,
  cursorCol: 1,

  setActiveFileId: (id) => set({ activeFileId: id }),
  setOpenTabIds: (ids) =>
    set((s) => ({
      openTabIds: typeof ids === "function" ? ids(s.openTabIds) : ids,
    })),
  addTabId: (id) =>
    set((s) => ({
      openTabIds: s.openTabIds.includes(id)
        ? s.openTabIds
        : [...s.openTabIds, id],
    })),
  removeTab: (id) =>
    set((s) => {
      const next = s.openTabIds.filter((tabId) => tabId !== id)
      const unsaved = new Set(s.unsavedIds)
      unsaved.delete(id)
      return {
        openTabIds: next,
        unsavedIds: unsaved,
        activeFileId:
          s.activeFileId === id
            ? next[next.length - 1] ?? null
            : s.activeFileId,
      }
    }),
  closeAllTabs: () =>
    set({ openTabIds: [], activeFileId: null, unsavedIds: new Set() }),
  markDirty: (id) =>
    set((s) => {
      const next = new Set(s.unsavedIds)
      next.add(id)
      return { unsavedIds: next }
    }),
  markClean: (id) =>
    set((s) => {
      const next = new Set(s.unsavedIds)
      next.delete(id)
      return { unsavedIds: next }
    }),
  clearAllDirty: () => set({ unsavedIds: new Set() }),
  setInlineCreate: (v) => set({ inlineCreate: v }),
  setLoadingFileId: (id) => set({ loadingFileId: id }),
  setCursorPosition: (line, col) =>
    set({ cursorLine: line, cursorCol: col }),
}))

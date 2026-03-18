import { create } from "zustand"
import type { FileNode, InlineCreate } from "@/features/editor/lib/types"

interface EditorTabsState {
  // State
  activeFile: FileNode | null
  openTabs: FileNode[]
  unsavedIds: Set<string>
  inlineCreate: InlineCreate
  loadingFileId: string | null
  cursorLine: number
  cursorCol: number

  // Actions
  setActiveFile: (file: FileNode | null) => void
  setOpenTabs: (tabs: FileNode[] | ((prev: FileNode[]) => FileNode[])) => void
  addTab: (file: FileNode) => void
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
  activeFile: null,
  openTabs: [],
  unsavedIds: new Set(),
  inlineCreate: null,
  loadingFileId: null,
  cursorLine: 1,
  cursorCol: 1,

  setActiveFile: (file) => set({ activeFile: file }),
  setOpenTabs: (tabs) =>
    set((s) => ({
      openTabs: typeof tabs === "function" ? tabs(s.openTabs) : tabs,
    })),
  addTab: (file) =>
    set((s) => ({
      openTabs: s.openTabs.find((t) => t.id === file.id)
        ? s.openTabs
        : [...s.openTabs, file],
    })),
  removeTab: (id) =>
    set((s) => {
      const next = s.openTabs.filter((t) => t.id !== id)
      const unsaved = new Set(s.unsavedIds)
      unsaved.delete(id)
      return {
        openTabs: next,
        unsavedIds: unsaved,
        activeFile:
          s.activeFile?.id === id
            ? next[next.length - 1] ?? null
            : s.activeFile,
      }
    }),
  closeAllTabs: () =>
    set({ openTabs: [], activeFile: null, unsavedIds: new Set() }),
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

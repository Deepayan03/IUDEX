import { create } from "zustand"
import type { EditorPrefs } from "@/features/editor/lib/types"
import { DEFAULT_PREFS, loadPrefs, savePrefs } from "@/features/editor/lib/types"

interface PreferencesState {
  prefs: EditorPrefs
  prefsOpen: boolean

  setPrefs: (prefs: EditorPrefs) => void
  updatePref: <K extends keyof EditorPrefs>(
    key: K,
    value: EditorPrefs[K]
  ) => void
  openPrefs: () => void
  closePrefs: () => void
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  prefs: typeof window !== "undefined" ? loadPrefs() : DEFAULT_PREFS,
  prefsOpen: false,

  setPrefs: (prefs) => {
    set({ prefs })
    savePrefs(prefs)
  },
  updatePref: (key, value) =>
    set((s) => {
      const next = { ...s.prefs, [key]: value }
      savePrefs(next)
      return { prefs: next }
    }),
  openPrefs: () => set({ prefsOpen: true }),
  closePrefs: () => set({ prefsOpen: false }),
}))

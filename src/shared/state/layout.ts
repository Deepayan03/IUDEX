import { create } from "zustand"

export type SidebarView =
  | "files"
  | "search"
  | "source-control"
  | "activity-log"

interface LayoutState {
  sidebarVisible: boolean
  sidebarWidth: number
  activeSidebarView: SidebarView
  terminalVisible: boolean
  terminalHeight: number
  isDebugging: boolean
  githubImportOpen: boolean

  toggleSidebar: () => void
  setSidebarWidth: (w: number) => void
  setActiveSidebarView: (view: SidebarView) => void
  toggleTerminal: () => void
  setTerminalVisible: (v: boolean) => void
  setTerminalHeight: (h: number) => void
  startDebug: () => void
  stopDebug: () => void
  setGithubImportOpen: (v: boolean) => void
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  sidebarVisible: true,
  sidebarWidth: 260,
  activeSidebarView: "files",
  terminalVisible: false,
  terminalHeight: 220,
  isDebugging: false,
  githubImportOpen: false,

  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  setSidebarWidth: (w) => set({ sidebarWidth: w }),
  setActiveSidebarView: (view) => {
    const state = get()
    if (state.activeSidebarView === view && state.sidebarVisible) {
      // Clicking the already-active view toggles the sidebar off
      set({ sidebarVisible: false })
    } else {
      set({ activeSidebarView: view, sidebarVisible: true })
    }
  },
  toggleTerminal: () => set((s) => ({ terminalVisible: !s.terminalVisible })),
  setTerminalVisible: (v) => set({ terminalVisible: v }),
  setTerminalHeight: (h) => set({ terminalHeight: h }),
  startDebug: () => set({ isDebugging: true, terminalVisible: true }),
  stopDebug: () => set({ isDebugging: false }),
  setGithubImportOpen: (v) => set({ githubImportOpen: v }),
}))

import { create } from "zustand"

interface LayoutState {
  sidebarVisible: boolean
  sidebarWidth: number
  terminalVisible: boolean
  terminalHeight: number
  isDebugging: boolean
  githubImportOpen: boolean

  toggleSidebar: () => void
  setSidebarWidth: (w: number) => void
  toggleTerminal: () => void
  setTerminalVisible: (v: boolean) => void
  setTerminalHeight: (h: number) => void
  startDebug: () => void
  stopDebug: () => void
  setGithubImportOpen: (v: boolean) => void
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarVisible: true,
  sidebarWidth: 260,
  terminalVisible: false,
  terminalHeight: 220,
  isDebugging: false,
  githubImportOpen: false,

  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  setSidebarWidth: (w) => set({ sidebarWidth: w }),
  toggleTerminal: () => set((s) => ({ terminalVisible: !s.terminalVisible })),
  setTerminalVisible: (v) => set({ terminalVisible: v }),
  setTerminalHeight: (h) => set({ terminalHeight: h }),
  startDebug: () => set({ isDebugging: true, terminalVisible: true }),
  stopDebug: () => set({ isDebugging: false }),
  setGithubImportOpen: (v) => set({ githubImportOpen: v }),
}))

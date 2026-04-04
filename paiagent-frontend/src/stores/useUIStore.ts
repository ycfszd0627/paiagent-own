import { create } from 'zustand'

interface UIState {
  selectedNodeId: string | null
  isDebugDrawerOpen: boolean
  isConfigPanelVisible: boolean
  selectNode: (nodeId: string | null) => void
  toggleDebugDrawer: () => void
  openDebugDrawer: () => void
  closeDebugDrawer: () => void
}

export const useUIStore = create<UIState>((set, get) => ({
  selectedNodeId: null,
  isDebugDrawerOpen: false,
  isConfigPanelVisible: false,

  selectNode: (nodeId) =>
    set({
      selectedNodeId: nodeId,
      isConfigPanelVisible: nodeId !== null,
    }),

  toggleDebugDrawer: () =>
    set({ isDebugDrawerOpen: !get().isDebugDrawerOpen }),

  openDebugDrawer: () => set({ isDebugDrawerOpen: true }),
  closeDebugDrawer: () => set({ isDebugDrawerOpen: false }),
}))
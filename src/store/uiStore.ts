import { create } from 'zustand';
import type { UIState } from '@/types';

interface UIStore extends UIState {
  setActivePanel: (panel: UIState['activePanel']) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleTerminal: () => void;
  setTerminalOpen: (open: boolean) => void;
  setEditorFile: (fileId: string | null) => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  activePanel: 'chat',
  sidebarOpen: true,
  terminalOpen: false,
  editorFile: null,

  setActivePanel: (panel) => set({ activePanel: panel }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleTerminal: () => set((state) => ({ terminalOpen: !state.terminalOpen })),
  setTerminalOpen: (open) => set({ terminalOpen: open }),
  setEditorFile: (fileId) => set({ editorFile: fileId, activePanel: fileId ? 'editor' : 'chat' }),
}));

export const selectActivePanel = (state: UIStore) => state.activePanel;
export const selectSidebarOpen = (state: UIStore) => state.sidebarOpen;
export const selectTerminalOpen = (state: UIStore) => state.terminalOpen;
export const selectEditorFile = (state: UIStore) => state.editorFile;

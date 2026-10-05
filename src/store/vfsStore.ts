import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { openDB, IDBPDatabase } from 'idb';
import type { VFSNode, VFSState } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Since we can't import uuid directly, let's implement a simple ID generator
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const DB_NAME = 'agent-prob-vfs';
const STORE_NAME = 'nodes';

// Custom IndexedDB storage for Zustand
const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const db = await openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME);
      },
    });
    const value = await db.get(STORE_NAME, name);
    return value ? JSON.stringify(value) : null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    const db = await openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME);
      },
    });
    await db.put(STORE_NAME, JSON.parse(value), name);
  },
  removeItem: async (name: string): Promise<void> => {
    const db = await openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME);
      },
    });
    await db.delete(STORE_NAME, name);
  },
};

interface VFSStore extends VFSState {
  // CRUD operations
  createNode: (name: string, type: 'file' | 'directory', parentId: string, content?: string) => string;
  readNode: (id: string) => VFSNode | undefined;
  updateNode: (id: string, updates: Partial<VFSNode>) => void;
  deleteNode: (id: string) => void;
  moveNode: (id: string, newParentId: string) => void;
  listChildren: (parentId: string) => VFSNode[];
  
  // Tree operations
  toggleExpanded: (id: string) => void;
  setSelected: (id: string | null) => void;
  
  // Persistence
  saveToStorage: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  
  // Import/Export
  exportToJSON: () => string;
  importFromJSON: (json: string) => void;
  clearAll: () => void;
}

const createRootNode = (): VFSNode => ({
  id: 'root',
  name: '/',
  type: 'directory',
  parentId: null,
  children: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const useVFSStore = create<VFSStore>()(
  persist(
    (set, get) => ({
      nodes: { root: createRootNode() },
      rootId: 'root',
      expandedIds: new Set(['root']),
      selectedId: null,

      createNode: (name, type, parentId, content = '') => {
        const newId = generateId();
        const newNode: VFSNode = {
          id: newId,
          name,
          type,
          parentId,
          content: type === 'file' ? content : undefined,
          children: type === 'directory' ? [] : undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          size: type === 'file' ? new Blob([content]).size : undefined,
        };

        set((state) => {
          const parent = state.nodes[parentId];
          if (!parent || parent.type !== 'directory') return state;
          
          return {
            nodes: {
              ...state.nodes,
              [newId]: newNode,
            },
            expandedIds: new Set([...state.expandedIds, parentId]),
          };
        });

        // Update parent's children
        get().updateNode(parentId, {
          children: [...(get().nodes[parentId].children || []), newId],
          updatedAt: Date.now(),
        });

        return newId;
      },

      readNode: (id) => get().nodes[id],

      updateNode: (id, updates) => {
        set((state) => {
          const node = state.nodes[id];
          if (!node) return state;
          
          return {
            nodes: {
              ...state.nodes,
              [id]: { ...node, ...updates, updatedAt: Date.now() },
            },
          };
        });
      },

      deleteNode: (id) => {
        set((state) => {
          const node = state.nodes[id];
          if (!node || node.id === 'root') return state;
          
          const parent = node.parentId ? state.nodes[node.parentId] : null;
          const newNodes = { ...state.nodes };
          delete newNodes[id];
          
          // If directory, recursively delete children
          if (node.type === 'directory' && node.children) {
            node.children.forEach(childId => {
              delete newNodes[childId];
            });
          }
          
          // Update parent's children list
          if (parent) {
            newNodes[parent.id] = {
              ...parent,
              children: parent.children?.filter(c => c !== id) || [],
              updatedAt: Date.now(),
            };
          }
          
          const newExpanded = new Set(state.expandedIds);
          newExpanded.delete(id);
          
          return {
            nodes: newNodes,
            expandedIds: newExpanded,
            selectedId: state.selectedId === id ? null : state.selectedId,
          };
        });
      },

      moveNode: (id, newParentId) => {
        set((state) => {
          const node = state.nodes[id];
          const newParent = state.nodes[newParentId];
          const oldParent = node.parentId ? state.nodes[node.parentId] : null;
          
          if (!node || !newParent || newParent.type !== 'directory' || node.id === 'root') {
            return state;
          }
          
          // Prevent moving into own descendant
          let current: VFSNode | null = newParent;
          while (current) {
            if (current.id === id) return state;
            current = current.parentId ? state.nodes[current.parentId] : null;
          }
          
          const newNodes = { ...state.nodes };
          
          // Remove from old parent
          if (oldParent) {
            newNodes[oldParent.id] = {
              ...oldParent,
              children: oldParent.children?.filter(c => c !== id) || [],
              updatedAt: Date.now(),
            };
          }
          
          // Add to new parent
          newNodes[newParentId] = {
            ...newParent,
            children: [...(newParent.children || []), id],
            updatedAt: Date.now(),
          };
          
          // Update node's parent
          newNodes[id] = {
            ...node,
            parentId: newParentId,
            updatedAt: Date.now(),
          };
          
          return { nodes: newNodes };
        });
      },

      listChildren: (parentId) => {
        const parent = get().nodes[parentId];
        if (!parent || parent.type !== 'directory' || !parent.children) return [];
        return parent.children.map(id => get().nodes[id]).filter(Boolean);
      },

      toggleExpanded: (id) => {
        set((state) => {
          const newExpanded = new Set(state.expandedIds);
          if (newExpanded.has(id)) {
            newExpanded.delete(id);
          } else {
            newExpanded.add(id);
          }
          return { expandedIds: newExpanded };
        });
      },

      setSelected: (id) => set({ selectedId: id }),

      saveToStorage: async () => {
        // Persist is handled by Zustand middleware
      },

      loadFromStorage: async () => {
        // Persist is handled by Zustand middleware
      },

      exportToJSON: () => {
        const { nodes, rootId } = get();
        return JSON.stringify({ nodes, rootId }, null, 2);
      },

      importFromJSON: (json) => {
        try {
          const { nodes, rootId } = JSON.parse(json);
          set({ nodes, rootId, expandedIds: new Set(['root']), selectedId: null });
        } catch (e) {
          console.error('Failed to import VFS:', e);
          throw e;
        }
      },

      clearAll: () => {
        set({
          nodes: { root: createRootNode() },
          rootId: 'root',
          expandedIds: new Set(['root']),
          selectedId: null,
        });
      },
    }),
    {
      name: 'vfs-storage',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        nodes: state.nodes,
        rootId: state.rootId,
        expandedIds: Array.from(state.expandedIds),
        selectedId: state.selectedId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.expandedIds = new Set(state.expandedIds as unknown as string[]);
        }
      },
    }
  )
);

// Selectors
export const selectNode = (id: string) => (state: VFSStore) => state.nodes[id];
export const selectChildren = (parentId: string) => (state: VFSStore) => 
  parentId ? state.nodes[parentId]?.children?.map(id => state.nodes[id]).filter(Boolean) || [] : [];
export const selectRoot = (state: VFSStore) => state.nodes[state.rootId];
export const selectExpanded = (state: VFSStore) => state.expandedIds;
export const selectSelected = (state: VFSStore) => state.selectedId ? state.nodes[state.selectedId] : null;

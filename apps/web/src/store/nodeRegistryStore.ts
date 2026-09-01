import { create } from "zustand";
import { api } from "../lib/api.js";

export interface NodeDef {
  type: string;
  label: string;
  description: string;
  icon: string;
  requiresTarget: boolean;
  supportsCredential: boolean;
  isContainer: boolean;
  outputs: { id: string; label: string }[];
  implemented: boolean;
  defaultConfig: Record<string, unknown>;
}

interface NodeRegistryState {
  byCategory: Record<string, NodeDef[]>;
  byType: Record<string, NodeDef>;
  loaded: boolean;
  load: () => Promise<void>;
}

export const useNodeRegistryStore = create<NodeRegistryState>((set, get) => ({
  byCategory: {},
  byType: {},
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    const byCategory = await api.get<Record<string, NodeDef[]>>("/api/node-registry");
    const byType: Record<string, NodeDef> = {};
    for (const defs of Object.values(byCategory)) for (const d of defs) byType[d.type] = d;
    set({ byCategory, byType, loaded: true });
  },
}));

import { create } from "zustand";
import { api } from "../lib/api.js";

interface User { id: string; name: string; email: string }
interface Workspace { id: string; name: string }

interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  status: "idle" | "loading" | "ready";
  fetchMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  workspace: null,
  status: "idle",
  fetchMe: async () => {
    set({ status: "loading" });
    try {
      const res = await api.get<{ user: User; workspace: Workspace }>("/api/auth/me");
      set({ user: res.user, workspace: res.workspace, status: "ready" });
    } catch {
      set({ user: null, workspace: null, status: "ready" });
    }
  },
  login: async (email, password) => {
    const res = await api.post<{ user: User; workspace: Workspace }>("/api/auth/login", { email, password });
    set({ user: res.user, workspace: res.workspace, status: "ready" });
  },
  register: async (name, email, password) => {
    const res = await api.post<{ user: User; workspace: Workspace }>("/api/auth/register", { name, email, password });
    set({ user: res.user, workspace: res.workspace, status: "ready" });
  },
  logout: async () => {
    await api.post("/api/auth/logout");
    set({ user: null, workspace: null });
  },
}));

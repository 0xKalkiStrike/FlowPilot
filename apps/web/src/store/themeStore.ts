import { create } from "zustand";

type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  applyToDocument: () => void;
}

function resolveDark(mode: ThemeMode): boolean {
  if (mode === "system") return window.matchMedia("(prefers-color-scheme: dark)").matches;
  return mode === "dark";
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: (localStorage.getItem("flowpilot-theme") as ThemeMode) || "system",
  setMode: (mode) => {
    localStorage.setItem("flowpilot-theme", mode);
    set({ mode });
    get().applyToDocument();
  },
  applyToDocument: () => {
    const dark = resolveDark(get().mode);
    document.documentElement.classList.toggle("dark", dark);
  },
}));

if (typeof window !== "undefined") {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (useThemeStore.getState().mode === "system") useThemeStore.getState().applyToDocument();
  });
}

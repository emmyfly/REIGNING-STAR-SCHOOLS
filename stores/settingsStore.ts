"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SchoolSettings, Term } from "@/types";

interface SettingsState {
  settings: SchoolSettings | null;
  currentTerm: Term;
  currentSession: string;
  sidebarCollapsed: boolean;
  setSettings: (settings: SchoolSettings) => void;
  setCurrentTerm: (term: Term) => void;
  setCurrentSession: (session: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: null,
      currentTerm: "First",
      currentSession: "2024/2025",
      sidebarCollapsed: false,
      setSettings: (settings) =>
        set({
          settings,
          currentTerm: settings.current_term,
          currentSession: settings.current_session,
        }),
      setCurrentTerm: (currentTerm) => set({ currentTerm }),
      setCurrentSession: (currentSession) => set({ currentSession }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    {
      name: "rss-settings",
      partialize: (state) => ({
        currentTerm: state.currentTerm,
        currentSession: state.currentSession,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

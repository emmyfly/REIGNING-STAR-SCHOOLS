"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useSettingsStore } from "@/stores/settingsStore";
import { SchoolSettings } from "@/types";

async function fetchSettings(): Promise<SchoolSettings | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("school_settings")
    .select("*")
    .single();
  return data as SchoolSettings | null;
}

export function useSettings() {
  const { settings, currentTerm, currentSession, setSettings } = useSettingsStore();

  const query = useQuery({
    queryKey: ["school_settings"],
    queryFn: fetchSettings,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  useEffect(() => {
    if (query.data) {
      setSettings(query.data);
    }
  }, [query.data, setSettings]);

  return {
    settings: query.data ?? settings,
    currentTerm,
    currentSession,
    isLoading: query.isLoading,
  };
}

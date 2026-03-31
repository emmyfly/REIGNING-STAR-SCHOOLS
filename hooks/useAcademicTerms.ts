"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { AcademicTerm, AcademicSession, Term } from "@/types";

export function useAcademicSessions() {
  return useQuery<AcademicSession[]>({
    queryKey: ["academic-sessions"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("academic_sessions")
        .select("*")
        .order("session", { ascending: false });
      return (data ?? []) as AcademicSession[];
    },
    staleTime: Infinity,
  });
}

export function useAcademicTerms(sessionId?: string) {
  return useQuery<AcademicTerm[]>({
    queryKey: ["academic-terms", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("academic_terms")
        .select("*")
        .eq("session_id", sessionId!)
        .order("term");
      return (data ?? []) as AcademicTerm[];
    },
    staleTime: Infinity,
  });
}

/** Returns the term_id for the given term name within the given session */
export function useResolvedTermId(sessionId?: string, termName?: Term) {
  const { data: terms = [] } = useAcademicTerms(sessionId);
  if (!sessionId || !termName) return undefined;
  return terms.find((t) => t.term === termName)?.id;
}

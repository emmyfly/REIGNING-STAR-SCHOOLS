"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Subject, SchoolClass, GradeScale } from "@/types";
import { toast } from "sonner";

// ─── Subjects ─────────────────────────────────────────────────────────────────
export function useAllSubjects() {
  return useQuery<Subject[]>({
    queryKey: ["subjects-all"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("subjects")
        .select("*, class:classes(id,name)")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Subject[];
    },
    staleTime: Infinity,
  });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Subject>) => {
      const supabase = createClient();
      const { error } = await supabase.from("subjects").insert(values as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["subjects-all"] });
      toast.success("Subject added");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["subjects-all"] });
      toast.success("Subject removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Classes ──────────────────────────────────────────────────────────────────
export function useCreateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<SchoolClass>) => {
      const supabase = createClient();
      const { error } = await supabase.from("classes").insert(values as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Class added");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Class removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Grading scale ────────────────────────────────────────────────────────────
export function useSaveGradingScale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scale: GradeScale[]) => {
      const supabase = createClient();
      const { data: settingsRow } = await supabase.from("school_settings").select("id").single();
      const settingsId = (settingsRow as { id: string } | null)?.id ?? "";
      const { error } = await supabase
        .from("school_settings")
        .update({ grading_system: scale } as never)
        .eq("id", settingsId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["school_settings"] });
      toast.success("Grading scale updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Academic sessions ────────────────────────────────────────────────────────
export function useCreateAcademicSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      session,
      terms,
    }: {
      session: string;
      terms: { term: string; start_date: string; end_date: string }[];
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("academic_sessions")
        .insert({ session, is_current: false } as never)
        .select("id")
        .single();
      if (error) throw error;

      const sessionId = (data as { id: string } | null)?.id ?? "";
      const termRows = terms.map((t) => ({ ...t, session_id: sessionId, is_current: false }));
      const { error: termErr } = await supabase.from("academic_terms").insert(termRows as never[]);
      if (termErr) throw termErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academic-sessions"] });
      toast.success("Session created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSetCurrentSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const supabase = createClient();
      // Unset all current
      await supabase.from("academic_sessions").update({ is_current: false } as never).neq("id", "00000000-0000-0000-0000-000000000000");
      // Set this one
      const { error } = await supabase
        .from("academic_sessions")
        .update({ is_current: true } as never)
        .eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academic-sessions"] });
      toast.success("Current session updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Admin profile ────────────────────────────────────────────────────────────
export function useUpdateAdminProfile() {
  return useMutation({
    mutationFn: async ({ fullName, email }: { fullName: string; email: string }) => {
      const supabase = createClient();

      // Update admins table
      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbErr } = await supabase
        .from("admins")
        .update({ full_name: fullName, email } as never)
        .eq("auth_id", user!.id);
      if (dbErr) throw dbErr;

      // Update auth email if changed
      if (email !== user?.email) {
        const { error: authErr } = await supabase.auth.updateUser({ email });
        if (authErr) throw authErr;
      }
    },
    onSuccess: () => toast.success("Profile updated"),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Password updated"),
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── School settings update ───────────────────────────────────────────────────
export function useUpdateSchoolSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const supabase = createClient();
      const { data: existing } = await supabase
        .from("school_settings")
        .select("id")
        .single();
      const existingId = (existing as { id: string } | null)?.id ?? "";
      const { error } = await supabase
        .from("school_settings")
        .update(values as never)
        .eq("id", existingId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["school_settings"] });
      toast.success("Settings saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

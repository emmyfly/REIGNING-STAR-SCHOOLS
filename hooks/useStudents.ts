"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Student, SchoolClass } from "@/types";
import { toast } from "sonner";

export interface StudentFilters {
  page: number;
  pageSize: number;
  search?: string;
  classId?: string;
  gender?: string;
  hasEmailAccount?: boolean;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
}

// ─── Fetch students (server-side paginated) ───────────────────────────────────
export function useStudents(filters: StudentFilters) {
  return useQuery<{ data: Student[]; total: number }>({
    queryKey: ["students", filters],
    queryFn: async () => {
      const supabase = createClient();
      const from = (filters.page - 1) * filters.pageSize;
      const to = from + filters.pageSize - 1;

      let query = supabase
        .from("students")
        .select("*, class:classes(id,name,level)", { count: "exact" });

      if (filters.search) {
        query = query.or(
          `full_name.ilike.%${filters.search}%,admission_number.ilike.%${filters.search}%`
        );
      }
      if (filters.classId) query = query.eq("class_id", filters.classId);
      if (filters.gender) query = query.eq("gender", filters.gender);
      if (filters.hasEmailAccount !== undefined) {
        query = query.eq("has_email_account", filters.hasEmailAccount);
      }

      query = query
        .order(filters.sortColumn ?? "full_name", {
          ascending: (filters.sortDirection ?? "asc") === "asc",
        })
        .range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;
      return { data: (data ?? []) as unknown as Student[], total: count ?? 0 };
    },
    staleTime: 60_000,
  });
}

// ─── Classes (for filter dropdown) ───────────────────────────────────────────
export function useClasses() {
  return useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("classes").select("*").order("name");
      return (data ?? []) as SchoolClass[];
    },
    staleTime: Infinity,
  });
}

// ─── Create student ──────────────────────────────────────────────────────────
export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Student>) => {
      const supabase = createClient();
      const { error } = await supabase.from("students").insert({
        ...values,
        has_email_account: false,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student added successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Update student ──────────────────────────────────────────────────────────
export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Student> }) => {
      const supabase = createClient();
      const { error } = await supabase.from("students").update(values as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Delete student ──────────────────────────────────────────────────────────
export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Bulk import students ─────────────────────────────────────────────────────
export function useBulkImportStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Partial<Student>[]) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("students")
        .upsert(rows as never[], { onConflict: "admission_number" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      toast.success("Students imported successfully");
    },
    onError: (err: Error) => toast.error(`Import failed: ${err.message}`),
  });
}

// ─── Activate email accounts ──────────────────────────────────────────────────
export function useActivateEmailAccounts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studentIds: string[]) => {
      const res = await fetch("/api/students/activate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_ids: studentIds }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Activation failed");
      return res.json() as Promise<{ succeeded: string[]; failed: { id: string; error: string }[] }>;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["students"] });
      const { succeeded, failed } = result;
      if (succeeded.length) toast.success(`${succeeded.length} account(s) activated`);
      if (failed.length) toast.warning(`${failed.length} activation(s) failed`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

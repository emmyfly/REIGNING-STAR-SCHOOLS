"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Question, QuestionType } from "@/types";
import { toast } from "sonner";

export interface QuestionFilters {
  subjectId?: string;
  classId?: string;
  type?: QuestionType;
}

export function useQuestions(filters: QuestionFilters = {}) {
  return useQuery<Question[]>({
    queryKey: ["questions", filters],
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from("questions")
        .select("*, subject:subjects(id,name)")
        .order("created_at", { ascending: false });

      if (filters.subjectId) q = q.eq("subject_id", filters.subjectId);
      if (filters.classId)   q = q.eq("class_id", filters.classId);
      if (filters.type)      q = q.eq("type", filters.type);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Question[];
    },
    staleTime: 60_000,
  });
}

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Question>) => {
      const supabase = createClient();
      const { error } = await supabase.from("questions").insert(values as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questions"] });
      toast.success("Question added");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Question> }) => {
      const supabase = createClient();
      const { error } = await supabase.from("questions").update(values as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questions"] });
      toast.success("Question updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questions"] });
      toast.success("Question deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useExams() {
  return useQuery({
    queryKey: ["exams"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("exam_papers")
        .select("*, subject:subjects(id,name), class:classes(id,name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useUpsertExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("exam_papers")
        .upsert(values as never, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams"] });
      toast.success("Exam saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

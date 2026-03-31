"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Subject, Student, Score, ParsedScoreRow } from "@/types";
import { toast } from "sonner";

export function useSubjectsByClass(classId?: string) {
  return useQuery<Subject[]>({
    queryKey: ["subjects", classId],
    enabled: !!classId,
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("subjects")
        .select("*")
        .eq("class_id", classId!)
        .order("name");
      return (data ?? []) as Subject[];
    },
    staleTime: Infinity,
  });
}

export function useStudentsByClass(classId?: string) {
  return useQuery<Student[]>({
    queryKey: ["students-by-class", classId],
    enabled: !!classId,
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("students")
        .select("*")
        .eq("class_id", classId!)
        .eq("status", "active")
        .order("full_name");
      return (data ?? []) as unknown as Student[];
    },
    staleTime: 60_000,
  });
}

export function useScoresByTermAndClass(termId?: string, classId?: string) {
  return useQuery<Score[]>({
    queryKey: ["scores", termId, classId],
    enabled: !!termId && !!classId,
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("scores")
        .select("*, student:students(full_name, admission_number), subject:subjects(name)")
        .eq("term_id", termId!)
        .in(
          "student_id",
          (
            await supabase
              .from("students")
              .select("id")
              .eq("class_id", classId!)
          ).data?.map((s: { id: string }) => s.id) ?? []
        );
      return (data ?? []) as unknown as Score[];
    },
    staleTime: 60_000,
  });
}

export function useBulkUpsertScores() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rows,
      termId,
    }: {
      rows: ParsedScoreRow[];
      termId: string;
    }) => {
      const supabase = createClient();

      const validRows = rows.filter(
        (r) => r.status === "valid" && r.student_id && r.subject_id
      );

      const upsertPayload = validRows.map((r) => ({
        student_id: r.student_id!,
        subject_id: r.subject_id!,
        term_id: termId,
        ca_score: r.ca_score,
        exam: r.exam,
        total: r.total,
        grade: r.grade,
        remark: r.remark ?? r.grade,
      }));

      const { error } = await supabase
        .from("scores")
        .upsert(upsertPayload as never[], {
          onConflict: "student_id,subject_id,term_id",
        });

      if (error) throw error;

      // Trigger server-side ranking computation
      await supabase.rpc("compute_rankings", { p_term_id: termId } as never);

      return validRows.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["scores"] });
      qc.invalidateQueries({ queryKey: ["top-performers"] });
      toast.success(`${count} scores uploaded and rankings updated`);
    },
    onError: (err: Error) => toast.error(`Upload failed: ${err.message}`),
  });
}

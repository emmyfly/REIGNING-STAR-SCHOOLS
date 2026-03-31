"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Submission } from "@/types";
import { toast } from "sonner";
import { sendNotifications } from "@/lib/utils/notifications";

const STALE = 60_000;

export function useSubmissions(assignmentId?: string) {
  return useQuery<Submission[]>({
    queryKey: ["submissions", assignmentId],
    enabled: !!assignmentId,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("submissions")
        .select("*, student:students(id,full_name,admission_number,class:classes(name))")
        .eq("assignment_id", assignmentId!)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Submission[];
    },
    staleTime: STALE,
  });
}

export function useGradeSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      studentId,
      assignmentTitle,
      score,
      feedback,
      status,
    }: {
      id: string;
      studentId: string;
      assignmentTitle: string;
      score: number;
      feedback: string;
      status: "graded" | "submitted";
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("submissions")
        .update({
          score,
          feedback,
          status,
          graded_at: new Date().toISOString(),
        } as never)
        .eq("id", id);
      if (error) throw error;

      await sendNotifications({
        student_ids: [studentId],
        title: `Assignment Graded: ${assignmentTitle}`,
        body: `Your score: ${score}. ${feedback ? feedback.slice(0, 80) : ""}`,
        type: "assignment",
        reference_id: id,
      });
    },
    onSuccess: (_, { assignmentId }: { assignmentId?: string } & Record<string, unknown>) => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      if (assignmentId) qc.invalidateQueries({ queryKey: ["submissions", assignmentId] });
      toast.success("Grade saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Assignment, AssignmentStatus, AssignmentType } from "@/types";
import { toast } from "sonner";
import { sendNotifications, getStudentIdsByClass, getAllStudentIds } from "@/lib/utils/notifications";

const STALE = 60_000;

export interface AssignmentFilters {
  status?: AssignmentStatus | "all";
  subjectId?: string;
  classId?: string;
  termId?: string;
  type?: AssignmentType;
}

export function useAssignments(filters: AssignmentFilters = {}) {
  return useQuery<Assignment[]>({
    queryKey: ["assignments", filters],
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from("assignments")
        .select("*, subject:subjects(id,name), class:classes(id,name)")
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.subjectId) q = q.eq("subject_id", filters.subjectId);
      if (filters.classId)   q = q.eq("class_id", filters.classId);
      if (filters.termId)    q = q.eq("term_id", filters.termId);
      if (filters.type)      q = q.eq("type", filters.type);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Assignment[];
    },
    staleTime: STALE,
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      values,
      files,
    }: {
      values: Partial<Assignment>;
      files?: File[];
    }) => {
      const supabase = createClient();

      // Upload attached files to assignment-files bucket
      const fileUrls: string[] = [];
      if (files?.length) {
        for (const file of files) {
          const path = `${Date.now()}_${file.name}`;
          const { data: upload, error: uploadErr } = await supabase.storage
            .from("assignment-files")
            .upload(path, file);
          if (uploadErr) throw uploadErr;
          const { data: signed } = await supabase.storage
            .from("assignment-files")
            .createSignedUrl(upload.path, 60 * 60 * 24 * 30); // 30 days
          if (signed?.signedUrl) fileUrls.push(signed.signedUrl);
        }
      }

      const { data, error } = await supabase
        .from("assignments")
        .insert({ ...values, file_urls: fileUrls } as never)
        .select("id")
        .single();
      if (error) throw error;

      const assignData = data as { id: string } | null;
      // If publishing, send notifications
      if (values.status === "published" && assignData?.id) {
        const studentIds =
          values.class_id === "all"
            ? await getAllStudentIds()
            : await getStudentIdsByClass(values.class_id!);
        await sendNotifications({
          student_ids: studentIds,
          title: `New Assignment: ${values.title}`,
          body: values.description?.slice(0, 120) ?? "",
          type: "assignment",
          reference_id: assignData.id,
        });
      }

      return assignData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Assignment created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
      notifyOnPublish = false,
    }: {
      id: string;
      values: Partial<Assignment>;
      notifyOnPublish?: boolean;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("assignments")
        .update(values as never)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;

      if (notifyOnPublish && values.status === "published") {
        const asgn = data as Assignment;
        const studentIds =
          asgn.class_id === "all"
            ? await getAllStudentIds()
            : await getStudentIdsByClass(asgn.class_id);
        await sendNotifications({
          student_ids: studentIds,
          title: `Assignment Published: ${asgn.title}`,
          body: asgn.description?.slice(0, 120) ?? "",
          type: "assignment",
          reference_id: id,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Assignment updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Assignment deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

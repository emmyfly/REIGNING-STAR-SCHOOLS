"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Announcement } from "@/types";
import { toast } from "sonner";
import { sendNotifications, getStudentIdsByClass, getAllStudentIds } from "@/lib/utils/notifications";

const STALE = 60_000;

export function useAnnouncements() {
  return useQuery<Announcement[]>({
    queryKey: ["announcements"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("announcements")
        .select("*, class:classes(id,name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Announcement[];
    },
    staleTime: STALE,
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Announcement>) => {
      const supabase = createClient();
      const { data: admin } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("announcements")
        .insert({ ...values, created_by: admin.user?.id } as never)
        .select("id")
        .single();
      if (error) throw error;

      const studentIds = values.class_id
        ? await getStudentIdsByClass(values.class_id)
        : await getAllStudentIds();

      await sendNotifications({
        student_ids: studentIds,
        title: values.title ?? "New Announcement",
        body: values.body?.slice(0, 120) ?? "",
        type: "announcement",
        reference_id: (data as { id: string } | null)?.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement published");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

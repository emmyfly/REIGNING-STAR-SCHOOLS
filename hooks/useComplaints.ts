"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Complaint, ComplaintStatus, ComplaintCategory } from "@/types";
import { toast } from "sonner";
import { sendNotifications } from "@/lib/utils/notifications";

const STALE = 60_000;

export interface ComplaintFilters {
  status?: ComplaintStatus | "all";
  category?: ComplaintCategory;
  classId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useComplaints(filters: ComplaintFilters = {}) {
  return useQuery<Complaint[]>({
    queryKey: ["complaints", filters],
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from("complaints")
        .select("*, student:students(id,full_name,admission_number,class:classes(id,name))")
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.category) q = q.eq("category", filters.category);
      if (filters.dateFrom) q = q.gte("created_at", filters.dateFrom);
      if (filters.dateTo)   q = q.lte("created_at", filters.dateTo + "T23:59:59");

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data ?? []) as unknown as Complaint[];
      // Safety: sort bullying to top
      return rows.sort((a, b) => {
        if (a.category === "bullying" && b.category !== "bullying") return -1;
        if (b.category === "bullying" && a.category !== "bullying") return  1;
        return 0;
      });
    },
    staleTime: STALE,
  });
}

export function useUpdateComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      response,
      studentId,
      isAnonymous,
    }: {
      id: string;
      status: ComplaintStatus;
      response: string;
      studentId?: string;
      isAnonymous: boolean;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("complaints")
        .update({ status, response, updated_at: new Date().toISOString() } as never)
        .eq("id", id);
      if (error) throw error;

      // Notify if not anonymous
      if (!isAnonymous && studentId) {
        await sendNotifications({
          student_ids: [studentId],
          title: "Complaint Update",
          body: response.slice(0, 120),
          type: "complaint",
          reference_id: id,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["complaints"] });
      toast.success("Complaint updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

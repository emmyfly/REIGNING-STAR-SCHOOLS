"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { FeeStructure } from "@/types";
import { toast } from "sonner";

export function useFeeStructure(sessionId?: string, classId?: string) {
  return useQuery<FeeStructure[]>({
    queryKey: ["fee-structure", sessionId, classId],
    enabled: !!sessionId,
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from("fee_structures")
        .select("*")
        .eq("session_id", sessionId!)
        .order("category");
      if (classId) q = q.eq("class_id", classId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as FeeStructure[];
    },
    staleTime: 60_000,
  });
}

export function useSaveFeeStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rows,
      deletedIds,
    }: {
      rows: Partial<FeeStructure>[];
      deletedIds: string[];
    }) => {
      const supabase = createClient();

      if (deletedIds.length) {
        const { error } = await supabase
          .from("fee_structures")
          .delete()
          .in("id", deletedIds);
        if (error) throw error;
      }

      if (rows.length) {
        const { error } = await supabase
          .from("fee_structures")
          .upsert(rows as never[], { onConflict: "id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fee-structure"] });
      toast.success("Fee structure saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Payment, PaymentStatus, RevenueByClass, PaymentStatusSplit } from "@/types";
import { toast } from "sonner";
import { sendNotifications } from "@/lib/utils/notifications";

const STALE = 60_000;

export interface PaymentFilters {
  status?: PaymentStatus | "all";
  classId?: string;
  sessionId?: string;
  termId?: string;
}

export function usePayments(filters: PaymentFilters = {}) {
  return useQuery<Payment[]>({
    queryKey: ["payments", filters],
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from("payments")
        .select(
          "*, student:students(id,full_name,admission_number,class:classes(id,name)), fee:fee_structures(category,description,amount)"
        )
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.sessionId) q = q.eq("session_id", filters.sessionId);
      if (filters.termId)    q = q.eq("term_id", filters.termId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Payment[];
    },
    staleTime: STALE,
  });
}

export function useVerifyPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      studentId,
      amount,
    }: {
      id: string;
      studentId: string;
      amount: number;
    }) => {
      const supabase = createClient();
      const { data: admin } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("payments")
        .update({ status: "paid", verified_by: admin.user?.id } as never)
        .eq("id", id);
      if (error) throw error;

      await sendNotifications({
        student_ids: [studentId],
        title: "Payment Verified",
        body: `Your payment of ₦${amount.toLocaleString()} has been confirmed.`,
        type: "payment",
        reference_id: id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Payment verified");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRejectPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      studentId,
      note,
    }: {
      id: string;
      studentId: string;
      note: string;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("payments")
        .update({ status: "overdue", rejection_note: note } as never)
        .eq("id", id);
      if (error) throw error;

      await sendNotifications({
        student_ids: [studentId],
        title: "Payment Rejected",
        body: note || "Your payment submission was not approved. Please resubmit.",
        type: "payment",
        reference_id: id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Payment rejected");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRevenueStats(sessionId?: string, termId?: string) {
  return useQuery<{ byClass: RevenueByClass[]; statusSplit: PaymentStatusSplit[] }>({
    queryKey: ["revenue-stats", sessionId, termId],
    enabled: !!sessionId,
    queryFn: async () => {
      const supabase = createClient();

      // Payments with class info
      let q = supabase
        .from("payments")
        .select(
          "amount_paid, status, student:students(class:classes(id,name))"
        );
      if (sessionId) q = (q as typeof q).eq("session_id", sessionId);
      if (termId)    q = (q as typeof q).eq("term_id", termId);

      const { data: payments } = await q;

      // Fee structures for expected amounts
      let feeQ = supabase.from("fee_structures").select("class_id, amount");
      if (sessionId) feeQ = feeQ.eq("session_id", sessionId);
      const { data: fees } = await feeQ;

      // Students count per class
      const { data: students } = await supabase
        .from("students")
        .select("class_id, class:classes(id,name)")
        .eq("status", "active");

      // Build class map
      const classMap = new Map<string, { name: string; student_count: number; fees: number; collected: number }>();

      for (const s of students ?? []) {
        const cls = (s as unknown as { class?: { id: string; name: string } }).class;
        if (!cls) continue;
        if (!classMap.has(cls.id)) classMap.set(cls.id, { name: cls.name, student_count: 0, fees: 0, collected: 0 });
        classMap.get(cls.id)!.student_count++;
      }

      for (const f of fees ?? []) {
        const fee = f as { class_id: string; amount: number };
        if (fee.class_id && classMap.has(fee.class_id)) {
          classMap.get(fee.class_id)!.fees += fee.amount;
        }
      }

      const statusMap = new Map<string, { count: number; amount: number }>();

      for (const p of payments ?? []) {
        const pay = p as { amount_paid: number; status: string; student?: { class?: { id: string; name: string } } };
        const cls = pay.student?.class;
        if (cls && classMap.has(cls.id) && pay.status === "paid") {
          classMap.get(cls.id)!.collected += pay.amount_paid;
        }
        if (!statusMap.has(pay.status)) statusMap.set(pay.status, { count: 0, amount: 0 });
        statusMap.get(pay.status)!.count++;
        statusMap.get(pay.status)!.amount += pay.amount_paid;
      }

      const byClass: RevenueByClass[] = Array.from(classMap.entries()).map(([id, v]) => ({
        class_id: id,
        class_name: v.name,
        total_students: v.student_count,
        total_fees: v.fees * v.student_count,
        collected: v.collected,
        rate: v.fees * v.student_count > 0 ? (v.collected / (v.fees * v.student_count)) * 100 : 0,
      }));

      const statusSplit: PaymentStatusSplit[] = Array.from(statusMap.entries()).map(
        ([status, v]) => ({ status: status as PaymentStatusSplit["status"], ...v })
      );

      return { byClass, statusSplit };
    },
    staleTime: STALE,
  });
}

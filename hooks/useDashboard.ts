"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { DashboardStats, LeaderboardEntry, Payment } from "@/types";
import { computeAverage, getGrade } from "@/lib/utils/grading";

const STALE = 60_000;

// ─── Stats ────────────────────────────────────────────────────────────────────
export function useDashboardStats(termId?: string) {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats", termId],
    queryFn: async () => {
      const supabase = createClient();

      const [
        { count: totalStudents },
        { count: pendingPayments },
        { count: verifiedCount },
        { data: verifiedData },
        { count: activeAssignments },
        { count: pendingSubmissions },
        { count: openComplaints },
      ] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "pending"),
        termId
          ? supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "paid").eq("term_id", termId)
          : supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "paid"),
        termId
          ? supabase.from("payments").select("amount_paid").eq("status", "paid").eq("term_id", termId)
          : supabase.from("payments").select("amount_paid").eq("status", "paid"),
        supabase.from("assignments").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("submissions").select("*", { count: "exact", head: true }).eq("status", "submitted"),
        supabase.from("complaints").select("*", { count: "exact", head: true }).eq("status", "open"),
      ]);

      const totalRevenue = ((verifiedData ?? []) as { amount_paid: number }[]).reduce(
        (sum, p) => sum + (p.amount_paid ?? 0),
        0
      );

      return {
        total_students: totalStudents ?? 0,
        pending_payments: pendingPayments ?? 0,
        verified_payments_count: verifiedCount ?? 0,
        total_revenue: totalRevenue,
        active_assignments: activeAssignments ?? 0,
        pending_submissions: pendingSubmissions ?? 0,
        open_complaints: openComplaints ?? 0,
      };
    },
    staleTime: STALE,
  });
}

// ─── Top performers ───────────────────────────────────────────────────────────
export function useTopPerformers(termId?: string, limit = 5) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["top-performers", termId, limit],
    enabled: !!termId,
    queryFn: async () => {
      const supabase = createClient();
      const { data: rawScores } = await supabase
        .from("scores")
        .select("student_id, total, student:students(id, full_name, admission_number, class:classes(name))")
        .eq("term_id", termId!);

      if (!rawScores?.length) return [];

      const scores = rawScores as unknown as Array<{
        student_id: string;
        total: number;
        student: { id: string; full_name: string; class?: { name: string } } | null;
      }>;

      // Group totals by student
      const map = new Map<string, { name: string; class_name: string; totals: number[] }>();
      for (const s of scores) {
        const student = s.student;
        if (!student) continue;
        if (!map.has(s.student_id)) {
          map.set(s.student_id, {
            name: student.full_name,
            class_name: student.class?.name ?? "—",
            totals: [],
          });
        }
        map.get(s.student_id)!.totals.push(s.total);
      }

      const entries = Array.from(map.entries()).map(([id, v]) => ({
        student_id: id,
        name: v.name,
        class_name: v.class_name,
        average: computeAverage(v.totals),
        subjects_count: v.totals.length,
      }));

      entries.sort((a, b) => b.average - a.average);
      let rank = 1;
      return entries.slice(0, limit).map((e, i): LeaderboardEntry => {
        if (i > 0 && e.average < entries[i - 1].average) rank = i + 1;
        const { grade } = getGrade(e.average);
        return {
          rank,
          student: {
            id: e.student_id,
            full_name: e.name,
            admission_number: "",
            gender: "Male",
            date_of_birth: "",
            class_id: "",
            guardian_name: "",
            guardian_phone: "",
            address: "",
            status: "active",
            admission_date: "",
            has_email_account: false,
            created_at: "",
          },
          total_score: e.average * e.subjects_count,
          average: e.average,
          grade,
          subjects_count: e.subjects_count,
        };
      });
    },
    staleTime: STALE,
  });
}

// ─── Recent payments ──────────────────────────────────────────────────────────
export function useRecentPayments(limit = 10) {
  return useQuery<Payment[]>({
    queryKey: ["recent-payments", limit],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("payments")
        .select("*, student:students(full_name, admission_number)")
        .order("created_at", { ascending: false })
        .limit(limit);
      return (data ?? []) as unknown as Payment[];
    },
    staleTime: STALE,
  });
}

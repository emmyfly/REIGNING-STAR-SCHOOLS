"use client";

import { useRouter } from "next/navigation";
import {
  Users, AlertCircle, CheckCircle2, CreditCard,
  BookOpen, Clock, MessageSquare, Plus, Upload, Eye, FilePlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { GradeChip } from "@/components/shared/GradeChip";
import { DataTable, Column } from "@/components/shared/DataTable";
import { useDashboardStats, useTopPerformers, useRecentPayments } from "@/hooks/useDashboard";
import { useSettings } from "@/hooks/useSettings";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAcademicSessions, useResolvedTermId } from "@/hooks/useAcademicTerms";
import { formatCurrency, formatDate, ordinal } from "@/lib/utils/formatting";
import { LeaderboardEntry, Payment } from "@/types";
import { cn } from "@/lib/utils";

// ─── Stat card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  highlight?: boolean; // red border when true
  format?: "number" | "currency";
  isLoading?: boolean;
}

function StatCard({ label, value, icon: Icon, color, bgColor, highlight, format, isLoading }: StatCardProps) {
  const displayed =
    isLoading ? "…"
    : format === "currency" ? formatCurrency(Number(value))
    : value.toLocaleString();

  return (
    <Card className={cn("relative", highlight && Number(value) > 0 && "ring-2 ring-destructive")}>
      <CardContent className="flex items-center gap-4 pt-5 pb-5">
        <div className={cn("rounded-xl p-2.5", bgColor)}>
          <Icon className={cn("h-5 w-5", color)} />
        </div>
        <div>
          <p className={cn("text-2xl font-bold tabular-nums", isLoading && "text-muted-foreground")}>
            {displayed}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Top performers columns ───────────────────────────────────────────────────
const performerColumns: Column<LeaderboardEntry & { id: string }>[] = [
  {
    key: "rank",
    header: "#",
    className: "w-10 text-center font-bold",
    render: (r) => (
      <span className={cn(
        "font-bold",
        r.rank === 1 ? "text-yellow-500"
        : r.rank === 2 ? "text-slate-400"
        : r.rank === 3 ? "text-amber-600"
        : "text-muted-foreground"
      )}>
        {ordinal(r.rank)}
      </span>
    ),
  },
  { key: "name",    header: "Student", render: (r) => r.student.full_name },
  { key: "average", header: "Average", render: (r) => `${r.average.toFixed(1)}%` },
  { key: "grade",   header: "Grade",   render: (r) => <GradeChip grade={r.grade} /> },
];

// ─── Recent payment columns ────────────────────────────────────────────────────
const paymentColumns: Column<Payment>[] = [
  { key: "student",    header: "Student", render: (p) => p.student?.full_name ?? "—" },
  { key: "amount_paid",header: "Amount",  render: (p) => formatCurrency(p.amount_paid) },
  { key: "payment_method", header: "Method", render: (p) => p.payment_method.replace("_", " ") },
  { key: "paid_at",    header: "Date",    render: (p) => formatDate(p.paid_at) },
  { key: "status",     header: "Status",  render: (p) => <StatusBadge status={p.status} /> },
];

// ─── Main ──────────────────────────────────────────────────────────────────────
export function DashboardScreen() {
  const router = useRouter();
  const { currentTerm, currentSession } = useSettingsStore();
  const { data: sessions = [] } = useAcademicSessions();
  const currentSessionId = sessions.find((s) => s.session === currentSession)?.id;
  const termId = useResolvedTermId(currentSessionId, currentTerm);

  const { data: stats, isLoading: statsLoading } = useDashboardStats(termId);
  const { data: performers = [], isLoading: perfLoading } = useTopPerformers(termId, 5);
  const { data: payments = [], isLoading: paymentsLoading } = useRecentPayments(10);

  const statCards: StatCardProps[] = [
    {
      label: "Total Students",
      value: stats?.total_students ?? 0,
      icon: Users,
      color: "text-[#1B2B5E]",
      bgColor: "bg-blue-50",
      isLoading: statsLoading,
    },
    {
      label: "Pending Payments",
      value: stats?.pending_payments ?? 0,
      icon: AlertCircle,
      color: "text-warning",
      bgColor: "bg-warning-bg",
      isLoading: statsLoading,
    },
    {
      label: "Verified Payments (term)",
      value: stats?.verified_payments_count ?? 0,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success-bg",
      isLoading: statsLoading,
    },
    {
      label: "Total Revenue",
      value: stats?.total_revenue ?? 0,
      icon: CreditCard,
      color: "text-success",
      bgColor: "bg-success-bg",
      format: "currency",
      isLoading: statsLoading,
    },
    {
      label: "Active Assignments",
      value: stats?.active_assignments ?? 0,
      icon: BookOpen,
      color: "text-info",
      bgColor: "bg-info-bg",
      isLoading: statsLoading,
    },
    {
      label: "Pending Submissions",
      value: stats?.pending_submissions ?? 0,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning-bg",
      isLoading: statsLoading,
    },
    {
      label: "Open Complaints",
      value: stats?.open_complaints ?? 0,
      icon: MessageSquare,
      color: "text-error",
      bgColor: "bg-error-bg",
      highlight: true,
      isLoading: statsLoading,
    },
  ];

  // Normalise performers to carry an `id` field (required by DataTable)
  const performerRows = performers.map((p) => ({ ...p, id: p.student.id }));

  return (
    <div className="space-y-6 p-6">
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {currentTerm} Term — {currentSession}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => router.push("/students")}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Student
        </Button>
        <Button size="sm" variant="outline" onClick={() => router.push("/scores")}>
          <Upload className="h-4 w-4 mr-1.5" /> Upload Scores
        </Button>
        <Button size="sm" variant="outline" onClick={() => router.push("/payments")}>
          <Eye className="h-4 w-4 mr-1.5" /> Review Payments
        </Button>
        <Button size="sm" variant="outline" onClick={() => router.push("/assignments")}>
          <FilePlus className="h-4 w-4 mr-1.5" /> New Assignment
        </Button>
      </div>

      {/* Stat cards — 4 col on xl, 3 on lg, 2 on sm */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {statCards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      {/* Lower panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top 5 Performers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">⭐ Top Performers</CardTitle>
            <CardDescription>School-wide — {currentTerm} Term</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <DataTable
              columns={performerColumns}
              data={performerRows}
              isLoading={perfLoading}
              emptyMessage="No score data for this term yet."
            />
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">💳 Recent Payments</CardTitle>
            <CardDescription>Last 10 transactions</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <DataTable
              columns={paymentColumns}
              data={payments}
              isLoading={paymentsLoading}
              emptyMessage="No payments recorded yet."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

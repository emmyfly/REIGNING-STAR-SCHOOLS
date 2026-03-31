"use client";

import { useState } from "react";
import { RefreshCw, Download, MessageSquare, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useComplaints, useUpdateComplaint } from "@/hooks/useComplaints";
import { formatDate } from "@/lib/utils/formatting";
import { downloadCSV } from "@/lib/utils/csvImport";
import { Complaint, ComplaintStatus, ComplaintCategory } from "@/types";
import { cn } from "@/lib/utils";
import Papa from "papaparse";

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<ComplaintCategory, string> = {
  bullying:   "bg-red-100 text-red-700 border-red-200",
  academic:   "bg-blue-100 text-blue-700 border-blue-200",
  fees:       "bg-yellow-100 text-yellow-700 border-yellow-200",
  assignment: "bg-purple-100 text-purple-700 border-purple-200",
  teacher:    "bg-orange-100 text-orange-700 border-orange-200",
  facilities: "bg-teal-100 text-teal-700 border-teal-200",
  general:    "bg-gray-100 text-gray-700 border-gray-200",
  suggestion: "bg-green-100 text-green-700 border-green-200",
};

const CATEGORIES: ComplaintCategory[] = [
  "bullying","academic","fees","assignment","teacher","facilities","general","suggestion",
];

const STATUS_TABS: { value: ComplaintStatus | "all"; label: string; emoji: string }[] = [
  { value: "all",         label: "All",       emoji: "" },
  { value: "open",        label: "Open",      emoji: "🔴" },
  { value: "in_progress", label: "In Review", emoji: "🟡" },
  { value: "resolved",    label: "Resolved",  emoji: "✅" },
  { value: "closed",      label: "Closed",    emoji: "" },
];

// ─── Category badge ───────────────────────────────────────────────────────────
function CategoryBadge({ category }: { category: ComplaintCategory }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize",
      CATEGORY_COLORS[category]
    )}>
      {category === "bullying" && "⚠️ "}
      {category}
    </span>
  );
}

// ─── Detail dialog ────────────────────────────────────────────────────────────
function ComplaintDetailDialog({
  complaint,
  onClose,
}: {
  complaint: Complaint;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<ComplaintStatus>(complaint.status);
  const [response, setResponse] = useState(complaint.response ?? "");
  const updateMutation = useUpdateComplaint();

  const student = complaint.student as unknown as {
    full_name: string;
    admission_number: string;
    class?: { name: string };
  } | undefined;

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      id: complaint.id,
      status,
      response,
      studentId: complaint.student_id,
      isAnonymous: complaint.is_anonymous,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CategoryBadge category={complaint.category} />
            {complaint.subject}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student info */}
          <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-0.5">
            {complaint.is_anonymous ? (
              <p className="font-semibold text-muted-foreground italic">Anonymous Submission</p>
            ) : (
              <>
                <p className="font-semibold">{student?.full_name ?? complaint.submitted_by}</p>
                <p className="text-muted-foreground">
                  {student?.admission_number} · {student?.class?.name}
                </p>
              </>
            )}
            <p className="text-muted-foreground">Submitted: {formatDate(complaint.created_at)}</p>
          </div>

          {/* Complaint body */}
          <div className="space-y-1">
            <p className="text-xs font-medium">Complaint</p>
            <p className="text-sm rounded-lg border p-3 bg-background whitespace-pre-wrap leading-relaxed">
              {complaint.description}
            </p>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-xs font-medium">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as ComplaintStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Admin response */}
          <div className="space-y-1">
            <label className="text-xs font-medium">Admin Response</label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Write your response to the student / parent…"
              rows={4}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Anonymous warning */}
          {complaint.is_anonymous && (
            <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/30 p-3">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <strong>Anonymous complaint</strong> — the parent/student will NOT receive a notification.
                Your response is saved for internal records only.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />}
            Save Response & Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Complaint row ────────────────────────────────────────────────────────────
function ComplaintRow({
  complaint,
  onClick,
}: {
  complaint: Complaint;
  onClick: () => void;
}) {
  const student = complaint.student as unknown as {
    full_name: string;
    class?: { name: string };
  } | undefined;

  return (
    <tr
      className={cn(
        "border-t cursor-pointer hover:bg-muted/30 transition-colors",
        complaint.category === "bullying" && "bg-red-50/50"
      )}
      onClick={onClick}
    >
      <td className="px-4 py-2.5">
        <CategoryBadge category={complaint.category} />
      </td>
      <td className="px-4 py-2.5 font-medium max-w-[180px] truncate">
        {complaint.subject}
      </td>
      <td className="px-4 py-2.5 text-sm text-muted-foreground">
        {complaint.is_anonymous ? (
          <span className="italic">Anonymous</span>
        ) : (
          student?.full_name ?? complaint.submitted_by
        )}
      </td>
      <td className="px-4 py-2.5 text-sm text-muted-foreground">{student?.class?.name ?? "—"}</td>
      <td className="px-4 py-2.5 text-sm text-muted-foreground">{formatDate(complaint.created_at)}</td>
      <td className="px-4 py-2.5">
        <StatusBadge status={complaint.status} />
      </td>
    </tr>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function ComplaintsScreen() {
  const [activeTab, setActiveTab] = useState<ComplaintStatus | "all">("open");
  const [filterCategory, setFilterCategory] = useState<ComplaintCategory | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailTarget, setDetailTarget] = useState<Complaint | null>(null);

  const { data: complaints = [], isLoading } = useComplaints({
    status: activeTab,
    category: (filterCategory as ComplaintCategory) || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const handleExportCSV = () => {
    if (!complaints.length) return;
    const rows = complaints.map((c) => {
      const s = c.student as unknown as { full_name?: string; class?: { name?: string } } | undefined;
      return {
        date: formatDate(c.created_at),
        category: c.category,
        subject: c.subject,
        student: c.is_anonymous ? "Anonymous" : (s?.full_name ?? c.submitted_by),
        class: s?.class?.name ?? "",
        status: c.status,
        response: c.response ?? "",
      };
    });
    downloadCSV(Papa.unparse(rows), "complaints.csv");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Complaints</h2>
          <p className="text-sm text-muted-foreground">
            Review and respond to parent/student complaints
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!complaints.length}>
          <Download className="h-4 w-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as ComplaintCategory | "")}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          title="From date"
        />
        <span className="text-muted-foreground text-sm">–</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          title="To date"
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ComplaintStatus | "all")}
      >
        <TabsList>
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.emoji && <span className="mr-1">{t.emoji}</span>}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : complaints.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                <MessageSquare className="h-8 w-8 opacity-30" />
                <p className="text-sm">No complaints in this category.</p>
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/80">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Category</th>
                          <th className="px-4 py-2 text-left font-medium">Subject</th>
                          <th className="px-4 py-2 text-left font-medium">Student / By</th>
                          <th className="px-4 py-2 text-left font-medium">Class</th>
                          <th className="px-4 py-2 text-left font-medium">Date</th>
                          <th className="px-4 py-2 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {complaints.map((c) => (
                          <ComplaintRow
                            key={c.id}
                            complaint={c}
                            onClick={() => setDetailTarget(c)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {detailTarget && (
        <ComplaintDetailDialog
          complaint={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  );
}

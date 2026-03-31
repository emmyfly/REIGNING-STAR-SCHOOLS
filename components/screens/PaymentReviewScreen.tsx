"use client";

import { useState } from "react";
import {
  CheckCircle2, XCircle, RefreshCw, ExternalLink, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { usePayments, useVerifyPayment, useRejectPayment } from "@/hooks/usePayments";
import { useAcademicSessions, useAcademicTerms } from "@/hooks/useAcademicTerms";
import { formatCurrency, formatDate } from "@/lib/utils/formatting";
import { Payment, PaymentStatus } from "@/types";
import { cn } from "@/lib/utils";

// ─── Reject note dialog ───────────────────────────────────────────────────────
function RejectDialog({
  payment,
  onClose,
}: {
  payment: Payment;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const rejectMutation = useRejectPayment();

  const student = payment.student as unknown as { full_name: string } | undefined;

  const handleReject = async () => {
    await rejectMutation.mutateAsync({
      id: payment.id,
      studentId: payment.student_id,
      note,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reject Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Rejecting {formatCurrency(payment.amount_paid)} from {student?.full_name}.
          </p>
          <div className="space-y-1">
            <label className="text-xs font-medium">Rejection Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for rejection — visible to student…"
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>
            {rejectMutation.isPending && <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />}
            Reject Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Payment card ─────────────────────────────────────────────────────────────
function PaymentCard({
  payment,
  onVerify,
  onReject,
}: {
  payment: Payment;
  onVerify: () => void;
  onReject: () => void;
}) {
  const student = payment.student as unknown as {
    full_name: string;
    admission_number: string;
    class?: { name: string };
  } | undefined;
  const fee = payment.fee as unknown as {
    category: string;
    description: string;
  } | undefined;

  const isPending = payment.status === "pending";

  return (
    <Card className={cn(
      "transition-shadow hover:shadow-md",
      isPending && "border-warning/40"
    )}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={payment.status} />
              {fee?.category && (
                <Badge variant="outline" className="text-xs capitalize">{fee.category}</Badge>
              )}
            </div>
            <p className="font-semibold">{student?.full_name ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {student?.admission_number} · {student?.class?.name}
            </p>
            {fee?.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{fee.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-sm">
              <span className="font-bold text-success">{formatCurrency(payment.amount_paid)}</span>
              <span className="text-muted-foreground capitalize">
                {payment.payment_method.replace("_", " ")}
              </span>
              <span className="text-muted-foreground">{formatDate(payment.paid_at)}</span>
            </div>
          </div>

          {/* Receipt */}
          {payment.receipt_url && (
            <a
              href={payment.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
              title="View receipt"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Receipt</span>
            </a>
          )}
        </div>

        {isPending && (
          <div className="flex gap-2 mt-3 pt-2 border-t">
            <Button
              size="sm"
              className="flex-1 bg-success hover:bg-success/90 text-white h-8"
              onClick={onVerify}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Verify
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/5 h-8"
              onClick={onReject}
            >
              <XCircle className="h-4 w-4 mr-1.5" /> Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: PaymentStatus | "all"; label: string }[] = [
  { value: "all",     label: "All" },
  { value: "pending", label: "Pending" },
  { value: "paid",    label: "Verified" },
  { value: "overdue", label: "Rejected" },
];

export function PaymentReviewScreen() {
  const { data: sessions = [] } = useAcademicSessions();
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("pending");
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);

  const { data: terms = [] } = useAcademicTerms(selectedSessionId);
  const { data: payments = [], isLoading } = usePayments({
    status: statusFilter,
    sessionId: selectedSessionId || undefined,
    termId: selectedTermId || undefined,
  });
  const verifyMutation = useVerifyPayment();

  const pendingCount = payments.filter((p) => p.status === "pending").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payment Review</h2>
          <p className="text-sm text-muted-foreground">
            Verify or reject pending payment submissions
            {pendingCount > 0 && (
              <Badge className="ml-2 bg-warning text-white">{pendingCount} pending</Badge>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PaymentStatus | "all")}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedSessionId} onValueChange={(v) => { setSelectedSessionId(v); setSelectedTermId(""); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All sessions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All sessions</SelectItem>
            {sessions.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.session}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedSessionId && (
          <Select value={selectedTermId} onValueChange={setSelectedTermId}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All terms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All terms</SelectItem>
              {terms.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.term} Term</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading payments…</span>
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 opacity-30" />
          <p className="text-sm">No payments matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {payments.map((p) => (
            <PaymentCard
              key={p.id}
              payment={p}
              onVerify={() =>
                verifyMutation.mutate({
                  id: p.id,
                  studentId: p.student_id,
                  amount: p.amount_paid,
                })
              }
              onReject={() => setRejectTarget(p)}
            />
          ))}
        </div>
      )}

      {rejectTarget && (
        <RejectDialog
          payment={rejectTarget}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}

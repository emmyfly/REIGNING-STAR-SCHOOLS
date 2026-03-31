"use client";

import { useState } from "react";
import { ArrowLeft, RefreshCw, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable, Column } from "@/components/shared/DataTable";
import { useSubmissions, useGradeSubmission } from "@/hooks/useSubmissions";
import { useAssignments } from "@/hooks/useAssignments";
import { useStudentsByClass } from "@/hooks/useScores";
import { formatDate } from "@/lib/utils/formatting";
import { downloadCSV } from "@/lib/utils/csvImport";
import { Submission } from "@/types";
import Papa from "papaparse";

// ─── Grade dialog ─────────────────────────────────────────────────────────────
function GradeDialog({
  submission,
  assignmentTitle,
  maxScore,
  onClose,
}: {
  submission: Submission;
  assignmentTitle: string;
  maxScore: number;
  onClose: () => void;
}) {
  const [score, setScore] = useState(submission.score?.toString() ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [returnForRevision, setReturnForRevision] = useState(false);
  const gradeMutation = useGradeSubmission();

  const student = submission.student as unknown as {
    full_name: string;
    admission_number: string;
    class?: { name: string };
  } | undefined;

  const handleSave = async () => {
    await gradeMutation.mutateAsync({
      id: submission.id,
      studentId: submission.student_id,
      assignmentTitle,
      score: Number(score),
      feedback,
      status: returnForRevision ? "submitted" : "graded",
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Grade Submission</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-0.5">
            <p className="font-semibold">{student?.full_name ?? "—"}</p>
            <p className="text-muted-foreground">
              {student?.admission_number} · {student?.class?.name}
            </p>
            <p className="text-muted-foreground">Submitted: {formatDate(submission.submitted_at)}</p>
          </div>

          {submission.file_url && (
            <div className="space-y-1">
              <p className="text-xs font-medium">Uploaded File</p>
              <a
                href={submission.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View / Download submission
              </a>
            </div>
          )}

          {submission.text_response && (
            <div className="space-y-1">
              <p className="text-xs font-medium">Student Note</p>
              <p className="text-sm rounded-lg border p-3 bg-background whitespace-pre-wrap">
                {submission.text_response}
              </p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium">Score (0–{maxScore}) *</label>
            <Input
              type="number"
              min={0}
              max={maxScore}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="w-32"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Feedback</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Write feedback for the student…"
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={!returnForRevision ? "default" : "outline"}
              onClick={() => setReturnForRevision(false)}
            >
              Graded
            </Button>
            <Button
              size="sm"
              variant={returnForRevision ? "default" : "outline"}
              onClick={() => setReturnForRevision(true)}
            >
              Return for Revision
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!score || gradeMutation.isPending}>
            {gradeMutation.isPending && <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />}
            Save Grade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function SubmissionsScreen({
  assignmentId,
  onBack,
}: {
  assignmentId?: string;
  onBack?: () => void;
}) {
  const [gradeTarget, setGradeTarget] = useState<Submission | null>(null);

  const { data: assignments = [] } = useAssignments({});
  const assignment = assignments.find((a) => a.id === assignmentId);
  const { data: submissions = [], isLoading } = useSubmissions(assignmentId);
  const { data: classStudents = [] } = useStudentsByClass(assignment?.class_id === "all" ? undefined : assignment?.class_id);

  const graded    = submissions.filter((s) => s.status === "graded").length;
  const submitted = submissions.filter((s) => s.status === "submitted" || s.status === "late").length;
  const notSubmitted = Math.max(0, classStudents.length - submissions.length);

  const stats = [
    { label: "Total Submissions", value: submissions.length, color: "" },
    { label: "Submitted",         value: submitted,           color: "text-warning" },
    { label: "Graded",            value: graded,              color: "text-success" },
    { label: "Not Submitted",     value: notSubmitted,        color: "text-destructive" },
  ];

  const columns: Column<Submission>[] = [
    {
      key: "student",
      header: "Name",
      render: (s) => {
        const st = s.student as unknown as { full_name: string } | undefined;
        return <span className="font-medium">{st?.full_name ?? "—"}</span>;
      },
    },
    {
      key: "class",
      header: "Class",
      render: (s) => {
        const st = s.student as unknown as { class?: { name: string } } | undefined;
        return st?.class?.name ?? "—";
      },
    },
    { key: "submitted_at", header: "Submitted At", render: (s) => formatDate(s.submitted_at) },
    { key: "status",       header: "Status",       render: (s) => <StatusBadge status={s.status} /> },
    {
      key: "score",
      header: "Score",
      render: (s) =>
        s.score != null ? (
          <span className="font-mono font-medium">
            {s.score}/{assignment?.max_score ?? "—"}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "id",
      header: "Actions",
      render: (s) => (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setGradeTarget(s)}>
          {s.status === "graded" ? "Edit Grade" : "Grade"}
        </Button>
      ),
    },
  ];

  const handleExportCSV = () => {
    const rows = submissions.map((s) => {
      const st = s.student as unknown as {
        full_name?: string;
        admission_number?: string;
        class?: { name?: string };
      } | undefined;
      return {
        student_name:     st?.full_name ?? "",
        admission_number: st?.admission_number ?? "",
        class:            st?.class?.name ?? "",
        submitted_at:     s.submitted_at,
        status:           s.status,
        score:            s.score ?? "",
        feedback:         s.feedback ?? "",
      };
    });
    downloadCSV(Papa.unparse(rows), `${assignment?.title ?? "submissions"}.csv`);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="mt-0.5 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">Submissions</h2>
          <p className="text-sm text-muted-foreground">{assignment?.title ?? "Select an assignment"}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!submissions.length}>
          <Download className="h-4 w-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      {assignment && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{assignment.title}</CardTitle>
            <CardDescription>{assignment.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {assignment.subject?.name && <span>📚 {assignment.subject.name}</span>}
              {assignment.class?.name   && <span>🏫 {assignment.class.name}</span>}
              <span>📅 Due {formatDate(assignment.due_date)}</span>
              <span>Max score: {assignment.max_score}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <DataTable<Submission>
        columns={columns}
        data={submissions}
        isLoading={isLoading}
        emptyMessage="No submissions yet."
      />

      {gradeTarget && assignment && (
        <GradeDialog
          submission={gradeTarget}
          assignmentTitle={assignment.title}
          maxScore={assignment.max_score}
          onClose={() => setGradeTarget(null)}
        />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Plus, Eye, Pencil, Trash2, RefreshCw, BookOpen,
  FileUp, Users, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FileUploadZone } from "@/components/shared/FileUploadZone";
import { useClasses } from "@/hooks/useStudents";
import { useSubjectsByClass } from "@/hooks/useScores";
import { useAcademicSessions, useAcademicTerms } from "@/hooks/useAcademicTerms";import {
  useAssignments, useCreateAssignment, useUpdateAssignment, useDeleteAssignment,
} from "@/hooks/useAssignments";
import { useSettingsStore } from "@/stores/settingsStore";
import { formatDate } from "@/lib/utils/formatting";
import { Assignment, AssignmentStatus, AssignmentType } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────
const ASSIGNMENT_TYPES: { value: AssignmentType; label: string }[] = [
  { value: "holiday",    label: "Holiday" },
  { value: "project",    label: "Project" },
  { value: "take_home",  label: "Take-Home" },
  { value: "class_work", label: "Class Work" },
];

const STATUS_TABS: { value: AssignmentStatus | "all"; label: string }[] = [
  { value: "all",       label: "All" },
  { value: "published", label: "Published" },
  { value: "draft",     label: "Drafts" },
  { value: "closed",    label: "Past Due" },
];

// ─── Assignment form dialog ───────────────────────────────────────────────────
interface AssignmentFormValues {
  title: string;
  description: string;
  type: AssignmentType;
  subject_id: string;
  class_id: string;
  session_id: string;
  term_id: string;
  due_date: string;
  max_score: number;
  instructions: string;
}

const EMPTY_FORM: AssignmentFormValues = {
  title: "",
  description: "",
  type: "take_home",
  subject_id: "",
  class_id: "",
  session_id: "",
  term_id: "",
  due_date: "",
  max_score: 40,
  instructions: "",
};

function AssignmentFormDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Assignment;
}) {
  const { data: classes = [] } = useClasses();
  const { data: sessions = [] } = useAcademicSessions();
  const [form, setForm] = useState<AssignmentFormValues>(() =>
    initial
      ? {
          title: initial.title,
          description: initial.description,
          type: initial.type,
          subject_id: initial.subject_id,
          class_id: initial.class_id,
          session_id: initial.session_id,
          term_id: initial.term_id,
          due_date: initial.due_date,
          max_score: initial.max_score,
          instructions: initial.instructions ?? "",
        }
      : EMPTY_FORM
  );
  const [files, setFiles] = useState<File[]>([]);

  const { data: terms = [] } = useAcademicTerms(form.session_id);
  const { data: subjects = [] } = useSubjectsByClass(
    form.class_id === "all" ? undefined : form.class_id
  );

  const createMutation = useCreateAssignment();
  const updateMutation = useUpdateAssignment();

  const set = (field: keyof AssignmentFormValues, value: string | number) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (status: AssignmentStatus) => {
    const payload = { ...form, status };
    if (initial) {
      await updateMutation.mutateAsync({
        id: initial.id,
        values: payload,
        notifyOnPublish: status === "published",
      });
    } else {
      await createMutation.mutateAsync({ values: payload, files });
    }
    onClose();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Assignment" : "New Assignment"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <label className="text-xs font-medium">Title *</label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Assignment title" />
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-xs font-medium">Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Brief description visible to students"
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Type *</label>
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Target Class *</label>
            <Select value={form.class_id} onValueChange={(v) => set("class_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Subject *</label>
            <Select value={form.subject_id} onValueChange={(v) => set("subject_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Max Score *</label>
            <Input
              type="number"
              min={1}
              value={form.max_score}
              onChange={(e) => set("max_score", Number(e.target.value))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Session *</label>
            <Select value={form.session_id} onValueChange={(v) => set("session_id", v)}>
              <SelectTrigger><SelectValue placeholder="Session" /></SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.session}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Term *</label>
            <Select value={form.term_id} onValueChange={(v) => set("term_id", v)} disabled={!form.session_id}>
              <SelectTrigger><SelectValue placeholder="Term" /></SelectTrigger>
              <SelectContent>
                {terms.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.term} Term</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-xs font-medium">Due Date & Time *</label>
            <Input
              type="datetime-local"
              value={form.due_date}
              onChange={(e) => set("due_date", e.target.value)}
            />
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-xs font-medium">Instructions / Rubric</label>
            <textarea
              value={form.instructions}
              onChange={(e) => set("instructions", e.target.value)}
              placeholder="Detailed instructions, rubric, or marking guide…"
              rows={4}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {!initial && (
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium">Attach Files</label>
              <FileUploadZone
                accept="*"
                onFileSelected={(f) => setFiles((prev) => [...prev, f])}
                label="Attach assignment files"
                description="Any file type — PDFs, images, Word docs…"
              />
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {files.map((f, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 text-xs">
                      {f.name}
                      <button
                        onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                        className="ml-1 hover:text-destructive"
                      >×</button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            variant="outline"
            onClick={() => handleSubmit("draft")}
            disabled={isPending || !form.title}
          >
            {isPending && <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />}
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSubmit("published")}
            disabled={isPending || !form.title || !form.class_id || !form.subject_id || !form.due_date}
          >
            {isPending && <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assignment card ──────────────────────────────────────────────────────────
function AssignmentCard({
  assignment,
  onEdit,
  onDelete,
  onViewSubmissions,
  onTogglePublish,
}: {
  assignment: Assignment;
  onEdit: () => void;
  onDelete: () => void;
  onViewSubmissions: () => void;
  onTogglePublish: () => void;
}) {
  const isPast = assignment.due_date && new Date(assignment.due_date) < new Date();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <StatusBadge status={assignment.status} />
              <Badge variant="outline" className="text-xs capitalize">
                {assignment.type.replace("_", " ")}
              </Badge>
              {isPast && assignment.status !== "closed" && (
                <Badge variant="outline" className="text-xs text-warning border-warning/50">
                  <AlertCircle className="h-3 w-3 mr-1" /> Past Due
                </Badge>
              )}
            </div>
            <p className="font-semibold truncate">{assignment.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{assignment.description}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-xs text-muted-foreground">
              {assignment.subject?.name && <span>📚 {assignment.subject.name}</span>}
              {assignment.class?.name && <span>🏫 {assignment.class.name}</span>}
              <span>📅 Due {formatDate(assignment.due_date)}</span>
              <span>Max: {assignment.max_score}</span>
            </div>
          </div>
          {(assignment.submission_count ?? 0) > 0 && (
            <Badge className="shrink-0 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
              onClick={onViewSubmissions}>
              <Users className="h-3 w-3 mr-1" />
              {assignment.submission_count} submissions
            </Badge>
          )}
        </div>

        <div className="flex gap-1.5 mt-3 pt-2 border-t flex-wrap">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewSubmissions}>
            <Eye className="h-3.5 w-3.5 mr-1" /> Submissions
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onTogglePublish}>
            <FileUp className="h-3.5 w-3.5 mr-1" />
            {assignment.status === "published" ? "Unpublish" : "Publish"}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function AssignmentsScreen({
  onViewSubmissions,
}: {
  onViewSubmissions?: (assignmentId: string) => void;
}) {
  const { currentTerm, currentSession } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<AssignmentStatus | "all">("all");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterTerm, setFilterTerm] = useState("");
  const [filterType, setFilterType] = useState<AssignmentType | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Assignment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);

  const { data: classes = [] } = useClasses();
  const { data: subjects = [] } = useSubjectsByClass(filterClass || undefined);
  const { data: sessions = [] } = useAcademicSessions();
  const currentSessionId = sessions.find((s) => s.session === currentSession)?.id;
  const { data: terms = [] } = useAcademicTerms(currentSessionId);

  const { data: assignments = [], isLoading } = useAssignments({
    status: activeTab,
    subjectId: filterSubject || undefined,
    classId: filterClass || undefined,
    termId: filterTerm || undefined,
    type: (filterType as AssignmentType) || undefined,
  });

  const updateMutation = useUpdateAssignment();
  const deleteMutation = useDeleteAssignment();

  const handleTogglePublish = (a: Assignment) => {
    const next: AssignmentStatus = a.status === "published" ? "draft" : "published";
    updateMutation.mutate({
      id: a.id,
      values: { status: next },
      notifyOnPublish: next === "published",
    });
  };

  const openEdit = (a: Assignment) => {
    setEditTarget(a);
    setShowForm(true);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Heading */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Assignments</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage assignments — {currentTerm} Term
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditTarget(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> New Assignment
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterClass} onValueChange={(v) => { setFilterClass(v); setFilterSubject(""); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSubject} onValueChange={setFilterSubject} disabled={!filterClass}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterTerm} onValueChange={setFilterTerm}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All terms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All terms</SelectItem>
            {terms.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.term} Term</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as AssignmentType | "")}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All types</SelectItem>
            {ASSIGNMENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AssignmentStatus | "all")}>
        <TabsList>
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : assignments.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                <BookOpen className="h-8 w-8 opacity-30" />
                <p className="text-sm">No assignments found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {assignments.map((a) => (
                  <AssignmentCard
                    key={a.id}
                    assignment={a}
                    onEdit={() => openEdit(a)}
                    onDelete={() => setDeleteTarget(a)}
                    onViewSubmissions={() => onViewSubmissions?.(a.id)}
                    onTogglePublish={() => handleTogglePublish(a)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Form dialog */}
      <AssignmentFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditTarget(null); }}
        initial={editTarget ?? undefined}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Assignment"
        description={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

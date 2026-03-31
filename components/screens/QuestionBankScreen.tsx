"use client";

import { useState } from "react";
import {
  Plus, Pencil, Trash2, RefreshCw, HelpCircle,
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
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useClasses } from "@/hooks/useStudents";
import { useSubjectsByClass } from "@/hooks/useScores";
import { useQuestions, useCreateQuestion, useUpdateQuestion, useDeleteQuestion } from "@/hooks/useQuestions";
import { Question, QuestionType } from "@/types";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPES: { value: QuestionType; label: string }[] = [
  { value: "mcq",          label: "Multiple Choice" },
  { value: "true_false",   label: "True / False" },
  { value: "short_answer", label: "Short / Essay" },
];

const TYPE_COLORS: Record<QuestionType, string> = {
  mcq:          "bg-blue-100 text-blue-700",
  true_false:   "bg-purple-100 text-purple-700",
  short_answer: "bg-green-100 text-green-700",
};

// ─── Question form ────────────────────────────────────────────────────────────
interface QuestionForm {
  text: string;
  type: QuestionType;
  class_id: string;
  subject_id: string;
  options: [string, string, string, string];
  correct_answer: string;
  marks: number;
  tags: string;
}

const EMPTY: QuestionForm = {
  text: "",
  type: "mcq",
  class_id: "",
  subject_id: "",
  options: ["", "", "", ""],
  correct_answer: "",
  marks: 1,
  tags: "",
};

function QuestionFormDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Question;
}) {
  const [form, setForm] = useState<QuestionForm>(() =>
    initial
      ? {
          text: initial.text,
          type: initial.type,
          class_id: initial.class_id,
          subject_id: initial.subject_id,
          options: ((initial.options ?? ["", "", "", ""]).concat(["", "", "", ""])).slice(0, 4) as [string, string, string, string],
          correct_answer: initial.correct_answer,
          marks: initial.marks,
          tags: (initial as Question & { tags?: string[] }).tags?.join(", ") ?? "",
        }
      : EMPTY
  );

  const { data: classes = [] } = useClasses();
  const { data: subjects = [] } = useSubjectsByClass(form.class_id);
  const createMutation = useCreateQuestion();
  const updateMutation = useUpdateQuestion();

  const set = <K extends keyof QuestionForm>(k: K, v: QuestionForm[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const setOption = (i: number, v: string) =>
    setForm((p) => {
      const opts = [...p.options] as [string, string, string, string];
      opts[i] = v;
      return { ...p, options: opts };
    });

  const handleSave = async () => {
    const payload = {
      text: form.text,
      type: form.type,
      class_id: form.class_id,
      subject_id: form.subject_id,
      options: form.type === "mcq" ? form.options.filter(Boolean) : undefined,
      correct_answer: form.correct_answer,
      marks: form.marks,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    if (initial) {
      await updateMutation.mutateAsync({ id: initial.id, values: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onClose();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSave = form.text && form.class_id && form.subject_id && form.correct_answer;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Question" : "Add Question"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type */}
          <div className="flex gap-2">
            {TYPES.map((t) => (
              <Button
                key={t.value}
                size="sm"
                variant={form.type === t.value ? "default" : "outline"}
                onClick={() => set("type", t.value)}
              >
                {t.label}
              </Button>
            ))}
          </div>

          {/* Class + Subject */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Class *</label>
              <Select value={form.class_id} onValueChange={(v) => set("class_id", v)}>
                <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Subject *</label>
              <Select value={form.subject_id} onValueChange={(v) => set("subject_id", v)} disabled={!form.class_id}>
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Question text */}
          <div className="space-y-1">
            <label className="text-xs font-medium">Question Text *</label>
            <textarea
              value={form.text}
              onChange={(e) => set("text", e.target.value)}
              placeholder="Enter the question…"
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* MCQ options */}
          {form.type === "mcq" && (
            <div className="space-y-2">
              <label className="text-xs font-medium">Options (A–D)</label>
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-medium w-6 shrink-0 text-center text-muted-foreground">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <Input
                    value={opt}
                    onChange={(e) => setOption(i, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  />
                  <input
                    type="radio"
                    name="correct"
                    checked={form.correct_answer === opt && !!opt}
                    onChange={() => set("correct_answer", opt)}
                    className="shrink-0"
                    title="Mark as correct"
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Select the radio button next to the correct answer.</p>
            </div>
          )}

          {/* True/False */}
          {form.type === "true_false" && (
            <div className="space-y-1">
              <label className="text-xs font-medium">Correct Answer</label>
              <div className="flex gap-2">
                {["True", "False"].map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant={form.correct_answer === v ? "default" : "outline"}
                    onClick={() => set("correct_answer", v)}
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Short answer */}
          {form.type === "short_answer" && (
            <div className="space-y-1">
              <label className="text-xs font-medium">Model Answer / Keywords *</label>
              <textarea
                value={form.correct_answer}
                onChange={(e) => set("correct_answer", e.target.value)}
                placeholder="Expected answer or keywords for grading…"
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {/* Marks + Tags */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Marks</label>
              <Input
                type="number"
                min={1}
                value={form.marks}
                onChange={(e) => set("marks", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Tags (comma-separated)</label>
              <Input
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="algebra, fractions…"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave || isPending}>
            {isPending && <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />}
            Save Question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Question row card ────────────────────────────────────────────────────────
function QuestionCard({
  question,
  onEdit,
  onDelete,
}: {
  question: Question;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const subjectName = (question.subject as unknown as { name: string } | undefined)?.name;
  const tags = (question as Question & { tags?: string[] }).tags ?? [];

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start gap-3">
          <span className={cn("shrink-0 mt-0.5 px-2 py-0.5 rounded text-xs font-medium", TYPE_COLORS[question.type])}>
            {TYPES.find((t) => t.value === question.type)?.label}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium line-clamp-2">{question.text}</p>
            <div className="flex flex-wrap gap-2 mt-1.5 items-center">
              {subjectName && (
                <span className="text-xs text-muted-foreground">{subjectName}</span>
              )}
              <span className="text-xs text-muted-foreground">{question.marks} mk{question.marks !== 1 ? "s" : ""}</span>
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs h-5">{tag}</Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function QuestionBankScreen() {
  const [filterClass, setFilterClass] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterType, setFilterType] = useState<QuestionType | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Question | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);

  const { data: classes = [] } = useClasses();
  const { data: subjects = [] } = useSubjectsByClass(filterClass || undefined);
  const { data: questions = [], isLoading } = useQuestions({
    classId: filterClass || undefined,
    subjectId: filterSubject || undefined,
    type: (filterType as QuestionType) || undefined,
  });
  const deleteMutation = useDeleteQuestion();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Question Bank</h2>
          <p className="text-sm text-muted-foreground">
            {questions.length} question{questions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditTarget(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Question
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterClass} onValueChange={(v) => { setFilterClass(v); setFilterSubject(""); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All classes</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSubject} onValueChange={setFilterSubject} disabled={!filterClass}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All subjects</SelectItem>
            {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as QuestionType | "")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All types</SelectItem>
            {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <HelpCircle className="h-8 w-8 opacity-30" />
          <p className="text-sm">No questions found. Add some to your bank.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              onEdit={() => { setEditTarget(q); setShowForm(true); }}
              onDelete={() => setDeleteTarget(q)}
            />
          ))}
        </div>
      )}

      <QuestionFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditTarget(null); }}
        initial={editTarget ?? undefined}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Question"
        description="Delete this question? This cannot be undone."
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

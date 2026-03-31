"use client";

import { useState, useMemo } from "react";
import {
  Plus, Minus, RefreshCw, GripVertical, Search,
  ChevronUp, ChevronDown, BookOpen, FileDown,
} from "lucide-react";
import { downloadBlob } from "@/lib/utils/pdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useClasses } from "@/hooks/useStudents";
import { useSubjectsByClass } from "@/hooks/useScores";
import { useAcademicSessions, useAcademicTerms } from "@/hooks/useAcademicTerms";
import { useQuestions, useUpsertExam } from "@/hooks/useQuestions";
import { Question, QuestionType } from "@/types";
import { cn } from "@/lib/utils";

const TYPES: Record<QuestionType, string> = {
  mcq:          "MCQ",
  true_false:   "T/F",
  short_answer: "Essay",
};

const TYPE_COLORS: Record<QuestionType, string> = {
  mcq:          "bg-blue-100 text-blue-700",
  true_false:   "bg-purple-100 text-purple-700",
  short_answer: "bg-green-100 text-green-700",
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export function ExamBuilderScreen() {
  // Exam meta
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [termId, setTermId] = useState("");

  // Question picker state
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<QuestionType | "">("");

  // Selected questions (ordered list)
  const [selected, setSelected] = useState<Question[]>([]);

  const { data: classes = [] }  = useClasses();
  const { data: subjects = [] } = useSubjectsByClass(classId);
  const { data: sessions = [] } = useAcademicSessions();
  const { data: terms = [] }    = useAcademicTerms(sessionId);
  const { data: bank = [], isLoading } = useQuestions({
    classId: classId || undefined,
    subjectId: subjectId || undefined,
    type: (filterType as QuestionType) || undefined,
  });

  const upsertMutation = useUpsertExam();

  const selectedIds = useMemo(() => new Set(selected.map((q) => q.id)), [selected]);

  const filtered = useMemo(() => {
    if (!search.trim()) return bank;
    const q = search.toLowerCase();
    return bank.filter((qu) => qu.text.toLowerCase().includes(q));
  }, [bank, search]);

  const totalMarks = selected.reduce((s, q) => s + q.marks, 0);

  const toggleQuestion = (q: Question) => {
    if (selectedIds.has(q.id)) {
      setSelected((prev) => prev.filter((s) => s.id !== q.id));
    } else {
      setSelected((prev) => [...prev, q]);
    }
  };

  const moveUp = (i: number) => {
    if (i === 0) return;
    setSelected((prev) => {
      const arr = [...prev];
      [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      return arr;
    });
  };

  const moveDown = (i: number) => {
    setSelected((prev) => {
      if (i >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
      return arr;
    });
  };

  const handleSave = () => {
    if (!title || !classId || !subjectId) return;
    upsertMutation.mutate({
      title,
      class_id: classId,
      subject_id: subjectId,
      session_id: sessionId,
      term_id: termId,
      question_ids: selected.map((q) => q.id),
      total_marks: totalMarks,
    });
  };

  const handleExportPDF = async () => {
    const { pdf } = await import("@react-pdf/renderer");
    const { ExamPaperDocument } = await import("@/lib/pdf/ExamPaperDocument");
    const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? "";
    const className   = classes.find((c) => c.id === classId)?.name ?? "";
    const termName    = terms.find((t) => t.id === termId)?.term ?? "";
    const sessionName = sessions.find((s) => s.id === sessionId)?.session ?? "";
    const blob = await pdf(
      <ExamPaperDocument
        title={title}
        subjectName={subjectName}
        className={className}
        term={termName}
        session={sessionName}
        questions={selected}
      />
    ).toBlob();
    downloadBlob(blob, `${title.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Exam Builder</h2>
          <p className="text-sm text-muted-foreground">
            Pick questions from your bank and build an exam paper
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
          disabled={!title || !selected.length}
        >
          <FileDown className="h-4 w-4 mr-1.5" /> Export PDF
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!title || !classId || !subjectId || !selected.length || upsertMutation.isPending}
        >
          {upsertMutation.isPending && <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />}
          Save Exam
        </Button>
      </div>

      {/* Exam meta */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <div className="col-span-2 sm:col-span-3 xl:col-span-2 space-y-1">
              <label className="text-xs font-medium">Exam Title *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mid-Term Mathematics" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Class *</label>
              <Select value={classId} onValueChange={(v) => { setClassId(v); setSubjectId(""); }}>
                <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Subject *</label>
              <Select value={subjectId} onValueChange={setSubjectId} disabled={!classId}>
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Session</label>
              <Select value={sessionId} onValueChange={setSessionId}>
                <SelectTrigger><SelectValue placeholder="Session" /></SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => <SelectItem key={s.id} value={s.id}>{s.session}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Term</label>
              <Select value={termId} onValueChange={setTermId} disabled={!sessionId}>
                <SelectTrigger><SelectValue placeholder="Term" /></SelectTrigger>
                <SelectContent>
                  {terms.map((t) => <SelectItem key={t.id} value={t.id}>{t.term} Term</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Question picker */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Question Bank</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Bank filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search questions…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as QuestionType | "")}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="mcq">MCQ</SelectItem>
                  <SelectItem value="true_false">True/False</SelectItem>
                  <SelectItem value="short_answer">Essay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <BookOpen className="h-6 w-6 opacity-30" />
                <p className="text-xs">{classId ? "No questions match filters" : "Select a class first"}</p>
              </div>
            ) : (
              <div className="space-y-1 overflow-auto max-h-[400px]">
                {filtered.map((q) => {
                  const isSelected = selectedIds.has(q.id);
                  return (
                    <div
                      key={q.id}
                      className={cn(
                        "flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors text-sm",
                        isSelected
                          ? "border-primary/40 bg-primary/5"
                          : "hover:bg-muted/40"
                      )}
                      onClick={() => toggleQuestion(q)}
                    >
                      <span className={cn("shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium", TYPE_COLORS[q.type])}>
                        {TYPES[q.type]}
                      </span>
                      <p className="flex-1 line-clamp-2">{q.text}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-muted-foreground">{q.marks}mk</span>
                        {isSelected
                          ? <Minus className="h-3.5 w-3.5 text-destructive" />
                          : <Plus className="h-3.5 w-3.5 text-success" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected questions */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Exam Paper</CardTitle>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">{selected.length} questions</Badge>
                <Badge variant="outline" className="text-success border-success/50">
                  {totalMarks} marks total
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selected.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <GripVertical className="h-6 w-6 opacity-30" />
                <p className="text-xs">Click questions on the left to add them here</p>
              </div>
            ) : (
              <div className="space-y-1 overflow-auto max-h-[400px]">
                {selected.map((q, i) => (
                  <div
                    key={q.id}
                    className="flex items-start gap-2 rounded-lg border p-2.5 bg-background text-sm"
                  >
                    <span className="text-xs font-bold text-muted-foreground w-6 shrink-0 pt-0.5 text-right">{i + 1}.</span>
                    <p className="flex-1 line-clamp-2">{q.text}</p>
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveUp(i)}>
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveDown(i)}>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
                      onClick={() => toggleQuestion(q)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

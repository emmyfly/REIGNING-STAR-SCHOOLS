"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Upload, Download, CheckCircle2, AlertTriangle, XCircle,
  FileText, Table2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileUploadZone } from "@/components/shared/FileUploadZone";
import { TermSelector } from "@/components/shared/TermSelector";
import { useSettingsStore } from "@/stores/settingsStore";
import { useClasses } from "@/hooks/useStudents";
import { useSubjectsByClass, useStudentsByClass, useBulkUpsertScores } from "@/hooks/useScores";
import { useAcademicSessions, useAcademicTerms } from "@/hooks/useAcademicTerms";
import {
  detectCSVFormat, parseFormatA, parseFormatB,
  generateFormatATemplate, generateFormatBTemplate,
  downloadCSV, readFileAsText,
} from "@/lib/utils/csvImport";
import { computeTotal, getGrade, DEFAULT_GRADE_SCALE } from "@/lib/utils/grading";
import { ParsedScoreRow, Term } from "@/types";
import { cn } from "@/lib/utils";

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ step, current }: { step: number; current: number }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className={cn(
      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border-2 transition-colors",
      done  ? "bg-success border-success text-white"
      : active ? "border-primary text-primary bg-primary/10"
      : "border-muted-foreground/30 text-muted-foreground"
    )}>
      {done ? <CheckCircle2 className="h-4 w-4" /> : step}
    </div>
  );
}

// ─── Status summary bar ───────────────────────────────────────────────────────
function SummaryBar({ rows }: { rows: ParsedScoreRow[] }) {
  const valid   = rows.filter((r) => r.status === "valid").length;
  const warn    = rows.filter((r) => r.status === "warning").length;
  const errors  = rows.filter((r) => r.status === "error").length;

  return (
    <div className="flex flex-wrap gap-3 rounded-lg border p-3 bg-muted/30">
      <span className="flex items-center gap-1.5 text-sm text-success font-medium">
        <CheckCircle2 className="h-4 w-4" /> {valid} valid
      </span>
      <span className="flex items-center gap-1.5 text-sm text-warning font-medium">
        <AlertTriangle className="h-4 w-4" /> {warn} warnings
      </span>
      <span className="flex items-center gap-1.5 text-sm text-destructive font-medium">
        <XCircle className="h-4 w-4" /> {errors} errors
      </span>
      <span className="ml-auto text-xs text-muted-foreground self-center">
        {rows.length} rows total
      </span>
    </div>
  );
}

// ─── Preview table ────────────────────────────────────────────────────────────
function PreviewTable({ rows }: { rows: ParsedScoreRow[] }) {
  return (
    <div className="overflow-auto max-h-[380px] rounded-lg border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
          <tr>
            <th className="px-3 py-2 text-left font-medium">St.</th>
            <th className="px-3 py-2 text-left font-medium">Adm #</th>
            <th className="px-3 py-2 text-left font-medium">Subject</th>
            <th className="px-3 py-2 text-right font-medium">CA/40</th>
            <th className="px-3 py-2 text-right font-medium">Exam/60</th>
            <th className="px-3 py-2 text-right font-medium">Total</th>
            <th className="px-3 py-2 text-center font-medium">Grade</th>
            <th className="px-3 py-2 text-left font-medium">Issue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={cn(
                "border-t",
                r.status === "error"   ? "bg-destructive/5"
                : r.status === "warning" ? "bg-warning/5"
                : ""
              )}
            >
              <td className="px-3 py-1.5">
                {r.status === "valid"   ? <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                : r.status === "warning" ? <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                : <XCircle className="h-3.5 w-3.5 text-destructive" />}
              </td>
              <td className="px-3 py-1.5 font-mono text-xs">{r.admission_number || "—"}</td>
              <td className="px-3 py-1.5">{r.subject_name || "—"}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {r.status === "valid" ? r.ca_score : "—"}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {r.status === "valid" ? r.exam : "—"}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                {r.status === "valid" ? r.total : "—"}
              </td>
              <td className="px-3 py-1.5 text-center">
                {r.status === "valid" ? (
                  <Badge variant="outline" className="text-xs">{r.grade}</Badge>
                ) : "—"}
              </td>
              <td className="px-3 py-1.5 text-xs text-muted-foreground max-w-[180px] truncate">
                {r.message ?? ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Manual entry grid ────────────────────────────────────────────────────────
interface ManualRow {
  student_id: string;
  subject_id: string;
  ca_score: string;
  exam: string;
}

function ManualEntryTab({
  classId,
  termId,
}: {
  classId?: string;
  termId?: string;
}) {
  const { data: students = [] } = useStudentsByClass(classId);
  const { data: subjects = [] } = useSubjectsByClass(classId);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [rows, setRows] = useState<Record<string, ManualRow>>({});
  const bulkUpsert = useBulkUpsertScores();

  const subject = subjects.find((s) => s.id === selectedSubject);

  const updateRow = (studentId: string, field: "ca_score" | "exam", value: string) => {
    setRows((prev) => ({
      ...prev,
      [studentId]: {
        student_id: studentId,
        subject_id: selectedSubject,
        ca_score: field === "ca_score" ? value : (prev[studentId]?.ca_score ?? ""),
        exam:     field === "exam"     ? value : (prev[studentId]?.exam ?? ""),
      },
    }));
  };

  const handleSubmit = () => {
    if (!termId) return;
    const parsedRows: ParsedScoreRow[] = Object.values(rows)
      .filter((r) => r.ca_score !== "" || r.exam !== "")
      .map((r) => {
        const ca = parseFloat(r.ca_score);
        const ex = parseFloat(r.exam);
        if (isNaN(ca) || isNaN(ex) || ca < 0 || ca > 40 || ex < 0 || ex > 60) {
          return {
            student_id: r.student_id,
            subject_id: r.subject_id,
            admission_number: "",
            subject_name: subject?.name ?? "",
            ca_score: 0,
            exam: 0,
            total: 0,
            grade: "—",
            status: "error" as const,
            message: "Invalid score range",
          };
        }
        const total = computeTotal(ca, ex);
        const { grade } = getGrade(total, DEFAULT_GRADE_SCALE);
        return {
          student_id: r.student_id,
          subject_id: r.subject_id,
          admission_number: "",
          subject_name: subject?.name ?? "",
          ca_score: ca,
          exam: ex,
          total,
          grade,
          status: "valid" as const,
        };
      });

    bulkUpsert.mutate({ rows: parsedRows, termId });
  };

  if (!classId) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
        <Table2 className="h-8 w-8 opacity-30" />
        <p className="text-sm">Select a class first</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          disabled={!selectedSubject || !termId || bulkUpsert.isPending}
          onClick={handleSubmit}
        >
          {bulkUpsert.isPending && <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />}
          Save Scores
        </Button>
      </div>

      {selectedSubject && (
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/80">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Student</th>
                <th className="px-3 py-2 text-left font-medium">Adm #</th>
                <th className="px-3 py-2 text-center font-medium">CA /40</th>
                <th className="px-3 py-2 text-center font-medium">Exam /60</th>
                <th className="px-3 py-2 text-center font-medium">Total</th>
                <th className="px-3 py-2 text-center font-medium">Grade</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const row = rows[student.id];
                const ca  = parseFloat(row?.ca_score ?? "");
                const ex  = parseFloat(row?.exam ?? "");
                const total = (!isNaN(ca) && !isNaN(ex)) ? computeTotal(ca, ex) : null;
                const { grade } = total !== null ? getGrade(total, DEFAULT_GRADE_SCALE) : { grade: "—" };
                return (
                  <tr key={student.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-1.5 font-medium">{student.full_name}</td>
                    <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">
                      {student.admission_number}
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        min={0}
                        max={40}
                        step={0.5}
                        placeholder="0–40"
                        value={row?.ca_score ?? ""}
                        onChange={(e) => updateRow(student.id, "ca_score", e.target.value)}
                        className="w-20 h-8 text-center text-sm mx-auto"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        min={0}
                        max={60}
                        step={0.5}
                        placeholder="0–60"
                        value={row?.exam ?? ""}
                        onChange={(e) => updateRow(student.id, "exam", e.target.value)}
                        className="w-20 h-8 text-center text-sm mx-auto"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-center tabular-nums font-medium">
                      {total ?? "—"}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      {total !== null ? (
                        <Badge variant="outline" className="text-xs">{grade}</Badge>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── CSV Upload tab ───────────────────────────────────────────────────────────
type UploadStep = 1 | 2 | 3;

function CSVUploadTab({
  classId,
  termId,
}: {
  classId?: string;
  termId?: string;
}) {
  const { data: students = [] } = useStudentsByClass(classId);
  const { data: subjects = [] } = useSubjectsByClass(classId);
  const bulkUpsert = useBulkUpsertScores();

  const [step, setStep] = useState<UploadStep>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedScoreRow[]>([]);
  const [detectedFormat, setDetectedFormat] = useState<string>("");

  const validCount = parsedRows.filter((r) => r.status === "valid").length;

  const handleFileSelected = useCallback(
    async (f: File) => {
      setFile(f);
      if (!classId) return;
      const text = await readFileAsText(f);
      // Detect format from first line headers
      const firstLine = text.split("\n")[0] ?? "";
      const headers = firstLine.split(",").map((h) => h.trim().replace(/"/g, ""));
      const fmt = detectCSVFormat(headers);
      setDetectedFormat(fmt === "A" ? "Format A (long)" : fmt === "B" ? "Format B (wide)" : "Unknown format");

      const rows =
        fmt === "A" ? parseFormatA(text, students, subjects)
        : fmt === "B" ? parseFormatB(text, students, subjects)
        : [];

      setParsedRows(rows);
      setStep(2);
    },
    [classId, students, subjects]
  );

  const handleConfirm = () => {
    if (!termId) return;
    bulkUpsert.mutate(
      { rows: parsedRows, termId },
      {
        onSuccess: () => {
          setStep(3);
        },
      }
    );
  };

  const reset = () => {
    setStep(1);
    setFile(null);
    setParsedRows([]);
    setDetectedFormat("");
  };

  if (!classId) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
        <Upload className="h-8 w-8 opacity-30" />
        <p className="text-sm">Select a class first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="flex items-center gap-3">
        {([1, 2, 3] as UploadStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <StepIndicator step={s} current={step} />
            <span className={cn(
              "text-sm",
              step === s ? "font-semibold text-foreground" : "text-muted-foreground"
            )}>
              {s === 1 ? "Upload File" : s === 2 ? "Review" : "Done"}
            </span>
            {i < 2 && <div className="h-px w-8 bg-muted-foreground/20" />}
          </div>
        ))}
      </div>

      {/* Step 1 — Upload */}
      {step === 1 && (
        <div className="space-y-4">
          <FileUploadZone
            accept=".csv"
            onFileSelected={handleFileSelected}
            label="Drop score CSV here"
            description="Supports Format A (long) and Format B (wide)"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCSV(generateFormatATemplate(students, subjects), "scores-format-a.csv")
              }
            >
              <Download className="h-4 w-4 mr-1.5" /> Template A (long)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCSV(generateFormatBTemplate(students, subjects), "scores-format-b.csv")
              }
            >
              <Download className="h-4 w-4 mr-1.5" /> Template B (wide)
            </Button>
          </div>
          <div className="rounded-lg bg-muted/40 p-4 space-y-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-2">CSV Format Guide</p>
            <p><strong>Format A (long):</strong> One row per student-subject pair.</p>
            <p>Columns: <code>admission_number, subject, ca_score, exam_score</code></p>
            <p className="mt-2"><strong>Format B (wide):</strong> One row per student, one column pair per subject.</p>
            <p>Columns: <code>admission_number, MathsName_ca, MathsName_exam, ...</code></p>
            <p className="mt-2">CA score range: 0–40 &nbsp;|&nbsp; Exam score range: 0–60</p>
          </div>
        </div>
      )}

      {/* Step 2 — Review */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{file?.name}</p>
              <p className="text-xs text-muted-foreground">Detected: {detectedFormat}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> New file
            </Button>
          </div>
          <SummaryBar rows={parsedRows} />
          <PreviewTable rows={parsedRows} />
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={validCount === 0 || bulkUpsert.isPending || !termId}
            >
              {bulkUpsert.isPending && <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />}
              Upload {validCount} Valid Scores
            </Button>
            <Button variant="outline" size="sm" onClick={reset}>
              Cancel
            </Button>
          </div>
          {!termId && (
            <p className="text-xs text-destructive">
              Select a session and term above before uploading.
            </p>
          )}
        </div>
      )}

      {/* Step 3 — Success */}
      {step === 3 && (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <CheckCircle2 className="h-12 w-12 text-success" />
          <div>
            <p className="text-lg font-semibold">Upload Complete!</p>
            <p className="text-sm text-muted-foreground mt-1">
              {validCount} scores uploaded and rankings have been recomputed.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={reset}>
            Upload Another File
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function ScoreUploadScreen() {
  const { currentTerm, currentSession } = useSettingsStore();
  const { data: classes = [] } = useClasses();
  const { data: sessions = [] } = useAcademicSessions();

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
    return sessions.find((s) => s.session === currentSession)?.id ?? "";
  });
  const [selectedTerm, setSelectedTerm] = useState<Term>(currentTerm);

  const { data: terms = [] } = useAcademicTerms(selectedSessionId);

  const termId = useMemo(
    () => terms.find((t) => t.term === selectedTerm)?.id,
    [terms, selectedTerm]
  );

  return (
    <div className="space-y-6 p-6">
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Score Upload</h2>
        <p className="text-sm text-muted-foreground">
          Upload or enter student scores for a class and term
        </p>
      </div>

      {/* Context selectors */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Session</label>
              <Select
                value={selectedSessionId}
                onValueChange={(v) => {
                  setSelectedSessionId(v);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.session}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Term</label>
              <TermSelector value={selectedTerm} onChange={setSelectedTerm} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Class</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {termId ? (
              <Badge variant="outline" className="text-success border-success/50 mb-0.5">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Term resolved
              </Badge>
            ) : selectedSessionId ? (
              <Badge variant="outline" className="text-warning border-warning/50 mb-0.5">
                <AlertTriangle className="h-3 w-3 mr-1" /> Term not found in DB
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Upload / Manual entry */}
      <Tabs defaultValue="csv">
        <TabsList>
          <TabsTrigger value="csv">
            <FileText className="h-4 w-4 mr-1.5" /> CSV Upload
          </TabsTrigger>
          <TabsTrigger value="manual">
            <Table2 className="h-4 w-4 mr-1.5" /> Manual Entry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="csv" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Upload Score CSV</CardTitle>
              <CardDescription>
                Supports Format A (long) and Format B (wide). Download a template to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CSVUploadTab classId={selectedClassId} termId={termId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Enter Scores Manually</CardTitle>
              <CardDescription>
                Select a subject, then fill in CA and Exam scores per student.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ManualEntryTab classId={selectedClassId} termId={termId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

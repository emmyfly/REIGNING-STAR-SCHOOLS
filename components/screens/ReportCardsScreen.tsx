"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  FileDown, Eye, RefreshCw, Search, Archive,
  CheckCircle2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GradeChip } from "@/components/shared/GradeChip";
import { TermSelector } from "@/components/shared/TermSelector";
import { useSettingsStore } from "@/stores/settingsStore";
import { useClasses } from "@/hooks/useStudents";
import { useStudentsWithScores } from "@/hooks/useReportCards";
import { useAcademicSessions, useAcademicTerms } from "@/hooks/useAcademicTerms";
import { downloadBlob } from "@/lib/utils/pdf";
import { ReportCardData, Term } from "@/types";
import { cn } from "@/lib/utils";

// ─── Lazy-load PDF renderer (client-side only) ────────────────────────────────
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFViewer),
  { ssr: false, loading: () => <PDFPlaceholder text="Loading preview…" /> }
);

// Lazy-load the document itself so react-pdf does not affect SSR bundle
const ReportCardDocument = dynamic(
  () =>
    import("@/lib/pdf/ReportCardDocument").then((m) => m.ReportCardDocument),
  { ssr: false }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function PDFPlaceholder({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <Eye className="h-8 w-8 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

async function downloadSinglePDF(data: ReportCardData) {
  const { pdf } = await import("@react-pdf/renderer");
  const { ReportCardDocument: Doc } = await import("@/lib/pdf/ReportCardDocument");
  const blob = await pdf(<Doc data={data} />).toBlob();
  const safeName = data.student.full_name.replace(/\s+/g, "_");
  downloadBlob(blob, `${safeName}_report_card.pdf`);
}

async function downloadAllPDFs(
  rows: ReportCardData[],
  className: string,
  term: string,
  onProgress?: (n: number, total: number) => void
) {
  const { pdf } = await import("@react-pdf/renderer");
  const { ReportCardDocument: Doc } = await import("@/lib/pdf/ReportCardDocument");
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const folder = zip.folder("report_cards")!;

  for (let i = 0; i < rows.length; i++) {
    onProgress?.(i + 1, rows.length);
    const data = rows[i];
    const blob = await pdf(<Doc data={data} />).toBlob();
    const safeName = data.student.full_name.replace(/\s+/g, "_");
    folder.file(`${safeName}.pdf`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const safeClass = className.replace(/\s+/g, "_");
  downloadBlob(zipBlob, `${safeClass}_${term}_Term_report_cards.zip`);
}

// ─── Student list row ─────────────────────────────────────────────────────────
function StudentRow({
  data,
  selected,
  onSelect,
  onDownload,
}: {
  data: ReportCardData;
  selected: boolean;
  onSelect: () => void;
  onDownload: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b last:border-b-0 hover:bg-muted/40 transition-colors",
        selected && "bg-primary/5 border-l-2 border-l-primary"
      )}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{data.student.full_name}</p>
        <p className="text-xs text-muted-foreground">{data.student.admission_number}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs tabular-nums text-muted-foreground w-12 text-right">
          {data.average.toFixed(1)}%
        </span>
        <GradeChip grade={data.overall_grade} />
        <span className="text-xs text-muted-foreground w-10 text-right">
          {data.class_position > 0 ? `#${data.class_position}` : "—"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          title="Download PDF"
        >
          <FileDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function ReportCardsScreen() {
  const { currentTerm, currentSession } = useSettingsStore();
  const { data: classes = [] } = useClasses();
  const { data: sessions = [] } = useAcademicSessions();

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
    return sessions.find((s) => s.session === currentSession)?.id ?? "";
  });
  const [selectedTerm, setSelectedTerm] = useState<Term>(currentTerm);
  const [search, setSearch] = useState("");
  const [previewStudent, setPreviewStudent] = useState<ReportCardData | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ n: number; total: number } | null>(null);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  const { data: terms = [] } = useAcademicTerms(selectedSessionId);
  const termId = useMemo(
    () => terms.find((t) => t.term === selectedTerm)?.id,
    [terms, selectedTerm]
  );

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const { data: reportCards = [], isLoading } = useStudentsWithScores(
    selectedClassId,
    termId
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return reportCards;
    const q = search.toLowerCase();
    return reportCards.filter(
      (r) =>
        r.student.full_name.toLowerCase().includes(q) ||
        r.student.admission_number.toLowerCase().includes(q)
    );
  }, [reportCards, search]);

  const handleBulkDownload = async () => {
    if (!reportCards.length || !selectedClass) return;
    setIsBulkDownloading(true);
    setBulkProgress({ n: 0, total: reportCards.length });
    try {
      await downloadAllPDFs(
        reportCards,
        selectedClass.name,
        selectedTerm,
        (n, total) => setBulkProgress({ n, total })
      );
    } finally {
      setIsBulkDownloading(false);
      setBulkProgress(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page heading */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Report Cards</h2>
          <p className="text-sm text-muted-foreground">
            Generate and download student report cards as PDF
          </p>
        </div>
        <Button
          size="sm"
          disabled={!reportCards.length || isBulkDownloading}
          onClick={handleBulkDownload}
        >
          {isBulkDownloading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
              {bulkProgress
                ? `${bulkProgress.n}/${bulkProgress.total}`
                : "Preparing…"}
            </>
          ) : (
            <>
              <Archive className="h-4 w-4 mr-1.5" />
              Download All as ZIP
            </>
          )}
        </Button>
      </div>

      {/* Context selectors */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Session</label>
              <Select
                value={selectedSessionId}
                onValueChange={setSelectedSessionId}
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
              <Select
                value={selectedClassId}
                onValueChange={(v) => {
                  setSelectedClassId(v);
                  setPreviewStudent(null);
                }}
              >
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
            {reportCards.length > 0 && (
              <Badge variant="outline" className="text-success border-success/50 mb-0.5">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {reportCards.length} students loaded
              </Badge>
            )}
            {selectedClassId && !termId && (
              <Badge variant="outline" className="text-warning border-warning/50 mb-0.5">
                <AlertTriangle className="h-3 w-3 mr-1" /> Term not found in DB
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Student list */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Students</CardTitle>
            <CardDescription>
              {selectedClass
                ? `${selectedClass.name} — ${selectedTerm} Term`
                : "Select a class above"}
            </CardDescription>
          </CardHeader>
          {selectedClassId && (
            <div className="px-4 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search student…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
          )}
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading scores…</span>
              </div>
            ) : !selectedClassId || !termId ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                {!selectedClassId
                  ? "Select a class to load students"
                  : "Term not found — check academic_terms table"}
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                {reportCards.length === 0
                  ? "No scores found for this class and term."
                  : "No students match your search."}
              </p>
            ) : (
              <div className="overflow-auto max-h-[520px]">
                {filtered.map((data) => (
                  <StudentRow
                    key={data.student.id}
                    data={data}
                    selected={previewStudent?.student.id === data.student.id}
                    onSelect={() => setPreviewStudent(data)}
                    onDownload={() => downloadSinglePDF(data)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PDF Preview */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Preview</CardTitle>
                <CardDescription>
                  {previewStudent
                    ? previewStudent.student.full_name
                    : "Select a student to preview"}
                </CardDescription>
              </div>
              {previewStudent && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadSinglePDF(previewStudent)}
                >
                  <FileDown className="h-4 w-4 mr-1.5" /> Download PDF
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {previewStudent ? (
              <div className="h-[560px] w-full rounded-b-xl overflow-hidden">
                <PDFViewer width="100%" height="100%" showToolbar={false}>
                  <ReportCardDocument data={previewStudent} />
                </PDFViewer>
              </div>
            ) : (
              <PDFPlaceholder text="Select a student from the list to preview their report card" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

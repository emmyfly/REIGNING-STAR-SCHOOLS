"use client";

import { useState, useMemo } from "react";
import { Download, FileDown, RefreshCw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { GradeChip } from "@/components/shared/GradeChip";
import { TermSelector } from "@/components/shared/TermSelector";
import { useAcademicSessions, useAcademicTerms } from "@/hooks/useAcademicTerms";
import { useSchoolLeaderboard, LeaderboardRow } from "@/hooks/useLeaderboard";
import { downloadBlob } from "@/lib/utils/pdf";
import { useSettingsStore } from "@/stores/settingsStore";
import { downloadCSV } from "@/lib/utils/csvImport";
import { ordinal } from "@/lib/utils/formatting";
import { Term } from "@/types";
import { cn } from "@/lib/utils";
import Papa from "papaparse";

// ─── Rank chip ────────────────────────────────────────────────────────────────
function RankChip({ rank }: { rank: number }) {
  return (
    <span className={cn(
      "font-bold tabular-nums",
      rank === 1 ? "text-yellow-500 text-base" :
      rank === 2 ? "text-slate-400" :
      rank === 3 ? "text-amber-600" :
      "text-muted-foreground"
    )}>
      {rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : ""} {ordinal(rank)}
    </span>
  );
}

// ─── School-wide table ────────────────────────────────────────────────────────
function SchoolWideTable({ rows }: { rows: LeaderboardRow[] }) {
  if (!rows.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Trophy className="h-8 w-8 opacity-30" />
        <p className="text-sm">No score data for this term.</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
          <tr>
            <th className="px-3 py-2 text-left font-medium w-16">Rank</th>
            <th className="px-3 py-2 text-left font-medium">Student</th>
            <th className="px-3 py-2 text-left font-medium">Class</th>
            <th className="px-3 py-2 text-right font-medium">Average</th>
            <th className="px-3 py-2 text-center font-medium">Grade</th>
            <th className="px-3 py-2 text-center font-medium">Class Pos.</th>
            <th className="px-3 py-2 text-center font-medium">Subjects</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.student_id}
              className={cn(
                "border-t hover:bg-muted/30 transition-colors",
                r.rank === 1 && "bg-yellow-50/50",
                r.rank === 2 && "bg-slate-50/50",
                r.rank === 3 && "bg-amber-50/50"
              )}
            >
              <td className="px-3 py-2"><RankChip rank={r.rank} /></td>
              <td className="px-3 py-2 font-medium">{r.student_name}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.class_name}</td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold">{r.average.toFixed(1)}%</td>
              <td className="px-3 py-2 text-center"><GradeChip grade={r.grade} /></td>
              <td className="px-3 py-2 text-center text-muted-foreground">
                {r.class_position ? `#${r.class_position}` : "—"}
              </td>
              <td className="px-3 py-2 text-center text-muted-foreground">{r.subjects_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── By-class accordion ───────────────────────────────────────────────────────
function ByClassView({ rows }: { rows: LeaderboardRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const byClass = useMemo(() => {
    const map = new Map<string, { name: string; rows: LeaderboardRow[] }>();
    for (const r of rows) {
      if (!map.has(r.class_id)) map.set(r.class_id, { name: r.class_name, rows: [] });
      map.get(r.class_id)!.rows.push(r);
    }
    // Sort rows within each class by average
    for (const v of map.values()) {
      v.rows.sort((a, b) => b.average - a.average);
      v.rows.forEach((r, i) => { r.rank = i + 1; });
    }
    return Array.from(map.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [rows]);

  if (!byClass.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Trophy className="h-8 w-8 opacity-30" />
        <p className="text-sm">No score data for this term.</p>
      </div>
    );
  }

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="space-y-3">
      {byClass.map(([classId, { name, rows: classRows }]) => {
        const isOpen = expanded.has(classId);
        const top = classRows[0];
        return (
          <Card key={classId} className="overflow-hidden">
            <button
              className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
              onClick={() => toggle(classId)}
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold">{name}</span>
                <Badge variant="outline" className="text-xs">{classRows.length} students</Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {top && (
                  <span className="hidden sm:block">
                    Top: <strong>{top.student_name}</strong> ({top.average.toFixed(1)}%)
                  </span>
                )}
                <span className="text-xs">{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>
            {isOpen && (
              <div className="border-t overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium w-12">#</th>
                      <th className="px-3 py-1.5 text-left font-medium">Student</th>
                      <th className="px-3 py-1.5 text-right font-medium">Average</th>
                      <th className="px-3 py-1.5 text-center font-medium">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classRows.map((r) => (
                      <tr key={r.student_id} className="border-t hover:bg-muted/20">
                        <td className="px-3 py-1.5"><RankChip rank={r.rank} /></td>
                        <td className="px-3 py-1.5 font-medium">{r.student_name}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{r.average.toFixed(1)}%</td>
                        <td className="px-3 py-1.5 text-center"><GradeChip grade={r.grade} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function LeaderboardScreen() {
  const { currentTerm, currentSession } = useSettingsStore();
  const { data: sessions = [] } = useAcademicSessions();
  const [selectedSessionId, setSelectedSessionId] = useState(() =>
    sessions.find((s) => s.session === currentSession)?.id ?? ""
  );
  const [selectedTerm, setSelectedTerm] = useState<Term>(currentTerm);
  const { data: terms = [] } = useAcademicTerms(selectedSessionId);
  const termId = useMemo(
    () => terms.find((t) => t.term === selectedTerm)?.id,
    [terms, selectedTerm]
  );

  const { data: rows = [], isLoading } = useSchoolLeaderboard(termId);

  const handleExportCSV = () => {
    const csv = Papa.unparse(rows.map((r) => ({
      rank: r.rank,
      student_name: r.student_name,
      class: r.class_name,
      average: r.average.toFixed(1),
      grade: r.grade,
      class_position: r.class_position ?? "",
      subjects: r.subjects_count,
    })));
    downloadCSV(csv, `leaderboard_${selectedTerm}_term.csv`);
  };

  const handleExportPDF = async () => {
    const { pdf } = await import("@react-pdf/renderer");
    const { LeaderboardDocument } = await import("@/lib/pdf/LeaderboardDocument");
    const sessionLabel = sessions.find((s) => s.id === selectedSessionId)?.session ?? "";
    const blob = await pdf(
      <LeaderboardDocument rows={rows} term={selectedTerm} session={sessionLabel} />
    ).toBlob();
    downloadBlob(blob, `leaderboard_${selectedTerm}_term.pdf`);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Leaderboard</h2>
          <p className="text-sm text-muted-foreground">School-wide rankings for {selectedTerm} Term</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!rows.length}>
          <Download className="h-4 w-4 mr-1.5" /> Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!rows.length}>
          <FileDown className="h-4 w-4 mr-1.5" /> Export PDF
        </Button>
      </div>

      {/* Context selectors */}
      <div className="flex flex-wrap gap-3">
        <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Session" />
          </SelectTrigger>
          <SelectContent>
            {sessions.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.session}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <TermSelector value={selectedTerm} onChange={setSelectedTerm} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading rankings…</span>
        </div>
      ) : (
        <Tabs defaultValue="school">
          <TabsList>
            <TabsTrigger value="school">School-Wide</TabsTrigger>
            <TabsTrigger value="class">By Class</TabsTrigger>
          </TabsList>
          <TabsContent value="school" className="mt-4">
            <SchoolWideTable rows={rows} />
          </TabsContent>
          <TabsContent value="class" className="mt-4">
            <ByClassView rows={rows} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

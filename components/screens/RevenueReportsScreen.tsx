"use client";

import { useState, useMemo } from "react";
import { Download, RefreshCw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TermSelector } from "@/components/shared/TermSelector";
import { useAcademicSessions, useAcademicTerms } from "@/hooks/useAcademicTerms";
import { useRevenueStats } from "@/hooks/usePayments";
import { useSettingsStore } from "@/stores/settingsStore";
import { formatCurrency } from "@/lib/utils/formatting";
import { downloadCSV } from "@/lib/utils/csvImport";
import { Term } from "@/types";
import { cn } from "@/lib/utils";
import Papa from "papaparse";

// ─── SVG Bar chart ────────────────────────────────────────────────────────────
function BarChart({
  data,
}: {
  data: { label: string; value: number; max: number }[];
}) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d) => d.max), 1);
  const W = 600;
  const H = 200;
  const PAD = { top: 10, right: 10, bottom: 40, left: 60 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const barWidth = Math.min(40, chartW / data.length - 4);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {/* Y axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = PAD.top + chartH * (1 - t);
        return (
          <g key={t}>
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#888">
              {formatCurrency(maxVal * t)}
            </text>
            <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y} stroke="#e5e7eb" strokeWidth={1} />
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const x = PAD.left + (i * chartW) / data.length + (chartW / data.length - barWidth) / 2;
        const expectedH = (d.max / maxVal) * chartH;
        const collectedH = (d.value / maxVal) * chartH;
        return (
          <g key={i}>
            {/* Expected (background) */}
            <rect
              x={x}
              y={PAD.top + chartH - expectedH}
              width={barWidth}
              height={expectedH}
              fill="#e2e8f0"
              rx={3}
            />
            {/* Collected (foreground) */}
            <rect
              x={x}
              y={PAD.top + chartH - collectedH}
              width={barWidth}
              height={collectedH}
              fill="#1B2B5E"
              rx={3}
            />
            {/* Label */}
            <text
              x={x + barWidth / 2}
              y={H - PAD.bottom + 14}
              textAnchor="middle"
              fontSize={9}
              fill="#555"
            >
              {d.label.length > 6 ? d.label.slice(0, 6) + "…" : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── SVG Pie chart ────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  paid:    "#16A34A",
  pending: "#F5A623",
  partial: "#3B82F6",
  overdue: "#DC2626",
};

function PieChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (!total) return null;

  const R = 70;
  const CX = 90;
  const CY = 90;
  let angle = -Math.PI / 2;

  const paths = slices.map((s) => {
    const portion = s.value / total;
    const startAngle = angle;
    angle += portion * 2 * Math.PI;
    const x1 = CX + R * Math.cos(startAngle);
    const y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(angle);
    const y2 = CY + R * Math.sin(angle);
    const large = portion > 0.5 ? 1 : 0;
    return { path: `M${CX},${CY} L${x1},${y1} A${R},${R},0,${large},1,${x2},${y2} Z`, ...s };
  });

  return (
    <svg viewBox="0 0 220 180" className="w-full h-auto">
      {paths.map((p, i) => (
        <path key={i} d={p.path} fill={p.color} stroke="white" strokeWidth={2} />
      ))}
      {/* Legend */}
      {slices.map((s, i) => (
        <g key={i} transform={`translate(175, ${20 + i * 22})`}>
          <rect width={12} height={12} rx={2} fill={s.color} />
          <text x={16} y={10} fontSize={10} fill="#333">
            {s.label} ({((s.value / total) * 100).toFixed(0)}%)
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function RevenueReportsScreen() {
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

  const { data: stats, isLoading } = useRevenueStats(selectedSessionId || undefined, termId);

  const totalCollected = stats?.byClass.reduce((s, c) => s + c.collected, 0) ?? 0;
  const totalExpected  = stats?.byClass.reduce((s, c) => s + c.total_fees, 0) ?? 0;
  const overallRate    = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

  const handleExportCSV = () => {
    if (!stats?.byClass.length) return;
    const csv = Papa.unparse(
      stats.byClass.map((c) => ({
        class:           c.class_name,
        students:        c.total_students,
        expected_fees:   c.total_fees,
        collected:       c.collected,
        collection_rate: c.rate.toFixed(1) + "%",
      }))
    );
    downloadCSV(csv, "revenue_report.csv");
  };

  const pieSlices = (stats?.statusSplit ?? []).map((s) => ({
    label: s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] ?? "#9ca3af",
  }));

  const barData = (stats?.byClass ?? []).map((c) => ({
    label: c.class_name,
    value: c.collected,
    max: c.total_fees,
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Revenue Reports</h2>
          <p className="text-sm text-muted-foreground">Fee collection analysis by class</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!stats?.byClass.length}>
          <Download className="h-4 w-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
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

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Expected",   value: formatCurrency(totalExpected),   color: "" },
          { label: "Total Collected",  value: formatCurrency(totalCollected),  color: "text-success" },
          { label: "Collection Rate",  value: `${overallRate.toFixed(1)}%`,    color: overallRate >= 80 ? "text-success" : "text-warning" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className={cn("text-xl font-bold tabular-nums", s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : (
        <>
          {/* Charts row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Revenue by Class</CardTitle>
                <CardDescription>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded bg-slate-200" /> Expected
                    &nbsp;
                    <span className="inline-block w-3 h-3 rounded bg-[#1B2B5E]" /> Collected
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {barData.length > 0
                  ? <BarChart data={barData} />
                  : <p className="text-sm text-muted-foreground text-center py-8">No data yet.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Payment Status Split</CardTitle>
                <CardDescription>By number of transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {pieSlices.length > 0
                  ? <PieChart slices={pieSlices} />
                  : <p className="text-sm text-muted-foreground text-center py-8">No data yet.</p>}
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">By Class Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(stats?.byClass ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No data. Select a session above.</p>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/80">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Class</th>
                        <th className="px-4 py-2 text-right font-medium">Students</th>
                        <th className="px-4 py-2 text-right font-medium">Expected (₦)</th>
                        <th className="px-4 py-2 text-right font-medium">Collected (₦)</th>
                        <th className="px-4 py-2 text-right font-medium">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats!.byClass.map((c) => (
                        <tr key={c.class_id} className="border-t hover:bg-muted/30">
                          <td className="px-4 py-2 font-medium">{c.class_name}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{c.total_students}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(c.total_fees)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-success font-medium">
                            {formatCurrency(c.collected)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className={cn(
                              "font-semibold",
                              c.rate >= 80 ? "text-success" :
                              c.rate >= 50 ? "text-warning" :
                              "text-destructive"
                            )}>
                              {c.rate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

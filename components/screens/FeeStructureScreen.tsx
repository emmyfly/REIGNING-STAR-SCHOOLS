"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useClasses } from "@/hooks/useStudents";
import { useAcademicSessions } from "@/hooks/useAcademicTerms";
import { useFeeStructure, useSaveFeeStructure } from "@/hooks/useFeeStructure";
import { formatCurrency } from "@/lib/utils/formatting";
import { FeeCategory, FeeStructure } from "@/types";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES: { value: FeeCategory; label: string }[] = [
  { value: "tuition",   label: "Tuition" },
  { value: "uniform",   label: "Uniform" },
  { value: "textbook",  label: "Textbooks" },
  { value: "transport", label: "Transport" },
  { value: "exam",      label: "Exam" },
  { value: "other",     label: "Other" },
];

// ─── Editable row ─────────────────────────────────────────────────────────────
interface EditableRow {
  id?: string;
  category: FeeCategory;
  description: string;
  amount: string;
  due_date: string;
  _isNew?: boolean;
}

function newRow(): EditableRow {
  return {
    category: "tuition",
    description: "",
    amount: "",
    due_date: "",
    _isNew: true,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function FeeStructureScreen() {
  const { data: classes = [] } = useClasses();
  const { data: sessions = [] } = useAcademicSessions();

  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  const { data: feeStructure = [], isLoading } = useFeeStructure(
    selectedSessionId || undefined,
    selectedClassId || undefined
  );
  const saveMutation = useSaveFeeStructure();

  // Sync fetched data into local rows
  useEffect(() => {
    setRows(
      feeStructure.map((f) => ({
        id: f.id,
        category: f.category,
        description: f.description,
        amount: f.amount.toString(),
        due_date: f.due_date ?? "",
      }))
    );
    setDeletedIds([]);
    setDirty(false);
  }, [feeStructure]);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  const updateRow = (i: number, field: keyof EditableRow, value: string) => {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [field]: value } : r)));
    setDirty(true);
  };

  const addRow = () => {
    setRows((prev) => [...prev, newRow()]);
    setDirty(true);
  };

  const removeRow = (i: number) => {
    const row = rows[i];
    if (row.id) setDeletedIds((prev) => [...prev, row.id!]);
    setRows((prev) => prev.filter((_, j) => j !== i));
    setDirty(true);
  };

  const total = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

  const handleSave = async () => {
    if (!selectedSessionId) return;
    const upsertRows = rows
      .filter((r) => r.description && r.amount)
      .map((r) => ({
        ...(r.id ? { id: r.id } : {}),
        session_id: selectedSessionId,
        class_id: selectedClassId || null,
        category: r.category,
        description: r.description,
        amount: parseFloat(r.amount),
        due_date: r.due_date || null,
      }));
    await saveMutation.mutateAsync({ rows: upsertRows, deletedIds });
    setDirty(false);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fee Structure</h2>
          <p className="text-sm text-muted-foreground">Define fees per session and class</p>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!dirty || !selectedSessionId || saveMutation.isPending}
        >
          {saveMutation.isPending
            ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
            : <Save className="h-4 w-4 mr-1.5" />}
          Save All
        </Button>
      </div>

      {/* Context selectors */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Session *</label>
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
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Class (optional)</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fee items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Fee Items — {selectedSession?.session ?? "Select a session"}
            {selectedClassId && ` — ${classes.find((c) => c.id === selectedClassId)?.name}`}
          </CardTitle>
          <CardDescription>
            {!selectedSessionId && "Select a session above to load or create fee items."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : (
            <>
              {/* Header row */}
              {rows.length > 0 && (
                <div className="grid grid-cols-[1fr_1.5fr_0.8fr_0.8fr_auto] gap-2 px-1">
                  <p className="text-xs font-medium text-muted-foreground">Category</p>
                  <p className="text-xs font-medium text-muted-foreground">Description</p>
                  <p className="text-xs font-medium text-muted-foreground">Amount (₦)</p>
                  <p className="text-xs font-medium text-muted-foreground">Due Date</p>
                  <span />
                </div>
              )}

              {/* Rows */}
              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_1.5fr_0.8fr_0.8fr_auto] gap-2 items-center">
                  <Select
                    value={row.category}
                    onValueChange={(v) => updateRow(i, "category", v)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={row.description}
                    onChange={(e) => updateRow(i, "description", e.target.value)}
                    placeholder="Description"
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    value={row.amount}
                    onChange={(e) => updateRow(i, "amount", e.target.value)}
                    placeholder="0"
                    className="h-8 text-sm"
                  />
                  <Input
                    type="date"
                    value={row.due_date}
                    onChange={(e) => updateRow(i, "due_date", e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeRow(i)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Empty state */}
              {rows.length === 0 && selectedSessionId && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No fee items yet. Click "+ Add Item" to create one.
                </p>
              )}

              {/* Add row */}
              {selectedSessionId && (
                <Button variant="outline" size="sm" onClick={addRow} className="mt-1">
                  <Plus className="h-4 w-4 mr-1.5" /> Add Item
                </Button>
              )}

              {/* Running total */}
              {rows.length > 0 && (
                <div className="flex justify-end pt-3 border-t mt-3">
                  <p className="text-sm font-semibold">
                    Total: <span className="text-base text-primary">{formatCurrency(total)}</span>
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Search, Download, Plus, Upload, Mail, Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EnhancedDataTable, EnhancedColumn } from "@/components/shared/EnhancedDataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FileUploadZone } from "@/components/shared/FileUploadZone";
import {
  useStudents, useClasses, useCreateStudent, useUpdateStudent,
  useDeleteStudent, useBulkImportStudents, useActivateEmailAccounts,
} from "@/hooks/useStudents";
import { Student, SchoolClass } from "@/types";
import { formatDate } from "@/lib/utils/formatting";
import { BADGE_CONFIG } from "@/lib/utils/badges";
import {
  parseStudentCSV, generateStudentCSVTemplate,
  downloadCSV, readFileAsText, ParsedStudentRow,
} from "@/lib/utils/csvImport";
import { toast } from "sonner";

// ─── Student form ─────────────────────────────────────────────────────────────
interface StudentFormProps {
  initial?: Partial<Student>;
  classes: SchoolClass[];
  onSubmit: (values: Partial<Student>) => void;
  isLoading: boolean;
  onCancel: () => void;
}

function StudentForm({ initial, classes, onSubmit, isLoading, onCancel }: StudentFormProps) {
  const [form, setForm] = useState<Partial<Student>>({
    full_name: "", admission_number: "", gender: "Male",
    date_of_birth: "", class_id: "", guardian_name: "",
    guardian_phone: "", guardian_email: "", address: "",
    status: "active", admission_date: new Date().toISOString().slice(0, 10),
    has_email_account: false,
    ...initial,
  });

  function set(key: keyof Student, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium">Full Name *</label>
          <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Admission No. *</label>
          <Input value={form.admission_number} onChange={(e) => set("admission_number", e.target.value)} required />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Date of Birth *</label>
          <Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} required />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Gender *</label>
          <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Class *</label>
          <Select value={form.class_id} onValueChange={(v) => set("class_id", v)}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Admission Date *</label>
          <Input type="date" value={form.admission_date} onChange={(e) => set("admission_date", e.target.value)} required />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Status</label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["active", "inactive", "graduated", "transferred"] as const).map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium">Guardian Name *</label>
          <Input value={form.guardian_name} onChange={(e) => set("guardian_name", e.target.value)} required />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Guardian Phone *</label>
          <Input value={form.guardian_phone} onChange={(e) => set("guardian_phone", e.target.value)} required />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Guardian Email</label>
          <Input type="email" value={form.guardian_email ?? ""} onChange={(e) => set("guardian_email", e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium">Address</label>
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving…" : "Save Student"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── CSV import wizard ────────────────────────────────────────────────────────
function CSVImportDialog({
  open, onOpenChange, classes,
}: { open: boolean; onOpenChange: (v: boolean) => void; classes: SchoolClass[] }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [parsed, setParsed] = useState<ParsedStudentRow[]>([]);
  const bulkImport = useBulkImportStudents();
  const classMap = new Map(classes.map((c) => [c.name.trim().toLowerCase(), c.id]));

  async function handleFile(file: File) {
    const text = await readFileAsText(file);
    setParsed(parseStudentCSV(text));
    setStep(2);
  }

  async function handleConfirm() {
    const validRows = parsed.filter((r) => r.status === "valid");
    const rows = validRows.map((r) => ({
      admission_number: r.admission_number,
      full_name: r.full_name,
      gender: r.gender as "Male" | "Female",
      date_of_birth: r.date_of_birth,
      class_id: classMap.get(r.class_name.toLowerCase()) ?? "",
      guardian_name: r.guardian_name,
      guardian_phone: r.guardian_phone,
      guardian_email: r.guardian_email || undefined,
      address: r.address,
      status: "active" as const,
      admission_date: new Date().toISOString().slice(0, 10),
      has_email_account: false,
    }));

    const missing = rows.filter((r) => !r.class_id);
    if (missing.length) {
      toast.error(`${missing.length} rows have unrecognised class names`);
      return;
    }

    await bulkImport.mutateAsync(rows);
    setStep(1);
    setParsed([]);
    onOpenChange(false);
  }

  const valid = parsed.filter((r) => r.status === "valid").length;
  const errors = parsed.filter((r) => r.status === "error").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Students</DialogTitle>
          <DialogDescription>
            Step {step} of 3 —{" "}
            {step === 1 ? "Upload CSV" : step === 2 ? "Preview" : "Confirm"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <FileUploadZone accept=".csv" onFileSelected={handleFile}
              label="Drop student CSV here" description="or click to browse" />
            <Button variant="outline" size="sm"
              onClick={() => downloadCSV(generateStudentCSVTemplate(), "students-template.csv")}>
              <Download className="h-4 w-4 mr-2" /> Download Template
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="flex gap-3 text-sm">
              <span className="text-success">✅ {valid} valid</span>
              <span className="text-error">❌ {errors} errors</span>
            </div>
            <div className="max-h-72 overflow-auto rounded border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {["Adm No", "Full Name", "Gender", "Class", "Guardian", "Status"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((r, i) => (
                    <tr key={i} className={r.status === "error" ? "bg-error-bg" : ""}>
                      <td className="px-3 py-1.5">{r.admission_number}</td>
                      <td className="px-3 py-1.5">{r.full_name}</td>
                      <td className="px-3 py-1.5">{r.gender}</td>
                      <td className="px-3 py-1.5">{r.class_name}</td>
                      <td className="px-3 py-1.5">{r.guardian_name}</td>
                      <td className="px-3 py-1.5">
                        {r.status === "error"
                          ? <span className="text-error">{r.error}</span>
                          : <span className="text-success">✓</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} disabled={valid === 0}>
                Next — Import {valid} students
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm">
              You are about to import <strong>{valid} students</strong>. Existing records with
              matching admission numbers will be updated.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleConfirm} disabled={bulkImport.isPending}>
                {bulkImport.isPending ? "Importing…" : `Confirm Import — ${valid} students`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export function StudentsScreen() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortColumn, setSortColumn] = useState("full_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);

  const { data: classesData } = useClasses();
  const classes = classesData ?? [];

  const { data, isLoading } = useStudents({
    page, pageSize, search: search || undefined,
    classId: classFilter || undefined,
    gender: genderFilter || undefined,
    hasEmailAccount: emailFilter === "" ? undefined : emailFilter === "yes",
    sortColumn, sortDirection,
  });

  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const activateEmails = useActivateEmailAccounts();

  function handleSort(col: string, dir: "asc" | "desc") {
    setSortColumn(col); setSortDirection(dir); setPage(1);
  }
  function handleFilter() { setPage(1); }

  const columns: EnhancedColumn<Student>[] = [
    {
      key: "full_name", header: "Name", sortable: true,
      render: (s) => <span className="font-medium">{s.full_name}</span>,
    },
    {
      key: "class_id", header: "Class", sortable: false,
      render: (s) => s.class?.name ?? "—",
    },
    { key: "admission_number", header: "Admission No.", sortable: true },
    {
      key: "has_email_account", header: "Email Account",
      render: (s) => <StatusBadge status={s.has_email_account ? "active" : "inactive"} />,
    },
    {
      key: "badges", header: "Badges",
      render: (s) =>
        s.badges?.length ? (
          <div className="flex flex-wrap gap-1">
            {s.badges.map((b) => {
              const cfg = BADGE_CONFIG[b.type];
              return (
                <span key={b.type} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                  {cfg.emoji} {b.label}
                </span>
              );
            })}
          </div>
        ) : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: "actions", header: "",
      className: "w-24 text-right",
      render: (s) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setEditTarget(s)} title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
            onClick={() => setDeleteTarget(s)} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Students</h2>
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} student{data?.total !== 1 ? "s" : ""}
            {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm"
            onClick={() => downloadCSV(generateStudentCSVTemplate(), "students-template.csv")}>
            <Download className="h-4 w-4 mr-1.5" /> Template
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" /> Bulk Import
          </Button>
          <Button variant="outline" size="sm"
            disabled={selectedIds.size === 0}
            onClick={() => setActivateOpen(true)}>
            <Mail className="h-4 w-4 mr-1.5" /> Activate Emails
            {selectedIds.size > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                {selectedIds.size}
              </Badge>
            )}
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Student
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or admission no…"
            className="pl-8 w-64"
            value={search}
            onChange={(e) => { setSearch(e.target.value); handleFilter(); }}
          />
        </div>
        <Select value={classFilter} onValueChange={(v) => { setClassFilter(v === "all" ? "" : v); handleFilter(); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={genderFilter} onValueChange={(v) => { setGenderFilter(v === "all" ? "" : v); handleFilter(); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="All genders" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All genders</SelectItem>
            <SelectItem value="Male">Male</SelectItem>
            <SelectItem value="Female">Female</SelectItem>
          </SelectContent>
        </Select>
        <Select value={emailFilter} onValueChange={(v) => { setEmailFilter(v === "all" ? "" : v); handleFilter(); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Email status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Has email account</SelectItem>
            <SelectItem value="no">No email account</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <EnhancedDataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        emptyMessage="No students found."
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSortChange={handleSort}
        page={page}
        pageSize={pageSize}
        totalRows={data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
      />

      {/* Add Student Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
          </DialogHeader>
          <StudentForm
            classes={classes}
            onSubmit={(values) => createStudent.mutate(values, { onSuccess: () => setAddOpen(false) })}
            isLoading={createStudent.isPending}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <StudentForm
              initial={editTarget}
              classes={classes}
              onSubmit={(values) =>
                updateStudent.mutate(
                  { id: editTarget.id, values },
                  { onSuccess: () => setEditTarget(null) }
                )
              }
              isLoading={updateStudent.isPending}
              onCancel={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete Student"
        description={`Remove ${deleteTarget?.full_name} permanently? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteStudent.isPending}
        onConfirm={() =>
          deleteStudent.mutate(deleteTarget!.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />

      {/* Bulk Import */}
      <CSVImportDialog open={importOpen} onOpenChange={setImportOpen} classes={classes} />

      {/* Activate Emails Confirm */}
      <ConfirmDialog
        open={activateOpen}
        onOpenChange={setActivateOpen}
        title="Activate Email Accounts"
        description={`Create Supabase Auth accounts for ${selectedIds.size} selected student(s)?
Email: {admission_number}@reigningstar.edu.ng · Password: SURNAME (uppercased).`}
        confirmLabel={`Activate ${selectedIds.size} Account(s)`}
        variant="default"
        isLoading={activateEmails.isPending}
        onConfirm={() =>
          activateEmails.mutate([...selectedIds], {
            onSuccess: () => { setActivateOpen(false); setSelectedIds(new Set()); },
          })
        }
      />
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  Save, Plus, Trash2, RefreshCw, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/hooks/useSettings";
import { useClasses } from "@/hooks/useStudents";
import { useSubjectsByClass } from "@/hooks/useScores";
import { useAcademicSessions } from "@/hooks/useAcademicTerms";
import { useAuthStore } from "@/stores/authStore";
import {
  useAllSubjects, useCreateSubject, useDeleteSubject,
  useCreateClass, useDeleteClass,
  useSaveGradingScale,
  useCreateAcademicSession, useSetCurrentSession,
  useUpdateAdminProfile, useChangePassword,
  useUpdateSchoolSettings,
} from "@/hooks/useSettingsAdmin";
import { GradeScale } from "@/types";

// ─── School info tab ──────────────────────────────────────────────────────────
function SchoolInfoTab() {
  const { settings } = useSettings();
  const updateMutation = useUpdateSchoolSettings();

  const [form, setForm] = useState({
    school_name: "",
    school_address: "",
    school_phone: "",
    school_email: "",
    result_footer: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        school_name:    settings.school_name ?? "",
        school_address: settings.school_address ?? "",
        school_phone:   settings.school_phone ?? "",
        school_email:   settings.school_email ?? "",
        result_footer:  settings.result_footer ?? "",
      });
    }
  }, [settings]);

  const set = (field: keyof typeof form, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  return (
    <div className="space-y-4 max-w-xl">
      {[
        { field: "school_name" as const,    label: "School Name" },
        { field: "school_address" as const, label: "School Address" },
        { field: "school_phone" as const,   label: "Phone" },
        { field: "school_email" as const,   label: "Email" },
        { field: "result_footer" as const,  label: "Result Card Footer" },
      ].map(({ field, label }) => (
        <div key={field} className="space-y-1">
          <label className="text-xs font-medium">{label}</label>
          <Input value={form[field]} onChange={(e) => set(field, e.target.value)} />
        </div>
      ))}
      <Button
        size="sm"
        onClick={() => updateMutation.mutate(form)}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending
          ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
          : <Save className="h-4 w-4 mr-1.5" />}
        Save
      </Button>
    </div>
  );
}

// ─── Subjects tab ─────────────────────────────────────────────────────────────
function SubjectsTab() {
  const { data: classes = [] } = useClasses();
  const [selectedClassId, setSelectedClassId] = useState("");
  const { data: subjects = [] } = useSubjectsByClass(selectedClassId || undefined);
  const createMutation = useCreateSubject();
  const deleteMutation = useDeleteSubject();

  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");

  const handleAdd = async () => {
    if (!newName.trim() || !selectedClassId) return;
    await createMutation.mutateAsync({
      name: newName.trim(),
      code: newCode.trim(),
      class_id: selectedClassId,
    });
    setNewName("");
    setNewCode("");
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div className="space-y-1">
        <label className="text-xs font-medium">Class</label>
        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selectedClassId && (
        <>
          {/* Subject list */}
          <div className="space-y-1.5">
            {subjects.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <span className="flex-1 text-sm font-medium">{s.name}</span>
                {s.code && <Badge variant="outline" className="text-xs">{s.code}</Badge>}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(s.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {subjects.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No subjects for this class yet.
              </p>
            )}
          </div>

          {/* Add new */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium">Subject Name *</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Mathematics"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div className="w-24 space-y-1">
              <label className="text-xs font-medium">Code</label>
              <Input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="MTH"
              />
            </div>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newName.trim() || createMutation.isPending}
              className="mb-0.5"
            >
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Classes tab ──────────────────────────────────────────────────────────────
function ClassesTab() {
  const { data: classes = [] } = useClasses();
  const createMutation = useCreateClass();
  const deleteMutation = useDeleteClass();

  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState("");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await createMutation.mutateAsync({ name: newName.trim(), level: newLevel.trim() });
    setNewName("");
    setNewLevel("");
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div className="space-y-1.5">
        {classes.map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <span className="flex-1 text-sm font-medium">{c.name}</span>
            {c.level && <Badge variant="outline" className="text-xs">{c.level}</Badge>}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => deleteMutation.mutate(c.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium">Class Name *</label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. JSS 1A"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        <div className="w-28 space-y-1">
          <label className="text-xs font-medium">Level</label>
          <Input
            value={newLevel}
            onChange={(e) => setNewLevel(e.target.value)}
            placeholder="JSS 1"
          />
        </div>
        <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || createMutation.isPending} className="mb-0.5">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
}

// ─── Grading scale tab ────────────────────────────────────────────────────────
function GradingScaleTab() {
  const { settings } = useSettings();
  const saveMutation = useSaveGradingScale();

  const [scale, setScale] = useState<GradeScale[]>(() => settings?.grading_system ?? []);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings?.grading_system?.length && !dirty) {
      setScale(settings.grading_system);
    }
  }, [settings, dirty]);

  const updateRow = (i: number, field: keyof GradeScale, value: string | number) => {
    setScale((prev) => prev.map((r, j) => (j === i ? { ...r, [field]: value } : r)));
    setDirty(true);
  };

  const addRow = () => {
    setScale((prev) => [...prev, { min: 0, max: 0, grade: "", remark: "" }]);
    setDirty(true);
  };

  const removeRow = (i: number) => {
    setScale((prev) => prev.filter((_, j) => j !== i));
    setDirty(true);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="grid grid-cols-[0.5fr_0.5fr_0.4fr_1fr_auto] gap-2 px-1">
        {["Min", "Max", "Grade", "Remark", ""].map((h) => (
          <p key={h} className="text-xs font-medium text-muted-foreground">{h}</p>
        ))}
      </div>

      {scale.map((row, i) => (
        <div key={i} className="grid grid-cols-[0.5fr_0.5fr_0.4fr_1fr_auto] gap-2 items-center">
          <Input
            type="number" min={0} max={100}
            value={row.min}
            onChange={(e) => updateRow(i, "min", Number(e.target.value))}
            className="h-8 text-sm"
          />
          <Input
            type="number" min={0} max={100}
            value={row.max}
            onChange={(e) => updateRow(i, "max", Number(e.target.value))}
            className="h-8 text-sm"
          />
          <Input
            value={row.grade}
            onChange={(e) => updateRow(i, "grade", e.target.value)}
            placeholder="A"
            className="h-8 text-sm"
          />
          <Input
            value={row.remark}
            onChange={(e) => updateRow(i, "remark", e.target.value)}
            placeholder="Excellent"
            className="h-8 text-sm"
          />
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => removeRow(i)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-1" /> Add Row
        </Button>
        <Button
          size="sm"
          onClick={() => { saveMutation.mutate(scale); setDirty(false); }}
          disabled={!dirty || saveMutation.isPending}
        >
          {saveMutation.isPending
            ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
            : <Save className="h-4 w-4 mr-1.5" />}
          Save Scale
        </Button>
      </div>
    </div>
  );
}

// ─── Academic sessions tab ────────────────────────────────────────────────────
function AcademicSessionsTab() {
  const { data: sessions = [] } = useAcademicSessions();
  const createMutation = useCreateAcademicSession();
  const setCurrentMutation = useSetCurrentSession();

  const [sessionName, setSessionName] = useState("");
  const [terms, setTerms] = useState([
    { term: "First",  start_date: "", end_date: "" },
    { term: "Second", start_date: "", end_date: "" },
    { term: "Third",  start_date: "", end_date: "" },
  ]);

  const updateTerm = (i: number, field: "start_date" | "end_date", value: string) =>
    setTerms((prev) => prev.map((t, j) => (j === i ? { ...t, [field]: value } : t)));

  const handleCreate = async () => {
    if (!sessionName.trim()) return;
    await createMutation.mutateAsync({ session: sessionName.trim(), terms });
    setSessionName("");
  };

  return (
    <div className="space-y-6 max-w-xl">
      {/* Existing sessions */}
      <div className="space-y-2">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <span className="flex-1 text-sm font-medium">{s.session}</span>
            {s.is_current && <Badge className="bg-success text-white text-xs">Current</Badge>}
            {!s.is_current && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setCurrentMutation.mutate(s.id)}
                disabled={setCurrentMutation.isPending}
              >
                Set Current
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Create new session */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Create New Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">Session Name *</label>
            <Input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g. 2025/2026"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium">Term Dates</p>
            {terms.map((t, i) => (
              <div key={i} className="grid grid-cols-[80px_1fr_1fr] gap-2 items-center">
                <span className="text-sm">{t.term}</span>
                <Input type="date" value={t.start_date} onChange={(e) => updateTerm(i, "start_date", e.target.value)} className="h-8 text-sm" />
                <Input type="date" value={t.end_date}   onChange={(e) => updateTerm(i, "end_date",   e.target.value)} className="h-8 text-sm" />
              </div>
            ))}
          </div>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={!sessionName.trim() || createMutation.isPending}
          >
            {createMutation.isPending
              ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
              : <Plus className="h-4 w-4 mr-1.5" />}
            Create Session
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Admin profile tab ────────────────────────────────────────────────────────
function AdminProfileTab() {
  const { user } = useAuthStore();
  const updateMutation = useUpdateAdminProfile();
  const passwordMutation = useChangePassword();

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6 max-w-md">
      {/* Profile */}
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium">Full Name</label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button
          size="sm"
          onClick={() => updateMutation.mutate({ fullName, email })}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending
            ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
            : <Save className="h-4 w-4 mr-1.5" />}
          Update Profile
        </Button>
      </div>

      <div className="border-t pt-4 space-y-4">
        <p className="text-sm font-medium">Change Password</p>
        <div className="space-y-1">
          <label className="text-xs font-medium">New Password</label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => { passwordMutation.mutate(newPassword); setNewPassword(""); }}
          disabled={newPassword.length < 8 || passwordMutation.isPending}
        >
          {passwordMutation.isPending && <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />}
          Update Password
        </Button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function SettingsScreen() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage school configuration, subjects, classes, and grading
        </p>
      </div>

      <Tabs defaultValue="school">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="school">School Info</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="grading">Grading Scale</TabsTrigger>
          <TabsTrigger value="sessions">Academic Sessions</TabsTrigger>
          <TabsTrigger value="profile">My Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="school"   className="mt-6"><SchoolInfoTab /></TabsContent>
        <TabsContent value="subjects" className="mt-6"><SubjectsTab /></TabsContent>
        <TabsContent value="classes"  className="mt-6"><ClassesTab /></TabsContent>
        <TabsContent value="grading"  className="mt-6"><GradingScaleTab /></TabsContent>
        <TabsContent value="sessions" className="mt-6"><AcademicSessionsTab /></TabsContent>
        <TabsContent value="profile"  className="mt-6"><AdminProfileTab /></TabsContent>
      </Tabs>
    </div>
  );
}

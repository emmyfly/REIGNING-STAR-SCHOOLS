import Papa from "papaparse";
import { Subject, Student, ParsedScoreRow, CSVFormat } from "@/types";
import { computeTotal, getGrade, DEFAULT_GRADE_SCALE } from "./grading";

// ─── Generic helpers ────────────────────────────────────────────────────────

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

// ─── CSV format detection ───────────────────────────────────────────────────

export function detectCSVFormat(headers: string[]): CSVFormat {
  const lower = headers.map((h) => h.toLowerCase().trim());
  if (lower.includes("subject") || lower.includes("subject_name")) return "A";
  if (lower.some((h) => h.endsWith("_ca") || h.endsWith("_exam"))) return "B";
  return "unknown";
}

// ─── Format A — long (one row per student × subject) ───────────────────────
// Headers: admission_number, subject, ca_score, exam_score

export function parseFormatA(
  text: string,
  students: Student[],
  subjects: Subject[]
): ParsedScoreRow[] {
  const { data, errors } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (errors.length) {
    console.warn("CSV parse errors:", errors);
  }

  const studentMap = new Map(students.map((s) => [s.admission_number.trim(), s]));
  const subjectMap = new Map(subjects.map((s) => [s.name.trim().toLowerCase(), s]));

  return data.map((row): ParsedScoreRow => {
    const adm = (row["admission_number"] ?? row["adm_no"] ?? "").trim();
    const subjectName = (row["subject"] ?? row["subject_name"] ?? "").trim();
    const caRaw = parseFloat(row["ca_score"] ?? row["ca"] ?? "");
    const examRaw = parseFloat(row["exam_score"] ?? row["exam"] ?? "");

    const student = studentMap.get(adm);
    const subject = subjectMap.get(subjectName.toLowerCase());

    if (!adm) return errorRow(adm, subjectName, "Missing admission number");
    if (!student) return errorRow(adm, subjectName, `Student "${adm}" not found`);
    if (!subjectName) return errorRow(adm, subjectName, "Missing subject name");
    if (!subject) return warnRow(adm, subjectName, student, `Subject "${subjectName}" not found in class`);
    if (isNaN(caRaw) || caRaw < 0 || caRaw > 40)
      return errorRow(adm, subjectName, `CA score must be 0–40, got "${row["ca_score"]}"`);
    if (isNaN(examRaw) || examRaw < 0 || examRaw > 60)
      return errorRow(adm, subjectName, `Exam score must be 0–60, got "${row["exam_score"]}"`);

    const total = computeTotal(caRaw, examRaw);
    const { grade, remark } = getGrade(total, DEFAULT_GRADE_SCALE);

    return {
      student_id: student.id,
      subject_id: subject.id,
      admission_number: adm,
      subject_name: subjectName,
      student_name: student.full_name,
      ca_score: caRaw,
      exam: examRaw,
      total,
      grade,
      remark,
      status: "valid",
    };
  });
}

// ─── Format B — wide (one row per student, columns per subject) ─────────────
// Headers: admission_number, Mathematics_ca, Mathematics_exam, English Language_ca, ...

export function parseFormatB(
  text: string,
  students: Student[],
  subjects: Subject[]
): ParsedScoreRow[] {
  const { data, meta } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = meta.fields ?? [];
  const studentMap = new Map(students.map((s) => [s.admission_number.trim(), s]));

  // Derive subject columns: headers ending with _ca
  const subjectNames = headers
    .filter((h) => h.toLowerCase().endsWith("_ca"))
    .map((h) => h.slice(0, -3).trim()); // strip "_ca"

  const subjectMap = new Map(subjects.map((s) => [s.name.trim().toLowerCase(), s]));
  const rows: ParsedScoreRow[] = [];

  for (const row of data) {
    const adm = (row["admission_number"] ?? "").trim();
    const student = studentMap.get(adm);

    if (!adm || !student) {
      rows.push(errorRow(adm, "", `Student "${adm}" not found`));
      continue;
    }

    for (const subjectName of subjectNames) {
      const caKey = `${subjectName}_ca`;
      const examKey = `${subjectName}_exam`;
      const caRaw = parseFloat(row[caKey] ?? "");
      const examRaw = parseFloat(row[examKey] ?? "");
      const subject = subjectMap.get(subjectName.toLowerCase());

      if (!subject) {
        rows.push(warnRow(adm, subjectName, student, `Subject "${subjectName}" not found`));
        continue;
      }
      if (isNaN(caRaw) || caRaw < 0 || caRaw > 40) {
        rows.push(errorRow(adm, subjectName, `CA score must be 0–40 (got "${row[caKey]}")`));
        continue;
      }
      if (isNaN(examRaw) || examRaw < 0 || examRaw > 60) {
        rows.push(errorRow(adm, subjectName, `Exam score must be 0–60 (got "${row[examKey]}")`));
        continue;
      }

      const total = computeTotal(caRaw, examRaw);
      const { grade, remark } = getGrade(total, DEFAULT_GRADE_SCALE);

      rows.push({
        student_id: student.id,
        subject_id: subject.id,
        admission_number: adm,
        subject_name: subjectName,
        student_name: student.full_name,
        ca_score: caRaw,
        exam: examRaw,
        total,
        grade,
        remark,
        status: "valid",
      });
    }
  }

  return rows;
}

// ─── Template generators ────────────────────────────────────────────────────

export function generateFormatATemplate(students: Student[], subjects: Subject[]): string {
  const rows = students.flatMap((s) =>
    subjects.map((sub) => ({
      admission_number: s.admission_number,
      student_name: s.full_name,
      subject: sub.name,
      ca_score: "",
      exam_score: "",
    }))
  );
  return Papa.unparse(rows);
}

export function generateFormatBTemplate(students: Student[], subjects: Subject[]): string {
  const subjectHeaders = subjects.flatMap((s) => [`${s.name}_ca`, `${s.name}_exam`]);
  const rows = students.map((s) => {
    const base: Record<string, string> = {
      admission_number: s.admission_number,
      student_name: s.full_name,
    };
    for (const sub of subjects) {
      base[`${sub.name}_ca`] = "";
      base[`${sub.name}_exam`] = "";
    }
    return base;
  });
  return Papa.unparse(rows, { columns: ["admission_number", "student_name", ...subjectHeaders] });
}

// ─── Student CSV import ─────────────────────────────────────────────────────

export interface ParsedStudentRow {
  admission_number: string;
  full_name: string;
  gender: string;
  date_of_birth: string;
  class_name: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
  address: string;
  status: "valid" | "error";
  error?: string;
}

export function parseStudentCSV(text: string): ParsedStudentRow[] {
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  return data.map((row): ParsedStudentRow => {
    const required = ["admission_number", "full_name", "gender", "date_of_birth", "class_name", "guardian_name", "guardian_phone"];
    const missing = required.filter((f) => !row[f]?.trim());
    if (missing.length) {
      return {
        admission_number: row["admission_number"] ?? "",
        full_name: row["full_name"] ?? "",
        gender: row["gender"] ?? "",
        date_of_birth: row["date_of_birth"] ?? "",
        class_name: row["class_name"] ?? "",
        guardian_name: row["guardian_name"] ?? "",
        guardian_phone: row["guardian_phone"] ?? "",
        guardian_email: row["guardian_email"] ?? "",
        address: row["address"] ?? "",
        status: "error",
        error: `Missing: ${missing.join(", ")}`,
      };
    }
    return {
      admission_number: row["admission_number"].trim(),
      full_name: row["full_name"].trim(),
      gender: row["gender"].trim(),
      date_of_birth: row["date_of_birth"].trim(),
      class_name: row["class_name"].trim(),
      guardian_name: row["guardian_name"].trim(),
      guardian_phone: row["guardian_phone"].trim(),
      guardian_email: row["guardian_email"]?.trim() ?? "",
      address: row["address"]?.trim() ?? "",
      status: "valid",
    };
  });
}

export function generateStudentCSVTemplate(): string {
  return Papa.unparse([{
    admission_number: "RS/2024/001",
    full_name: "Adeola Johnson",
    gender: "Female",
    date_of_birth: "2010-03-15",
    class_name: "JSS 1A",
    guardian_name: "Mr Johnson",
    guardian_phone: "08012345678",
    guardian_email: "johnson@email.com",
    address: "12 Example Street, Lagos",
  }]);
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function errorRow(adm: string, subject: string, message: string): ParsedScoreRow {
  return {
    admission_number: adm,
    subject_name: subject,
    ca_score: 0,
    exam: 0,
    total: 0,
    grade: "—",
    status: "error",
    message,
  };
}

function warnRow(adm: string, subject: string, student: Student, message: string): ParsedScoreRow {
  return {
    admission_number: adm,
    subject_name: subject,
    student_name: student.full_name,
    ca_score: 0,
    exam: 0,
    total: 0,
    grade: "—",
    status: "warning",
    message,
  };
}

import { GradeScale } from "@/types";

export const DEFAULT_GRADE_SCALE: GradeScale[] = [
  { min: 75, max: 100, grade: "A1", remark: "Excellent" },
  { min: 70, max: 74,  grade: "B2", remark: "Very Good" },
  { min: 65, max: 69,  grade: "B3", remark: "Good" },
  { min: 60, max: 64,  grade: "C4", remark: "Credit" },
  { min: 55, max: 59,  grade: "C5", remark: "Credit" },
  { min: 50, max: 54,  grade: "C6", remark: "Credit" },
  { min: 45, max: 49,  grade: "D7", remark: "Pass" },
  { min: 40, max: 44,  grade: "E8", remark: "Pass" },
  { min: 0,  max: 39,  grade: "F9", remark: "Fail" },
];

export function getGrade(score: number, scale: GradeScale[] = DEFAULT_GRADE_SCALE): GradeScale {
  const match = scale.find((g) => score >= g.min && score <= g.max);
  return match ?? { min: 0, max: 39, grade: "F9", remark: "Fail" };
}

// CA (0–40) + Exam (0–60) = Total (0–100)
export function computeTotal(ca_score: number, exam: number): number {
  return Math.min(100, ca_score + exam);
}

export function computeAverage(scores: number[]): number {
  if (scores.length === 0) return 0;
  return parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));
}

export function rankStudents<T extends { total: number }>(
  students: T[]
): (T & { position: number })[] {
  const sorted = [...students].sort((a, b) => b.total - a.total);
  let rank = 1;
  return sorted.map((s, i) => {
    if (i > 0 && sorted[i].total < sorted[i - 1].total) rank = i + 1;
    return { ...s, position: rank };
  });
}

export function getGradeColor(grade: string): string {
  if (grade === "A1") return "text-success";
  if (["B2", "B3"].includes(grade)) return "text-info";
  if (["C4", "C5", "C6"].includes(grade)) return "text-warning";
  if (["D7", "E8"].includes(grade)) return "text-warning";
  return "text-error";
}

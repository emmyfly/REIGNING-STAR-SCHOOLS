import { Score, StudentBadge, LeaderboardEntry } from "@/types";
import { computeAverage } from "./grading";

export const BADGE_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  top_performer: { emoji: "⭐", label: "Top Performer", color: "bg-yellow-100 text-yellow-800" },
  most_improved:  { emoji: "📈", label: "Most Improved",  color: "bg-blue-100 text-blue-800"   },
  honours:        { emoji: "🏆", label: "Honours",        color: "bg-purple-100 text-purple-800" },
};

/**
 * Compute badges for a single student given all scores for the term.
 * - top_performer: overall average rank ≤ 3 among all students
 * - honours: average ≥ 70
 */
export function computeStudentBadges(
  studentId: string,
  allEntries: LeaderboardEntry[]
): StudentBadge[] {
  const badges: StudentBadge[] = [];
  const entry = allEntries.find((e) => e.student.id === studentId);
  if (!entry) return badges;

  if (entry.rank <= 3) {
    badges.push({ type: "top_performer", label: BADGE_CONFIG.top_performer.label });
  }
  if (entry.average >= 70) {
    badges.push({ type: "honours", label: BADGE_CONFIG.honours.label });
  }
  return badges;
}

/**
 * Group scores by student and compute per-student averages.
 */
export function groupScoresByStudent(
  scores: Score[]
): Map<string, { scores: Score[]; average: number }> {
  const map = new Map<string, Score[]>();
  for (const s of scores) {
    if (!map.has(s.student_id)) map.set(s.student_id, []);
    map.get(s.student_id)!.push(s);
  }
  const result = new Map<string, { scores: Score[]; average: number }>();
  for (const [id, studentScores] of map) {
    result.set(id, {
      scores: studentScores,
      average: computeAverage(studentScores.map((s) => s.total)),
    });
  }
  return result;
}

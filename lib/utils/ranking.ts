import { LeaderboardEntry, Score, Student } from "@/types";
import { computeAverage, getGrade } from "./grading";

export function buildLeaderboard(
  students: Student[],
  scores: Score[]
): LeaderboardEntry[] {
  const grouped: Record<string, Score[]> = {};
  for (const score of scores) {
    if (!grouped[score.student_id]) grouped[score.student_id] = [];
    grouped[score.student_id].push(score);
  }

  const entries: Omit<LeaderboardEntry, "rank">[] = students
    .filter((s) => grouped[s.id]?.length)
    .map((student) => {
      const studentScores = grouped[student.id];
      const totals = studentScores.map((s) => s.total);
      const totalScore = totals.reduce((a, b) => a + b, 0);
      const average = computeAverage(totals);
      const { grade } = getGrade(average);
      return {
        student,
        total_score: totalScore,
        average,
        grade,
        subjects_count: studentScores.length,
      };
    });

  const sorted = entries.sort((a, b) => b.average - a.average);

  let rank = 1;
  return sorted.map((entry, i) => {
    if (i > 0 && entry.average < sorted[i - 1].average) rank = i + 1;
    return { ...entry, rank };
  });
}

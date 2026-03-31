"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { ReportCardData, Score, Student } from "@/types";
import { computeAverage, getGrade } from "@/lib/utils/grading";
import { buildLeaderboard } from "@/lib/utils/ranking";
import { computeStudentBadges } from "@/lib/utils/badges";
import { useSettings } from "./useSettings";

export function useStudentsWithScores(classId?: string, termId?: string) {
  const { settings } = useSettings();

  return useQuery<ReportCardData[]>({
    queryKey: ["report-cards", classId, termId],
    enabled: !!classId && !!termId,
    queryFn: async () => {
      const supabase = createClient();

      const [{ data: studentsRaw }, { data: scoresRaw }, { data: classData }] =
        await Promise.all([
          supabase
            .from("students")
            .select("*")
            .eq("class_id", classId!)
            .eq("status", "active")
            .order("full_name"),
          supabase
            .from("scores")
            .select("*, subject:subjects(name, code)")
            .eq("term_id", termId!)
            .in(
              "student_id",
              (await supabase.from("students").select("id").eq("class_id", classId!))
                .data?.map((s: { id: string }) => s.id) ?? []
            ),
          supabase.from("classes").select("name").eq("id", classId!).single(),
        ]);

      const students = (studentsRaw ?? []) as unknown as Student[];
      const scores = (scoresRaw ?? []) as unknown as Score[];
      const className = (classData as { name: string } | null)?.name ?? "—";

      // Build leaderboard for badge + position computation
      const leaderboard = buildLeaderboard(students, scores);

      return students.map((student): ReportCardData => {
        const studentScores = scores.filter((s) => s.student_id === student.id);
        const totals = studentScores.map((s) => s.total);
        const average = computeAverage(totals);
        const { grade: overallGrade } = getGrade(average);
        const entry = leaderboard.find((e) => e.student.id === student.id);
        const badges = computeStudentBadges(student.id, leaderboard);

        const term = settings?.current_term ?? "First";
        const session = settings?.current_session ?? "—";

        return {
          student,
          class_name: className,
          term,
          session,
          scores: studentScores.map((s) => ({
            subject: (s.subject as unknown as { name: string })?.name ?? s.subject_id,
            ca_score: s.ca_score,
            exam: s.exam,
            total: s.total,
            grade: s.grade,
            remark: s.remark,
            position: s.position ?? undefined,
          })),
          average,
          overall_grade: overallGrade,
          class_position: entry?.rank ?? 0,
          total_students: students.length,
          badges,
          school_name: settings?.school_name ?? "Reigning Star Schools",
          school_address: settings?.school_address ?? "",
          school_phone: settings?.school_phone ?? "",
          school_email: settings?.school_email ?? "",
          school_logo: settings?.logo_url ?? undefined,
          result_footer: settings?.result_footer ?? undefined,
        };
      });
    },
    staleTime: 60_000,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { computeAverage, getGrade } from "@/lib/utils/grading";

export interface LeaderboardRow {
  rank: number;
  student_id: string;
  student_name: string;
  class_id: string;
  class_name: string;
  average: number;
  grade: string;
  subjects_count: number;
  class_position?: number;
}

export function useSchoolLeaderboard(termId?: string) {
  return useQuery<LeaderboardRow[]>({
    queryKey: ["school-leaderboard", termId],
    enabled: !!termId,
    queryFn: async () => {
      const supabase = createClient();
      const { data: scores } = await supabase
        .from("scores")
        .select("student_id, total, position, student:students(id,full_name,class:classes(id,name))")
        .eq("term_id", termId!);

      if (!scores?.length) return [];

      const map = new Map<
        string,
        { name: string; class_id: string; class_name: string; totals: number[]; position?: number }
      >();

      for (const s of scores) {
        const student = s.student as unknown as {
          id: string;
          full_name: string;
          class?: { id: string; name: string };
        };
        if (!student) continue;
        if (!map.has(s.student_id)) {
          map.set(s.student_id, {
            name: student.full_name,
            class_id: student.class?.id ?? "",
            class_name: student.class?.name ?? "—",
            totals: [],
            position: s.position ?? undefined,
          });
        }
        map.get(s.student_id)!.totals.push(s.total);
      }

      const entries = Array.from(map.entries()).map(([id, v]) => ({
        student_id: id,
        name: v.name,
        class_id: v.class_id,
        class_name: v.class_name,
        average: computeAverage(v.totals),
        subjects_count: v.totals.length,
        class_position: v.position,
      }));

      entries.sort((a, b) => b.average - a.average);

      let rank = 1;
      return entries.map((e, i): LeaderboardRow => {
        if (i > 0 && e.average < entries[i - 1].average) rank = i + 1;
        const { grade } = getGrade(e.average);
        return {
          rank,
          student_id: e.student_id,
          student_name: e.name,
          class_id: e.class_id,
          class_name: e.class_name,
          average: e.average,
          grade,
          subjects_count: e.subjects_count,
          class_position: e.class_position,
        };
      });
    },
    staleTime: 60_000,
  });
}

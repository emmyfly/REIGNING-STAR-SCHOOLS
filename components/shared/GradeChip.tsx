import { cn } from "@/lib/utils";
import { getGradeColor } from "@/lib/utils/grading";

interface GradeChipProps {
  grade: string;
  score?: number;
  className?: string;
}

export function GradeChip({ grade, score, className }: GradeChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        getGradeColor(grade),
        className
      )}
    >
      {grade}
      {score !== undefined && <span className="font-normal text-muted-foreground">({score})</span>}
    </span>
  );
}

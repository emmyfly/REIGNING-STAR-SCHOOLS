import { GradeChip } from "./GradeChip";
import { TableCell, TableRow } from "@/components/ui/table";
import { Score } from "@/types";

interface ScoreRowProps {
  score: Score;
  showStudent?: boolean;
  showSubject?: boolean;
}

export function ScoreRow({ score, showStudent = false, showSubject = true }: ScoreRowProps) {
  return (
    <TableRow>
      {showStudent && (
        <TableCell className="font-medium">
          {score.student?.full_name ?? score.student_id}
        </TableCell>
      )}
      {showSubject && (
        <TableCell>{score.subject?.name ?? score.subject_id}</TableCell>
      )}
      <TableCell className="text-center">{score.ca_score}</TableCell>
      <TableCell className="text-center">{score.exam}</TableCell>
      <TableCell className="text-center font-semibold">{score.total}</TableCell>
      <TableCell>
        <GradeChip grade={score.grade} />
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">{score.remark}</TableCell>
      {score.position !== undefined && (
        <TableCell className="text-center">{score.position}</TableCell>
      )}
    </TableRow>
  );
}

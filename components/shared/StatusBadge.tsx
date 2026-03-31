import { Badge } from "@/components/ui/badge";
import { type BadgeProps } from "@/components/ui/badge";

type Status =
  | "active" | "inactive" | "graduated" | "transferred"
  | "open" | "in_progress" | "resolved" | "closed"
  | "pending" | "paid" | "partial" | "overdue"
  | "draft" | "published" | "completed"
  | "submitted" | "graded" | "late";

const STATUS_MAP: Record<Status, { label: string; variant: BadgeProps["variant"] }> = {
  active:      { label: "Active",      variant: "success" },
  inactive:    { label: "Inactive",    variant: "secondary" },
  graduated:   { label: "Graduated",   variant: "info" },
  transferred: { label: "Transferred", variant: "warning" },
  open:        { label: "Open",        variant: "destructive" },
  in_progress: { label: "In Progress", variant: "warning" },
  resolved:    { label: "Resolved",    variant: "success" },
  closed:      { label: "Closed",      variant: "secondary" },
  pending:     { label: "Pending",     variant: "warning" },
  paid:        { label: "Paid",        variant: "success" },
  partial:     { label: "Partial",     variant: "info" },
  overdue:     { label: "Overdue",     variant: "destructive" },
  draft:       { label: "Draft",       variant: "secondary" },
  published:   { label: "Published",   variant: "success" },
  completed:   { label: "Completed",   variant: "info" },
  submitted:   { label: "Submitted",   variant: "info" },
  graded:      { label: "Graded",      variant: "success" },
  late:        { label: "Late",        variant: "destructive" },
};

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_MAP[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

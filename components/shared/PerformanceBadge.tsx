import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type Trend = "up" | "down" | "stable";

interface PerformanceBadgeProps {
  trend: Trend;
  label?: string;
  className?: string;
}

const TREND_CONFIG: Record<Trend, { icon: typeof TrendingUp; color: string; defaultLabel: string }> = {
  up:     { icon: TrendingUp,   color: "text-success bg-success-bg",  defaultLabel: "Improving" },
  down:   { icon: TrendingDown, color: "text-error bg-error-bg",      defaultLabel: "Declining" },
  stable: { icon: Minus,        color: "text-warning bg-warning-bg",  defaultLabel: "Stable" },
};

export function PerformanceBadge({ trend, label, className }: PerformanceBadgeProps) {
  const config = TREND_CONFIG[trend];
  const Icon = config.icon;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", config.color, className)}>
      <Icon className="h-3 w-3" />
      {label ?? config.defaultLabel}
    </span>
  );
}

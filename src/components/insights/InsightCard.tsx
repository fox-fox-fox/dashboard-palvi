import {
  AlertTriangle,
  Clock,
  Headphones,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import type { Insight, InsightKey } from "@/data/insights";
import { cn } from "@/utils/cn";

interface InsightCardProps {
  insight: Insight;
  onDismiss: (key: InsightKey) => void;
}

const ICON_MAP: Record<InsightKey, LucideIcon> = {
  win_rate_dropped: TrendingDown,
  win_rate_spike: TrendingUp,
  response_time_spike: Clock,
  stale_deals_growing: AlertTriangle,
  funnel_choke: AlertTriangle,
  funnel_breakthrough: Sparkles,
  support_overload: Headphones,
  lead_drought: Users,
  response_time_outlier: Zap,
};

type BadgeTone = "neutral" | "positive" | "negative";

function severityToBadgeTone(
  severity: Insight["severity"],
  tone: Insight["tone"],
): BadgeTone {
  if (severity === "medium") return "neutral";
  return tone === "positive" ? "positive" : "negative";
}

function severityLabel(severity: Insight["severity"]): string {
  return severity === "high" ? "Alta" : "Media";
}

export function InsightCard({ insight, onDismiss }: InsightCardProps) {
  const Icon = ICON_MAP[insight.key] ?? AlertTriangle;
  const isPositive = insight.tone === "positive";
  const badgeTone = severityToBadgeTone(insight.severity, insight.tone);

  return (
    <Card
      padded
      className={cn(
        "relative border-l-4",
        isPositive ? "border-l-positive" : "border-l-negative",
      )}
    >
      <button
        type="button"
        onClick={() => onDismiss(insight.key)}
        aria-label="Marcar revisado"
        className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-text-subtle transition-colors hover:bg-surface-2 hover:text-text"
      >
        <X size={16} aria-hidden="true" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <div
          className={cn(
            "mt-0.5 inline-flex shrink-0 items-center justify-center",
            isPositive ? "text-positive" : "text-negative",
          )}
          aria-hidden="true"
        >
          <Icon size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-h3 font-semibold text-text">{insight.title}</h3>
            <Badge tone={badgeTone} className="shrink-0">
              {severityLabel(insight.severity)}
            </Badge>
          </div>
          <p className="mt-1 text-body text-text-muted">{insight.description}</p>
        </div>
      </div>
    </Card>
  );
}

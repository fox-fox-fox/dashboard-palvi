import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Badge } from "@/components/ui";

interface DirectionAwareBadgeProps {
  delta: { relative: number | null; isNew: boolean };
  sign: "positive" | "negative" | "neutral";
}

export function DirectionAwareBadge({ delta, sign }: DirectionAwareBadgeProps) {
  if (delta.isNew) {
    return <Badge tone="info">nuevo</Badge>;
  }

  if (delta.relative === null) {
    return <Badge tone="neutral">—</Badge>;
  }

  const value = delta.relative;
  const icon =
    value >= 0 ? (
      <ArrowUpRight size={12} aria-hidden="true" />
    ) : (
      <ArrowDownRight size={12} aria-hidden="true" />
    );
  const text = `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;

  return (
    <Badge tone={sign} icon={icon}>
      {text}
    </Badge>
  );
}

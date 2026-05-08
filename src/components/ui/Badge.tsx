import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

type BadgeTone = "neutral" | "positive" | "negative" | "warning" | "info";

interface BadgeProps {
  tone: BadgeTone;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

const toneStyles: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-text-muted",
  positive: "bg-positive/10 text-positive",
  negative: "bg-negative/10 text-negative",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
};

export function Badge({ tone, children, className, icon }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-caption font-medium tabular-nums",
        toneStyles[tone],
        className,
      )}
    >
      {icon != null && <span className="inline-flex shrink-0 items-center">{icon}</span>}
      {children}
    </span>
  );
}

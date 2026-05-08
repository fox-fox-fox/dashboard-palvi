import { AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/utils/cn";
import type { FunnelStep as FunnelStepData } from "@/hooks/useFunnel";

interface FunnelStepProps {
  step: FunnelStepData;
  nextStep?: FunnelStepData | null;
  maxVolume: number;
}

const PERCENT_FORMATTER = new Intl.NumberFormat("es-ES", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const SIGNED_PERCENT_FORMATTER = new Intl.NumberFormat("es-ES", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

const VOLUME_FORMATTER = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 0,
});

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return PERCENT_FORMATTER.format(value);
}

function formatDelta(value: number | null): string {
  if (value === null) return "—";
  return SIGNED_PERCENT_FORMATTER.format(value);
}

const SIGN_TEXT_CLASS: Record<FunnelStepData["sign"], string> = {
  positive: "text-positive",
  negative: "text-negative",
  neutral: "text-text-muted",
};

export function FunnelStep({ step, nextStep, maxVolume }: FunnelStepProps) {
  const widthPct =
    maxVolume > 0 ? Math.max(0, Math.min(100, (step.volume / maxVolume) * 100)) : 0;

  const barColor = step.isBottleneck
    ? "bg-negative"
    : step.isBreakthrough
      ? "bg-positive"
      : "bg-accent";

  const conversionLabel =
    nextStep != null
      ? `${formatPercent(step.conversionToNext)} a ${nextStep.label}`
      : null;

  const deltaLabel =
    nextStep != null && step.deltaRelative !== null
      ? formatDelta(step.deltaRelative)
      : null;

  const ariaLabel = [
    `${step.label}: ${VOLUME_FORMATTER.format(step.volume)}`,
    conversionLabel != null
      ? `Conversión ${formatPercent(step.conversionToNext)}${
          deltaLabel != null ? `, variación ${deltaLabel}` : ""
        }`
      : null,
    step.isBottleneck ? "cuello de botella" : null,
    step.isBreakthrough ? "mejora destacada" : null,
  ]
    .filter((s): s is string => s !== null)
    .join(", ");

  return (
    <div
      className="flex flex-col gap-2"
      aria-label={ariaLabel}
      role="group"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-h3 font-semibold">
          {step.isBottleneck && (
            <AlertTriangle
              size={14}
              aria-hidden="true"
              className="text-negative"
            />
          )}
          {step.isBreakthrough && (
            <Sparkles size={14} aria-hidden="true" className="text-positive" />
          )}
          {step.label}
        </span>
        <span className="text-body text-text-muted tabular-nums">
          {VOLUME_FORMATTER.format(step.volume)}
        </span>
      </div>
      <div
        className="relative h-2 overflow-hidden rounded-md bg-surface-2"
        role="presentation"
      >
        <div
          className={cn("h-full rounded-md transition-[width] duration-500 ease-out-expo", barColor)}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      {nextStep != null && (
        <div
          className={cn(
            "inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption tabular-nums",
          )}
          {...(step.conversionToNext === null
            ? { title: "sin datos suficientes" }
            : {})}
        >
          <span className="text-text-muted">
            {formatPercent(step.conversionToNext)} al siguiente
          </span>
          {deltaLabel != null && (
            <>
              <span className="text-text-muted">·</span>
              <span className={cn("font-medium", SIGN_TEXT_CLASS[step.sign])}>
                {deltaLabel}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

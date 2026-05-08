import { Card } from "@/components/ui";
import { DirectionAwareBadge } from "./DirectionAwareBadge";
import { Sparkline } from "./Sparkline";
// Tipo provisto por agente paralelo (src/hooks/useKPIs.ts).
import type { KpiResult } from "@/hooks/useKPIs";

interface KPICardProps {
  kpi: KpiResult;
  onClick?: () => void;
}

function humanizeDelta(kpi: KpiResult): string {
  if (kpi.delta.isNew) return "valor nuevo";
  if (kpi.delta.relative === null) return "sin datos previos";
  const pct = (kpi.delta.relative * 100).toFixed(1);
  const signed = kpi.delta.relative >= 0 ? `+${pct}` : pct;
  // sign ya es direction-aware, así que positive = mejor.
  const qualifier =
    kpi.sign === "positive" ? "mejor" : kpi.sign === "negative" ? "peor" : "sin cambio";
  return `${signed} por ciento ${qualifier}`;
}

export function KPICard({ kpi, onClick }: KPICardProps) {
  const { spec, value, formattedValue, delta, sign, sparkline } = kpi;
  const ariaLabel = `${spec.label}, ${value === null ? "sin datos" : formattedValue}, ${humanizeDelta(kpi)}`;

  const unit = spec.unit;
  const showUnit = typeof unit === "string" && unit.length > 0 && unit !== "%";

  return (
    <Card interactive padded {...(onClick ? { onClick } : {})} aria-label={ariaLabel}>
      <div className="flex flex-col gap-2">
        <span className="text-caption text-text-muted">{spec.label}</span>
        <span className="text-display font-semibold tabular-nums text-text">
          {value === null ? "—" : formattedValue}
        </span>
        <div className="flex items-center gap-2">
          <DirectionAwareBadge delta={delta} sign={sign} />
          {showUnit && (
            <span className="text-caption text-text-muted">{unit}</span>
          )}
        </div>
        <div className="mt-1">
          <Sparkline
            data={sparkline}
            tone={sign}
            ariaLabel={`Tendencia ${spec.label}`}
          />
        </div>
      </div>
    </Card>
  );
}

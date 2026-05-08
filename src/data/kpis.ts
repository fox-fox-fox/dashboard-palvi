import { lastValid, rolling, sum, weightedAvg, winRate } from "./aggregations";
import type { Direction, IndexedDataset, IndexedMetric } from "./schema";

export type KpiKey =
  | "win_rate"
  | "deals_won"
  | "avg_response_time"
  | "stale_deals"
  | "leads_qualified"
  | "support_resolution";

export interface KpiSpec {
  key: KpiKey;
  label: string;
  unit: string;
  direction: Direction;
  description: string;
  compute: (ds: IndexedDataset, from: number, to: number) => number | null;
  format: (value: number | null) => string;
  sparklineSource: (ds: IndexedDataset) => Float64Array;
}

const integerFormatter = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

function formatInteger(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return integerFormatter.format(Math.round(v));
}

function buildDailyWinRateRolling(won: IndexedMetric, lost: IndexedMetric): Float64Array {
  const N = won.values.length;
  const series = new Float64Array(N);
  const mask = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const w = won.values[i] as number;
    const l = lost.values[i] as number;
    const denom = won.mask[i] === 1 && lost.mask[i] === 1 ? w + l : 0;
    if (denom > 0) {
      series[i] = w / denom;
      mask[i] = 1;
    } else {
      series[i] = NaN;
      mask[i] = 0;
    }
  }
  // Reuse rolling() over a synthetic IndexedMetric.
  return rolling({ values: series, mask, n: 0 }, 7);
}

export const KPI_SPECS: readonly KpiSpec[] = [
  {
    key: "win_rate",
    label: "Win rate",
    unit: "%",
    direction: "higher_is_better",
    description: "Cierre real: deals ganados sobre deals cerrados (won + lost).",
    compute: (ds, from, to) => winRate(ds.metrics.deals_won, ds.metrics.deals_lost, from, to),
    format: (v) => (v === null || !Number.isFinite(v) ? "—" : `${(v * 100).toFixed(1)}%`),
    sparklineSource: (ds) => buildDailyWinRateRolling(ds.metrics.deals_won, ds.metrics.deals_lost),
  },
  {
    key: "deals_won",
    label: "Deals ganados",
    unit: "deals",
    direction: "higher_is_better",
    description: "Volumen de cierres en la ventana.",
    compute: (ds, from, to) => sum(ds.metrics.deals_won, from, to).total,
    format: formatInteger,
    sparklineSource: (ds) => ds.metrics.deals_won.values,
  },
  {
    key: "avg_response_time",
    label: "Tiempo de respuesta",
    unit: "min",
    direction: "lower_is_better",
    description: "Promedio ponderado por leads creados; predictor de conversión.",
    compute: (ds, from, to) =>
      weightedAvg(ds.metrics.avg_response_time_min, ds.metrics.leads_created, from, to),
    format: (v) => (v === null || !Number.isFinite(v) ? "—" : `${v.toFixed(1)} min`),
    sparklineSource: (ds) => ds.metrics.avg_response_time_min.values,
  },
  {
    key: "stale_deals",
    label: "Stale deals",
    unit: "deals",
    direction: "lower_is_better",
    description: "Snapshot del pipeline atascado al cierre del día.",
    compute: (ds, _from, to) => lastValid(ds.metrics.stale_deals, to - 1),
    format: formatInteger,
    sparklineSource: (ds) => ds.metrics.stale_deals.values,
  },
  {
    key: "leads_qualified",
    label: "Leads calificados",
    unit: "leads",
    direction: "higher_is_better",
    description: "Salud del top-of-funnel comercial.",
    compute: (ds, from, to) => sum(ds.metrics.leads_qualified, from, to).total,
    format: formatInteger,
    sparklineSource: (ds) => ds.metrics.leads_qualified.values,
  },
  {
    key: "support_resolution",
    label: "Resolución soporte",
    unit: "h",
    direction: "lower_is_better",
    description: "Promedio ponderado por tickets abiertos; proxy de churn-risk.",
    compute: (ds, from, to) =>
      weightedAvg(
        ds.metrics.support_avg_resolution_hours,
        ds.metrics.support_tickets_opened,
        from,
        to,
      ),
    format: (v) => (v === null || !Number.isFinite(v) ? "—" : `${v.toFixed(1)} h`),
    sparklineSource: (ds) => ds.metrics.support_avg_resolution_hours.values,
  },
] as const;

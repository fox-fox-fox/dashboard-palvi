import { useMemo } from "react";
import { windowIndicesByDate } from "@/data/aggregations";
import { KPI_SPECS, type KpiKey, type KpiSpec } from "@/data/kpis";
import type { IndexedDataset } from "@/data/schema";
import { useDatasetId, useWindowKey } from "@/store/useAppStore";
import type { WindowKey } from "@/store/types";
import { useIndexedMetrics } from "./useIndexedMetrics";

export interface KPIDetailPoint {
  date: string;
  value: number | null;
}

export interface KPIDetailStats {
  bestDay: { date: string; value: number } | null;
  worstDay: { date: string; value: number } | null;
  average: number | null;
  nDays: number;
}

export interface KPIDetailResult {
  spec: KpiSpec;
  currentValue: number | null;
  formattedCurrentValue: string;
  windowLabel: string;
  chart90: KPIDetailPoint[];
  stats: KPIDetailStats;
  ready: boolean;
}

type MetricKind = "count" | "rate" | "snapshot";

const KPI_KIND: Record<KpiKey, MetricKind> = {
  win_rate: "rate",
  deals_won: "count",
  avg_response_time: "rate",
  stale_deals: "snapshot",
  leads_qualified: "count",
  support_resolution: "rate",
};

const WINDOW_LABELS: Record<WindowKey, string> = {
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
  "90d": "Últimos 90 días",
  MTD: "Mes en curso",
  QTD: "Trimestre en curso",
  "365d": "Últimos 365 días",
};

const CHART_LEN = 90;

const EMPTY_STATS: KPIDetailStats = {
  bestDay: null,
  worstDay: null,
  average: null,
  nDays: 0,
};

function buildChart90(ds: IndexedDataset, spec: KpiSpec): KPIDetailPoint[] {
  const src = spec.sparklineSource(ds);
  const N = src.length;
  const take = Math.min(CHART_LEN, N);
  const points: KPIDetailPoint[] = new Array<KPIDetailPoint>(take);
  for (let i = 0; i < take; i++) {
    const idx = N - take + i;
    const raw = src[idx] as number;
    const date = ds.dates[idx] ?? "";
    const value = Number.isFinite(raw) ? raw : null;
    points[i] = { date, value };
  }
  return points;
}

function computeStats(
  points: KPIDetailPoint[],
  kind: MetricKind,
  direction: KpiSpec["direction"],
): KPIDetailStats {
  let bestDay: { date: string; value: number } | null = null;
  let worstDay: { date: string; value: number } | null = null;
  let sum = 0;
  let nValid = 0;
  let lastValid: { date: string; value: number } | null = null;
  const higherBetter = direction === "higher_is_better";

  for (const p of points) {
    if (p.value === null) continue;
    const v = p.value;
    nValid++;
    sum += v;
    lastValid = { date: p.date, value: v };
    if (higherBetter) {
      if (bestDay === null || v > bestDay.value) bestDay = { date: p.date, value: v };
      if (worstDay === null || v < worstDay.value) worstDay = { date: p.date, value: v };
    } else {
      if (bestDay === null || v < bestDay.value) bestDay = { date: p.date, value: v };
      if (worstDay === null || v > worstDay.value) worstDay = { date: p.date, value: v };
    }
  }

  if (nValid === 0) return EMPTY_STATS;

  let average: number | null;
  if (kind === "snapshot") {
    average = lastValid?.value ?? null;
  } else if (kind === "count") {
    average = sum / nValid;
  } else {
    average = sum / nValid;
  }

  return { bestDay, worstDay, average, nDays: nValid };
}

function findSpec(kpiKey: KpiKey): KpiSpec | undefined {
  return KPI_SPECS.find((s) => s.key === kpiKey);
}

export function useKPIDetail(kpiKey: KpiKey): KPIDetailResult {
  const datasetId = useDatasetId();
  const windowKey = useWindowKey();
  const indexed = useIndexedMetrics();
  const ds = indexed[datasetId];

  return useMemo<KPIDetailResult>(() => {
    const spec = findSpec(kpiKey);
    if (spec === undefined) {
      throw new Error(`KPI spec not found: ${kpiKey}`);
    }
    if (ds === undefined) {
      return {
        spec,
        currentValue: null,
        formattedCurrentValue: spec.format(null),
        windowLabel: WINDOW_LABELS[windowKey],
        chart90: [],
        stats: EMPTY_STATS,
        ready: false,
      };
    }

    const range = windowIndicesByDate(ds.dates, windowKey, ds.dates.length);
    const currentValue =
      range === null ? null : spec.compute(ds, range.from, range.to);
    const chart90 = buildChart90(ds, spec);
    const stats = computeStats(chart90, KPI_KIND[kpiKey], spec.direction);

    return {
      spec,
      currentValue,
      formattedCurrentValue: spec.format(currentValue),
      windowLabel: WINDOW_LABELS[windowKey],
      chart90,
      stats,
      ready: true,
    };
  }, [ds, windowKey, kpiKey]);
}

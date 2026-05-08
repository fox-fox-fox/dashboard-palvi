import { useMemo } from "react";
import {
  directionAwareSign,
  sum,
  windowIndicesByDate,
} from "@/data/aggregations";
import type { IndexedDataset, MetricKey } from "@/data/schema";
import { useDatasetId, useWindowKey } from "@/store/useAppStore";
import type { WindowKey } from "@/store/types";
import { useIndexedMetrics } from "./useIndexedMetrics";

export type FunnelStepKey =
  | "traffic"
  | "leads_created"
  | "leads_qualified"
  | "deals_created"
  | "deals_won";

export interface FunnelStep {
  key: FunnelStepKey;
  label: string;
  volume: number;
  conversionToNext: number | null;
  baselineConversion: number | null;
  deltaRelative: number | null;
  sign: "positive" | "negative" | "neutral";
  isBottleneck: boolean;
  isBreakthrough: boolean;
}

export interface FunnelResult {
  steps: FunnelStep[];
  windowKey: WindowKey;
  periodLabel: string;
  ready: boolean;
}

const STEP_DEFS: ReadonlyArray<{ key: FunnelStepKey; label: string }> = [
  { key: "traffic", label: "Tráfico" },
  { key: "leads_created", label: "Leads" },
  { key: "leads_qualified", label: "Calificados" },
  { key: "deals_created", label: "Deals" },
  { key: "deals_won", label: "Ganados" },
];

const PERIOD_LABELS: Record<WindowKey, string> = {
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
  "90d": "Últimos 90 días",
  MTD: "Mes en curso",
  QTD: "Trimestre en curso",
  "365d": "Últimos 365 días",
};

const BOTTLENECK_THRESHOLD = 0.1;
const BREAKTHROUGH_THRESHOLD = 0.15;

function ratio(num: number, den: number): number | null {
  if (den === 0) return null;
  return num / den;
}

function computeFunnel(ds: IndexedDataset, windowKey: WindowKey): FunnelResult {
  const range = windowIndicesByDate(ds.dates, windowKey, ds.dates.length);
  if (range === null) {
    return {
      steps: [],
      windowKey,
      periodLabel: PERIOD_LABELS[windowKey],
      ready: false,
    };
  }

  const hasPrior = range.priorTo > range.priorFrom;

  const volumes: number[] = STEP_DEFS.map(({ key }) => {
    const metricKey = key as MetricKey;
    return sum(ds.metrics[metricKey], range.from, range.to).total;
  });

  const baselineVolumes: number[] = STEP_DEFS.map(({ key }) => {
    if (!hasPrior) return 0;
    const metricKey = key as MetricKey;
    return sum(ds.metrics[metricKey], range.priorFrom, range.priorTo).total;
  });

  const conversions: Array<number | null> = STEP_DEFS.map((_, i) => {
    if (i === STEP_DEFS.length - 1) return null;
    return ratio(volumes[i + 1] as number, volumes[i] as number);
  });

  const baselineConversions: Array<number | null> = STEP_DEFS.map((_, i) => {
    if (i === STEP_DEFS.length - 1) return null;
    if (!hasPrior) return null;
    return ratio(baselineVolumes[i + 1] as number, baselineVolumes[i] as number);
  });

  const deltasRelative: Array<number | null> = conversions.map((conv, i) => {
    const baseline = baselineConversions[i];
    if (conv === null || baseline === null || baseline === undefined || baseline === 0) return null;
    return (conv - baseline) / baseline;
  });

  // Identify single bottleneck (worst drop) and single breakthrough (best gain).
  let bottleneckIdx = -1;
  let bottleneckVal = 0;
  let breakthroughIdx = -1;
  let breakthroughVal = 0;

  deltasRelative.forEach((d, i) => {
    if (d === null) return;
    if (d <= -BOTTLENECK_THRESHOLD && d < bottleneckVal) {
      bottleneckVal = d;
      bottleneckIdx = i;
    }
    if (d >= BREAKTHROUGH_THRESHOLD && d > breakthroughVal) {
      breakthroughVal = d;
      breakthroughIdx = i;
    }
  });

  const steps: FunnelStep[] = STEP_DEFS.map((def, i) => {
    const conv = conversions[i] ?? null;
    const baseline = baselineConversions[i] ?? null;
    const dRel = deltasRelative[i] ?? null;
    const sign =
      dRel === null || dRel === 0
        ? "neutral"
        : directionAwareSign(dRel, "higher_is_better");
    return {
      key: def.key,
      label: def.label,
      volume: volumes[i] as number,
      conversionToNext: conv,
      baselineConversion: baseline,
      deltaRelative: dRel,
      sign,
      isBottleneck: i === bottleneckIdx,
      isBreakthrough: i === breakthroughIdx,
    };
  });

  return {
    steps,
    windowKey,
    periodLabel: PERIOD_LABELS[windowKey],
    ready: true,
  };
}

export function useFunnel(): FunnelResult {
  const datasetId = useDatasetId();
  const windowKey = useWindowKey();
  const indexed = useIndexedMetrics();
  const ds = indexed[datasetId];

  return useMemo(() => {
    if (ds === undefined) {
      return {
        steps: [],
        windowKey,
        periodLabel: PERIOD_LABELS[windowKey],
        ready: false,
      };
    }
    return computeFunnel(ds, windowKey);
  }, [ds, windowKey]);
}

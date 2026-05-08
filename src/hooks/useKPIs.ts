import { useMemo } from "react";
import {
  delta,
  directionAwareSign,
  windowIndicesByDate,
} from "@/data/aggregations";
import { KPI_SPECS, type KpiKey, type KpiSpec } from "@/data/kpis";
import type { IndexedDataset } from "@/data/schema";
import { useDatasetId, useWindowKey } from "@/store/useAppStore";
import type { WindowKey } from "@/store/types";
import { useIndexedMetrics } from "./useIndexedMetrics";

export interface KpiResult {
  key: KpiKey;
  spec: KpiSpec;
  value: number | null;
  formattedValue: string;
  delta: { absolute: number | null; relative: number | null; isNew: boolean };
  sign: "positive" | "negative" | "neutral";
  sparkline: number[];
  nDaysCurrent: number;
  nDaysPrior: number;
}

export interface KpisResult {
  kpis: KpiResult[];
  windowKey: WindowKey;
  todayDate: string;
  periodLabel: string;
  ready: boolean;
}

const PERIOD_LABELS: Record<WindowKey, string> = {
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
  "90d": "Últimos 90 días",
  MTD: "Mes en curso",
  QTD: "Trimestre en curso",
  "365d": "Últimos 365 días",
};

const SPARKLINE_LEN = 30;

function tailToNumberArray(source: Float64Array, len: number): number[] {
  const N = source.length;
  const take = Math.min(len, N);
  const out: number[] = new Array<number>(take);
  for (let i = 0; i < take; i++) {
    out[i] = source[N - take + i] as number;
  }
  return out;
}

function computeKpis(ds: IndexedDataset, windowKey: WindowKey): KpisResult {
  const range = windowIndicesByDate(ds.dates, windowKey, ds.dates.length);
  const todayDate = ds.dates[ds.dates.length - 1] ?? "";
  if (range === null) {
    return {
      kpis: [],
      windowKey,
      todayDate,
      periodLabel: PERIOD_LABELS[windowKey],
      ready: false,
    };
  }

  const kpis: KpiResult[] = KPI_SPECS.map((spec) => {
    const value = spec.compute(ds, range.from, range.to);
    const prior =
      range.priorTo > range.priorFrom
        ? spec.compute(ds, range.priorFrom, range.priorTo)
        : null;
    const d = delta(value, prior);
    const signBasis = d.relative ?? d.absolute ?? 0;
    const sign =
      d.isNew && spec.direction === "higher_is_better"
        ? "positive"
        : d.isNew && spec.direction === "lower_is_better"
          ? "negative"
          : directionAwareSign(signBasis, spec.direction);
    const sparkline = tailToNumberArray(spec.sparklineSource(ds), SPARKLINE_LEN);
    return {
      key: spec.key,
      spec,
      value,
      formattedValue: spec.format(value),
      delta: d,
      sign,
      sparkline,
      nDaysCurrent: range.to - range.from,
      nDaysPrior: range.priorTo - range.priorFrom,
    };
  });

  return {
    kpis,
    windowKey,
    todayDate,
    periodLabel: PERIOD_LABELS[windowKey],
    ready: true,
  };
}

export function useKPIs(): KpisResult {
  const datasetId = useDatasetId();
  const windowKey = useWindowKey();
  const indexed = useIndexedMetrics();
  const ds = indexed[datasetId];

  return useMemo(() => {
    if (ds === undefined) {
      return {
        kpis: [],
        windowKey,
        todayDate: "",
        periodLabel: PERIOD_LABELS[windowKey],
        ready: false,
      };
    }
    return computeKpis(ds, windowKey);
  }, [ds, windowKey]);
}

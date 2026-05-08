import { useMemo } from "react";
import {
  delta,
  directionAwareSign,
  sum,
  weightedAvg,
  windowIndicesByDate,
} from "@/data/aggregations";
import type { IndexedDataset } from "@/data/schema";
import { useDatasetId, useWindowKey } from "@/store/useAppStore";
import type { WindowKey } from "@/store/types";
import { useIndexedMetrics } from "./useIndexedMetrics";

export interface CustomerHealthSeriesPoint {
  date: string;
  tickets: number | null;
  dealsLost: number | null;
}

export interface CustomerHealthResult {
  ticketsCurrent: number;
  ticketsPrior: number;
  ticketsDelta: { absolute: number | null; relative: number | null; isNew: boolean };
  resolutionCurrent: number | null;
  resolutionPrior: number | null;
  resolutionDelta: { absolute: number | null; relative: number | null; isNew: boolean };
  ticketsSign: "positive" | "negative" | "neutral";
  resolutionSign: "positive" | "negative" | "neutral";
  isWarning: boolean;
  isCorrelating: boolean;
  series: CustomerHealthSeriesPoint[];
  windowKey: WindowKey;
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

const SERIES_LEN = 30;

function buildSeries(ds: IndexedDataset, len: number): CustomerHealthSeriesPoint[] {
  const N = ds.dates.length;
  const take = Math.min(len, N);
  const tickets = ds.metrics.support_tickets_opened;
  const dealsLost = ds.metrics.deals_lost;
  const out: CustomerHealthSeriesPoint[] = new Array<CustomerHealthSeriesPoint>(take);
  for (let i = 0; i < take; i++) {
    const idx = N - take + i;
    const date = ds.dates[idx] ?? "";
    const tVal =
      tickets.mask[idx] === 1 ? (tickets.values[idx] as number) : null;
    const dVal =
      dealsLost.mask[idx] === 1 ? (dealsLost.values[idx] as number) : null;
    out[i] = { date, tickets: tVal, dealsLost: dVal };
  }
  return out;
}

function emptyResult(windowKey: WindowKey): CustomerHealthResult {
  return {
    ticketsCurrent: 0,
    ticketsPrior: 0,
    ticketsDelta: { absolute: null, relative: null, isNew: false },
    resolutionCurrent: null,
    resolutionPrior: null,
    resolutionDelta: { absolute: null, relative: null, isNew: false },
    ticketsSign: "neutral",
    resolutionSign: "neutral",
    isWarning: false,
    isCorrelating: false,
    series: [],
    windowKey,
    periodLabel: PERIOD_LABELS[windowKey],
    ready: false,
  };
}

function compute(ds: IndexedDataset, windowKey: WindowKey): CustomerHealthResult {
  const range = windowIndicesByDate(ds.dates, windowKey, ds.dates.length);
  if (range === null) return emptyResult(windowKey);

  const tickets = ds.metrics.support_tickets_opened;
  const resolution = ds.metrics.support_avg_resolution_hours;
  const dealsLost = ds.metrics.deals_lost;

  const ticketsCurrent = sum(tickets, range.from, range.to).total;
  const ticketsPrior =
    range.priorTo > range.priorFrom
      ? sum(tickets, range.priorFrom, range.priorTo).total
      : 0;

  const resolutionCurrent = weightedAvg(resolution, tickets, range.from, range.to);
  const resolutionPrior =
    range.priorTo > range.priorFrom
      ? weightedAvg(resolution, tickets, range.priorFrom, range.priorTo)
      : null;

  const ticketsDelta = delta(ticketsCurrent, ticketsPrior);
  const resolutionDelta = delta(resolutionCurrent, resolutionPrior);

  const ticketsSignBasis = ticketsDelta.relative ?? ticketsDelta.absolute ?? 0;
  const resolutionSignBasis = resolutionDelta.relative ?? resolutionDelta.absolute ?? 0;
  const ticketsSign = directionAwareSign(ticketsSignBasis, "lower_is_better");
  const resolutionSign = directionAwareSign(resolutionSignBasis, "lower_is_better");

  const ticketsRel = ticketsDelta.relative ?? 0;
  const resolutionRel = resolutionDelta.relative ?? 0;
  const isWarning = ticketsRel > 0.3 || resolutionRel > 0.2;

  const dealsLostCurrent = sum(dealsLost, range.from, range.to).total;
  const dealsLostPrior =
    range.priorTo > range.priorFrom
      ? sum(dealsLost, range.priorFrom, range.priorTo).total
      : 0;
  const dealsLostDelta = delta(dealsLostCurrent, dealsLostPrior);
  const dealsLostRel = dealsLostDelta.relative ?? 0;
  const isCorrelating = ticketsRel > 0 && dealsLostRel > 0;

  const series = buildSeries(ds, SERIES_LEN);

  return {
    ticketsCurrent,
    ticketsPrior,
    ticketsDelta,
    resolutionCurrent,
    resolutionPrior,
    resolutionDelta,
    ticketsSign,
    resolutionSign,
    isWarning,
    isCorrelating,
    series,
    windowKey,
    periodLabel: PERIOD_LABELS[windowKey],
    ready: true,
  };
}

export function useCustomerHealth(): CustomerHealthResult {
  const datasetId = useDatasetId();
  const windowKey = useWindowKey();
  const indexed = useIndexedMetrics();
  const ds = indexed[datasetId];

  return useMemo(() => {
    if (ds === undefined) return emptyResult(windowKey);
    return compute(ds, windowKey);
  }, [ds, windowKey]);
}

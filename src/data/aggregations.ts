import type { WindowKey } from "@/store/types";
import type { Direction, IndexedDataset, IndexedMetric } from "./schema";

/** Sum of valid values in [fromIdx, toIdxExclusive); reports nDays with data. */
export function sum(
  metric: IndexedMetric,
  fromIdx: number,
  toIdxExclusive: number,
): { total: number; nDays: number } {
  const lo = Math.max(0, fromIdx);
  const hi = Math.min(metric.values.length, toIdxExclusive);
  let total = 0;
  let nDays = 0;
  for (let i = lo; i < hi; i++) {
    if (metric.mask[i] === 1) {
      total += metric.values[i] as number;
      nDays++;
    }
  }
  return { total, nDays };
}

/** Weighted average sum(metric*weight)/sum(weight); excludes null/zero-weight days; null on zero denominator. */
export function weightedAvg(
  metric: IndexedMetric,
  weight: IndexedMetric,
  fromIdx: number,
  toIdxExclusive: number,
): number | null {
  const lo = Math.max(0, fromIdx);
  const hi = Math.min(metric.values.length, toIdxExclusive);
  let num = 0;
  let den = 0;
  for (let i = lo; i < hi; i++) {
    if (metric.mask[i] !== 1 || weight.mask[i] !== 1) continue;
    const w = weight.values[i] as number;
    if (w === 0) continue;
    const v = metric.values[i] as number;
    num += v * w;
    den += w;
  }
  if (den === 0) return null;
  return num / den;
}

/** Last valid value at or before atIdxInclusive; null if none found. */
export function lastValid(metric: IndexedMetric, atIdxInclusive: number): number | null {
  const start = Math.min(metric.values.length - 1, atIdxInclusive);
  for (let i = start; i >= 0; i--) {
    if (metric.mask[i] === 1) return metric.values[i] as number;
  }
  return null;
}

/** Period win rate: sum(won)/sum(won+lost); null if denominator 0. */
export function winRate(
  won: IndexedMetric,
  lost: IndexedMetric,
  fromIdx: number,
  toIdxExclusive: number,
): number | null {
  const w = sum(won, fromIdx, toIdxExclusive).total;
  const l = sum(lost, fromIdx, toIdxExclusive).total;
  const den = w + l;
  if (den === 0) return null;
  return w / den;
}

/** Period funnel rates computed as sum/sum per stage. */
export function funnelRates(
  ds: IndexedDataset,
  fromIdx: number,
  toIdxExclusive: number,
): {
  lead_rate: number | null;
  qualify_rate: number | null;
  deal_rate: number | null;
  close_rate: number | null;
} {
  const traffic = sum(ds.metrics.traffic, fromIdx, toIdxExclusive).total;
  const leads = sum(ds.metrics.leads_created, fromIdx, toIdxExclusive).total;
  const qualified = sum(ds.metrics.leads_qualified, fromIdx, toIdxExclusive).total;
  const dealsCreated = sum(ds.metrics.deals_created, fromIdx, toIdxExclusive).total;
  const dealsWon = sum(ds.metrics.deals_won, fromIdx, toIdxExclusive).total;
  return {
    lead_rate: traffic === 0 ? null : leads / traffic,
    qualify_rate: leads === 0 ? null : qualified / leads,
    deal_rate: qualified === 0 ? null : dealsCreated / qualified,
    close_rate: dealsCreated === 0 ? null : dealsWon / dealsCreated,
  };
}

/** Rolling mean of windowSize; first windowSize-1 entries are NaN; null inputs propagate as NaN. */
export function rolling(metric: IndexedMetric, windowSize: number): Float64Array {
  const N = metric.values.length;
  const out = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    if (i < windowSize - 1) {
      out[i] = NaN;
      continue;
    }
    let s = 0;
    let n = 0;
    let hasNull = false;
    for (let j = i - windowSize + 1; j <= i; j++) {
      if (metric.mask[j] === 1) {
        s += metric.values[j] as number;
        n++;
      } else {
        hasNull = true;
        break;
      }
    }
    out[i] = hasNull || n === 0 ? NaN : s / n;
  }
  return out;
}

/** Delta between current and prior; isNew=true iff prior===0 && current>0 (relative is null). */
export function delta(
  current: number | null,
  prior: number | null,
): { absolute: number | null; relative: number | null; isNew: boolean } {
  if (current === null || prior === null) {
    return { absolute: null, relative: null, isNew: false };
  }
  const absolute = current - prior;
  if (prior === 0 && current > 0) {
    return { absolute, relative: null, isNew: true };
  }
  if (prior === 0) {
    return { absolute, relative: null, isNew: false };
  }
  return { absolute, relative: absolute / prior, isNew: false };
}

/** Direction-aware delta sign per SDD §5.9; |delta|<0.01 is neutral. */
export function directionAwareSign(
  deltaValue: number,
  direction: Direction,
): "positive" | "negative" | "neutral" {
  if (Math.abs(deltaValue) < 0.01) return "neutral";
  const isGood =
    (deltaValue > 0 && direction === "higher_is_better") ||
    (deltaValue < 0 && direction === "lower_is_better");
  return isGood ? "positive" : "negative";
}

/** Returns current and prior window indices; null if not enough history or unsupported window. */
export function windowIndices(
  totalDays: number,
  window: WindowKey,
  todayIdx: number,
): { from: number; to: number; priorFrom: number; priorTo: number } | null {
  if (window === "7d" || window === "30d" || window === "90d" || window === "365d") {
    const size = window === "7d" ? 7 : window === "30d" ? 30 : window === "90d" ? 90 : 365;
    const to = todayIdx;
    const from = to - size;
    const priorTo = from;
    const priorFrom = priorTo - size;
    if (priorFrom < 0 || to > totalDays) return null;
    return { from, to, priorFrom, priorTo };
  }

  // MTD/QTD: TODO requires the dates array to compute calendar boundaries; not derivable from indices alone.
  return null;
}

function parseISODate(s: string): { y: number; m: number; d: number } | null {
  // Expecting yyyy-mm-dd; parse without timezone surprises.
  if (s.length < 10) return null;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return { y, m, d };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatISODate(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function daysInMonth(y: number, m: number): number {
  // m is 1..12
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Find index of first date >= target ISO date in a sorted dates array; returns dates.length if none. */
function findFirstIdxOnOrAfter(dates: string[], target: string): number {
  let lo = 0;
  let hi = dates.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const v = dates[mid];
    if (v !== undefined && v < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Like {@link windowIndices} but supports MTD/QTD by reading the actual dates.
 * `todayIdx` is exclusive (= dates.length when "today" is the last available day).
 * Returns priorFrom===priorTo===from when there is not enough prior history (caller decides).
 * Returns null only on invalid input (empty dates / todayIdx out of [1, dates.length]).
 */
export function windowIndicesByDate(
  dates: string[],
  windowKey: WindowKey,
  todayIdx: number,
): { from: number; to: number; priorFrom: number; priorTo: number; nDays: number } | null {
  const N = dates.length;
  if (N === 0) return null;
  if (todayIdx < 1 || todayIdx > N) return null;

  if (
    windowKey === "7d" ||
    windowKey === "30d" ||
    windowKey === "90d" ||
    windowKey === "365d"
  ) {
    const size = windowKey === "7d" ? 7 : windowKey === "30d" ? 30 : windowKey === "90d" ? 90 : 365;
    const to = todayIdx;
    const from = to - size;
    if (from < 0) return null;
    const priorTo = from;
    const priorFrom = priorTo - size;
    if (priorFrom < 0) {
      return { from, to, priorFrom: from, priorTo: from, nDays: size };
    }
    return { from, to, priorFrom, priorTo, nDays: size };
  }

  const lastDateStr = dates[todayIdx - 1];
  if (lastDateStr === undefined) return null;
  const last = parseISODate(lastDateStr);
  if (last === null) return null;

  let periodStartY: number;
  let periodStartM: number;

  if (windowKey === "MTD") {
    periodStartY = last.y;
    periodStartM = last.m;
  } else {
    // QTD: month 1, 4, 7, 10
    periodStartY = last.y;
    periodStartM = last.m - ((last.m - 1) % 3);
  }

  const periodStartIso = formatISODate(periodStartY, periodStartM, 1);
  const from = findFirstIdxOnOrAfter(dates, periodStartIso);
  const to = todayIdx;
  if (from >= to) {
    return { from: to, to, priorFrom: to, priorTo: to, nDays: 0 };
  }
  const nDays = to - from;

  // Prior period: same nDays, ending at the equivalent day of the previous period.
  let priorEndY: number;
  let priorEndM: number;
  let priorEndD: number;

  if (windowKey === "MTD") {
    priorEndY = periodStartM === 1 ? periodStartY - 1 : periodStartY;
    priorEndM = periodStartM === 1 ? 12 : periodStartM - 1;
    const dim = daysInMonth(priorEndY, priorEndM);
    priorEndD = Math.min(last.d, dim);
  } else {
    // QTD: prior = last nDays of previous quarter (ends at last day of prior quarter).
    if (periodStartM === 1) {
      priorEndY = periodStartY - 1;
      priorEndM = 12;
    } else {
      priorEndY = periodStartY;
      priorEndM = periodStartM - 1;
    }
    priorEndD = daysInMonth(priorEndY, priorEndM);
  }

  const priorEndIso = formatISODate(priorEndY, priorEndM, priorEndD);
  // priorTo is exclusive: index AFTER the priorEnd date.
  const priorEndIdx = findFirstIdxOnOrAfter(dates, priorEndIso);
  // If priorEndIdx within range and dates[priorEndIdx] equals priorEndIso → include it (exclusive +1).
  let priorTo: number;
  if (priorEndIdx < dates.length && dates[priorEndIdx] === priorEndIso) {
    priorTo = priorEndIdx + 1;
  } else {
    // dates[priorEndIdx] is the first date AFTER priorEndIso; exclusive bound is priorEndIdx itself.
    priorTo = priorEndIdx;
  }
  const priorFrom = priorTo - nDays;
  if (priorFrom < 0 || priorTo <= 0) {
    return { from, to, priorFrom: from, priorTo: from, nDays };
  }
  return { from, to, priorFrom, priorTo, nDays };
}

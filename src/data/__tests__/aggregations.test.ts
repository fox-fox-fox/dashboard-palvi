import { describe, it, expect } from "vitest";
import {
  sum,
  weightedAvg,
  lastValid,
  winRate,
  rolling,
  delta,
  directionAwareSign,
  windowIndices,
  windowIndicesByDate,
} from "../aggregations";
import type { IndexedMetric } from "../schema";

function makeMetric(values: ReadonlyArray<number | null>): IndexedMetric {
  const N = values.length;
  const arr = new Float64Array(N);
  const mask = new Uint8Array(N);
  let n = 0;
  for (let i = 0; i < N; i++) {
    const v = values[i];
    if (v === null || v === undefined) {
      arr[i] = NaN;
      mask[i] = 0;
    } else {
      arr[i] = v;
      mask[i] = 1;
      n++;
    }
  }
  return { values: arr, mask, n };
}

describe("sum", () => {
  it("ignores null values via mask", () => {
    const m = makeMetric([1, 2, null, 4, 5]);
    const result = sum(m, 0, 5);
    expect(result.total).toBe(12);
    expect(result.nDays).toBe(4);
  });

  it("respects window bounds", () => {
    const m = makeMetric([1, 2, 3, 4, 5]);
    const result = sum(m, 1, 4);
    expect(result.total).toBe(9);
    expect(result.nDays).toBe(3);
  });
});

describe("weightedAvg", () => {
  it("matches manual calculation", () => {
    const metric = makeMetric([10, 20, 30]);
    const weight = makeMetric([1, 2, 3]);
    // (10*1 + 20*2 + 30*3) / (1+2+3) = 140/6
    expect(weightedAvg(metric, weight, 0, 3)).toBeCloseTo(140 / 6, 10);
  });

  it("returns null when denominator is 0", () => {
    const metric = makeMetric([10, 20]);
    const weight = makeMetric([0, 0]);
    expect(weightedAvg(metric, weight, 0, 2)).toBeNull();
  });

  it("excludes days with weight 0", () => {
    const metric = makeMetric([100, 50]);
    const weight = makeMetric([0, 4]);
    expect(weightedAvg(metric, weight, 0, 2)).toBe(50);
  });

  it("excludes days where metric or weight is null", () => {
    const metric = makeMetric([10, null, 30]);
    const weight = makeMetric([1, 5, null]);
    // Only first day counts: 10*1/1 = 10
    expect(weightedAvg(metric, weight, 0, 3)).toBe(10);
  });
});

describe("lastValid", () => {
  it("finds last valid before index", () => {
    const m = makeMetric([1, 2, null, null]);
    expect(lastValid(m, 3)).toBe(2);
  });

  it("returns null when none found", () => {
    const m = makeMetric([null, null]);
    expect(lastValid(m, 1)).toBeNull();
  });
});

describe("winRate", () => {
  it("equals sum/sum, not mean of ratios", () => {
    const won = makeMetric([1, 9]);
    const lost = makeMetric([1, 1]);
    // Mean of ratios: (0.5 + 0.9)/2 = 0.7
    // Period rate: 10/12 ≈ 0.833
    expect(winRate(won, lost, 0, 2)).toBeCloseTo(10 / 12, 10);
  });

  it("returns null when no deals closed", () => {
    const won = makeMetric([0, 0]);
    const lost = makeMetric([0, 0]);
    expect(winRate(won, lost, 0, 2)).toBeNull();
  });
});

describe("delta", () => {
  it("flags isNew when prior=0 and current>0", () => {
    const result = delta(5, 0);
    expect(result.isNew).toBe(true);
    expect(result.relative).toBeNull();
    expect(result.absolute).toBe(5);
  });

  it("computes relative when prior > 0", () => {
    const result = delta(120, 100);
    expect(result.absolute).toBe(20);
    expect(result.relative).toBeCloseTo(0.2, 10);
    expect(result.isNew).toBe(false);
  });

  it("returns nulls when either side is null", () => {
    expect(delta(null, 5).absolute).toBeNull();
    expect(delta(5, null).absolute).toBeNull();
  });
});

describe("directionAwareSign", () => {
  it("positive delta + higher_is_better → positive", () => {
    expect(directionAwareSign(0.1, "higher_is_better")).toBe("positive");
  });
  it("negative delta + higher_is_better → negative", () => {
    expect(directionAwareSign(-0.1, "higher_is_better")).toBe("negative");
  });
  it("positive delta + lower_is_better → negative", () => {
    expect(directionAwareSign(0.1, "lower_is_better")).toBe("negative");
  });
  it("negative delta + lower_is_better → positive", () => {
    expect(directionAwareSign(-0.1, "lower_is_better")).toBe("positive");
  });
  it("|delta| < 0.01 → neutral", () => {
    expect(directionAwareSign(0.005, "higher_is_better")).toBe("neutral");
    expect(directionAwareSign(-0.005, "lower_is_better")).toBe("neutral");
  });
});

describe("rolling", () => {
  it("window 3 over [1,2,3,4,5] yields [NaN,NaN,2,3,4]", () => {
    const m = makeMetric([1, 2, 3, 4, 5]);
    const result = rolling(m, 3);
    expect(Number.isNaN(result[0] as number)).toBe(true);
    expect(Number.isNaN(result[1] as number)).toBe(true);
    expect(result[2] as number).toBeCloseTo(2, 10);
    expect(result[3] as number).toBeCloseTo(3, 10);
    expect(result[4] as number).toBeCloseTo(4, 10);
  });
});

describe("windowIndices", () => {
  it("computes 7d current and prior windows", () => {
    const r = windowIndices(365, "7d", 365);
    expect(r).not.toBeNull();
    expect(r).toEqual({ from: 358, to: 365, priorFrom: 351, priorTo: 358 });
  });

  it("returns null for MTD (TODO)", () => {
    expect(windowIndices(365, "MTD", 365)).toBeNull();
  });
});

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function generateDates(startISO: string, count: number): string[] {
  const [ys, ms, ds] = startISO.split("-");
  const out: string[] = [];
  let y = Number(ys);
  let m = Number(ms);
  let d = Number(ds);
  for (let i = 0; i < count; i++) {
    out.push(`${y}-${pad2(m)}-${pad2(d)}`);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + 1);
    y = date.getUTCFullYear();
    m = date.getUTCMonth() + 1;
    d = date.getUTCDate();
  }
  return out;
}

describe("windowIndicesByDate", () => {
  it("7d on 100-day series → from=93, to=100, prior=86..93, nDays=7", () => {
    const dates = generateDates("2025-01-01", 100);
    const r = windowIndicesByDate(dates, "7d", 100);
    expect(r).not.toBeNull();
    expect(r).toEqual({ from: 93, to: 100, priorFrom: 86, priorTo: 93, nDays: 7 });
  });

  it("MTD with last date 2026-04-25 spans April 1..25, prior = March 1..25", () => {
    // Generate 365 days starting 2025-04-26 (matches real dataset shape).
    const dates = generateDates("2025-04-26", 365);
    const todayIdx = dates.length; // last date is 2026-04-25
    expect(dates[todayIdx - 1]).toBe("2026-04-25");
    const r = windowIndicesByDate(dates, "MTD", todayIdx);
    expect(r).not.toBeNull();
    if (r === null) return;
    expect(dates[r.from]).toBe("2026-04-01");
    expect(r.to).toBe(todayIdx);
    expect(r.nDays).toBe(25);
    // Prior: March 1 to March 25 (25 days, ends at equivalent day of prior month).
    expect(dates[r.priorFrom]).toBe("2026-03-01");
    expect(dates[r.priorTo - 1]).toBe("2026-03-25");
    expect(r.priorTo - r.priorFrom).toBe(25);
  });

  it("QTD with last date 2026-04-25 spans Q2 start..25, prior = last 25 days of Q1", () => {
    const dates = generateDates("2025-04-26", 365);
    const todayIdx = dates.length;
    const r = windowIndicesByDate(dates, "QTD", todayIdx);
    expect(r).not.toBeNull();
    if (r === null) return;
    expect(dates[r.from]).toBe("2026-04-01");
    expect(r.to).toBe(todayIdx);
    expect(r.nDays).toBe(25);
    // Prior: last 25 days of Q1 → ends 2026-03-31.
    expect(dates[r.priorTo - 1]).toBe("2026-03-31");
    expect(r.priorTo - r.priorFrom).toBe(25);
    expect(dates[r.priorFrom]).toBe("2026-03-07");
  });

  it("returns null on invalid input", () => {
    expect(windowIndicesByDate([], "7d", 0)).toBeNull();
    const dates = generateDates("2025-01-01", 10);
    expect(windowIndicesByDate(dates, "7d", 0)).toBeNull();
    expect(windowIndicesByDate(dates, "7d", 11)).toBeNull();
  });

  it("returns empty prior range when not enough history", () => {
    const dates = generateDates("2025-01-01", 5);
    const r = windowIndicesByDate(dates, "MTD", 5);
    expect(r).not.toBeNull();
    if (r === null) return;
    // Prior would need history before 2025-01-01 → empty range falls back to from.
    expect(r.priorFrom).toBe(r.priorTo);
  });
});

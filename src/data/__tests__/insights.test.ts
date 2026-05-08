import { describe, it, expect } from "vitest";
import { computeInsights, topInsights } from "../insights";
import {
  METRIC_KEYS,
  type IndexedDataset,
  type IndexedMetric,
  type MetricKey,
} from "../schema";

/** Build a synthetic IndexedDataset of N days. valuesByMetric provides per-day values; missing keys default to 0. */
function makeFixture(
  N: number,
  valuesByMetric: Partial<Record<MetricKey, ReadonlyArray<number | null>>>,
  startDate: string = "2025-01-01",
): IndexedDataset {
  const dates = new Array<string>(N);
  const start = new Date(startDate + "T00:00:00Z").getTime();
  const dayMs = 86400000;
  for (let i = 0; i < N; i++) {
    const d = new Date(start + i * dayMs);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    dates[i] = `${y}-${m}-${day}`;
  }

  const metrics = {} as Record<MetricKey, IndexedMetric>;
  for (const key of METRIC_KEYS) {
    const values = new Float64Array(N);
    const mask = new Uint8Array(N);
    let n = 0;
    const provided = valuesByMetric[key];
    for (let i = 0; i < N; i++) {
      const v = provided !== undefined ? provided[i] ?? 0 : 0;
      if (v === null || v === undefined || Number.isNaN(v)) {
        values[i] = NaN;
        mask[i] = 0;
      } else {
        values[i] = v;
        mask[i] = 1;
        n++;
      }
    }
    metrics[key] = { values, mask, n };
  }

  return {
    id: "A",
    metadata: {
      start_date: dates[0] ?? "",
      end_date: dates[N - 1] ?? "",
      days: N,
      metrics: [],
    },
    dates,
    metrics,
    days: N,
  };
}

/** Constant-value array of length N. */
function rep(N: number, v: number): number[] {
  return new Array<number>(N).fill(v);
}

/** Stable baseline of 120 days (90d baseline + 30d prior + 30d current = 150). */
const N = 150;

describe("computeInsights — stale_deals_growing", () => {
  it("does not fire when stale_deals is flat", () => {
    const stale = rep(N, 50);
    const ds = makeFixture(N, {
      stale_deals: stale,
      deals_won: rep(N, 5),
      deals_lost: rep(N, 5),
    });
    const out = computeInsights(ds);
    expect(out.find((i) => i.key === "stale_deals_growing")).toBeUndefined();
  });

  it("fires when stale_deals grows by 15 in last 7 days", () => {
    const stale = rep(N, 50);
    // Last day is index N-1; "weekAgo" is N-8. Bump last day to 65.
    for (let i = N - 7; i < N; i++) stale[i] = 50 + (i - (N - 8));
    stale[N - 1] = 65;
    const ds = makeFixture(N, {
      stale_deals: stale,
      deals_won: rep(N, 5),
      deals_lost: rep(N, 5),
    });
    const out = computeInsights(ds);
    const ins = out.find((i) => i.key === "stale_deals_growing");
    expect(ins).toBeDefined();
    expect(ins?.severity).toBe("high");
    // 65 - 50 = 15 → magnitude = 1.5
    expect(ins?.magnitude).toBeCloseTo(1.5, 5);
  });
});

describe("computeInsights — win rate", () => {
  it("fires win_rate_dropped when win rate falls 20% relative", () => {
    // Prior 30d: 60% win rate (won=6, lost=4 per day for 30 days).
    // Current 30d: 45% (won=4.5, lost=5.5) — drop of 25%.
    const won = rep(N, 6);
    const lost = rep(N, 4);
    for (let i = N - 30; i < N; i++) {
      won[i] = 4;
      lost[i] = 6;
    }
    const ds = makeFixture(N, { deals_won: won, deals_lost: lost });
    const out = computeInsights(ds);
    const ins = out.find((i) => i.key === "win_rate_dropped");
    expect(ins).toBeDefined();
    expect(ins?.severity).toBe("high");
    expect(ins?.tone).toBe("negative");
  });

  it("fires win_rate_spike when win rate rises 30%+ relative", () => {
    // Prior: 40% (won=4, lost=6). Current: 60% (won=6, lost=4) → +50% relative.
    const won = rep(N, 4);
    const lost = rep(N, 6);
    for (let i = N - 30; i < N; i++) {
      won[i] = 6;
      lost[i] = 4;
    }
    const ds = makeFixture(N, { deals_won: won, deals_lost: lost });
    const out = computeInsights(ds);
    const ins = out.find((i) => i.key === "win_rate_spike");
    expect(ins).toBeDefined();
    expect(ins?.severity).toBe("medium");
    expect(ins?.tone).toBe("positive");
  });
});

describe("computeInsights — response time outlier", () => {
  it("fires when one day spikes far above the 30d median", () => {
    const rt = rep(N, 30);
    const leads = rep(N, 10);
    // Add small variance to baseline so MAD > 0 (otherwise the outlier rule no-ops by design).
    for (let i = 0; i < N; i++) rt[i] = 30 + ((i % 5) - 2);
    // Spike one day in last 30d to 300 min (10x median).
    rt[N - 5] = 300;
    const ds = makeFixture(N, {
      avg_response_time_min: rt,
      leads_created: leads,
      deals_won: rep(N, 5),
      deals_lost: rep(N, 5),
    });
    const out = computeInsights(ds);
    const ins = out.find((i) => i.key === "response_time_outlier");
    expect(ins).toBeDefined();
    expect(ins?.severity).toBe("medium");
    expect(ins?.magnitude).toBeGreaterThan(3);
  });
});

describe("computeInsights — stable dataset", () => {
  it("topInsights returns [] when nothing fires", () => {
    const ds = makeFixture(N, {
      traffic: rep(N, 100),
      leads_created: rep(N, 20),
      leads_qualified: rep(N, 10),
      deals_created: rep(N, 6),
      deals_won: rep(N, 3),
      deals_lost: rep(N, 3),
      avg_response_time_min: rep(N, 30),
      stale_deals: rep(N, 40),
      support_tickets_opened: rep(N, 5),
      support_avg_resolution_hours: rep(N, 4),
    });
    expect(topInsights(ds)).toEqual([]);
  });
});

describe("topInsights — ordering", () => {
  it("returns high-severity before medium-severity", () => {
    // Build: stale_deals_growing (high) + win_rate_spike (medium)
    const stale = rep(N, 50);
    stale[N - 1] = 80; // +30 in 7d → high
    const won = rep(N, 4);
    const lost = rep(N, 6);
    for (let i = N - 30; i < N; i++) {
      won[i] = 6;
      lost[i] = 4;
    }
    const ds = makeFixture(N, {
      stale_deals: stale,
      deals_won: won,
      deals_lost: lost,
    });
    const top = topInsights(ds);
    expect(top.length).toBeGreaterThanOrEqual(2);
    expect(top[0]?.severity).toBe("high");
    const sevs = top.map((t) => t.severity);
    // No "medium" before any "high".
    let seenMedium = false;
    for (const s of sevs) {
      if (s === "medium") seenMedium = true;
      if (s === "high") expect(seenMedium).toBe(false);
    }
  });

  it("respects the n parameter (default 3)", () => {
    const stale = rep(N, 50);
    stale[N - 1] = 80;
    const won = rep(N, 4);
    const lost = rep(N, 6);
    for (let i = N - 30; i < N; i++) {
      won[i] = 6;
      lost[i] = 4;
    }
    const rt = rep(N, 30);
    rt[N - 5] = 300;
    const ds = makeFixture(N, {
      stale_deals: stale,
      deals_won: won,
      deals_lost: lost,
      avg_response_time_min: rt,
      leads_created: rep(N, 10),
    });
    expect(topInsights(ds, 1).length).toBe(1);
    expect(topInsights(ds, 3).length).toBeLessThanOrEqual(3);
  });
});

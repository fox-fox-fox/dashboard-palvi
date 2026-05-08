import { describe, it, expect } from "vitest";
import { loadMetrics } from "../load";
import { indexAll } from "../transform";
import { lastValid, sum, weightedAvg, winRate } from "../aggregations";
import { topInsights } from "../insights";

const metrics = loadMetrics();
const indexed = indexAll(metrics);

describe("Dataset A — pipeline rotting (stale deals)", () => {
  const ds = indexed.A;
  const today = ds.days;

  it("stale_deals[today] - stale_deals[today-7] >= 10", () => {
    const todayVal = lastValid(ds.metrics.stale_deals, today - 1);
    const weekAgoVal = lastValid(ds.metrics.stale_deals, today - 8);
    expect(todayVal).not.toBeNull();
    expect(weekAgoVal).not.toBeNull();
    expect((todayVal as number) - (weekAgoVal as number)).toBeGreaterThanOrEqual(10);
  });

  it("stale_deals at last day >= 150", () => {
    const v = lastValid(ds.metrics.stale_deals, today - 1);
    expect(v).not.toBeNull();
    expect(v as number).toBeGreaterThanOrEqual(150);
  });
});

describe("Dataset B — stable", () => {
  const ds = indexed.B;
  const today = ds.days;
  const last30From = today - 30;
  const prior30From = today - 60;
  const prior30To = today - 30;

  it("response_time last30 vs prior30 |delta| < 0.20", () => {
    const last = weightedAvg(ds.metrics.avg_response_time_min, ds.metrics.leads_created, last30From, today);
    const prior = weightedAvg(ds.metrics.avg_response_time_min, ds.metrics.leads_created, prior30From, prior30To);
    expect(last).not.toBeNull();
    expect(prior).not.toBeNull();
    const rel = Math.abs(((last as number) - (prior as number)) / (prior as number));
    expect(rel).toBeLessThan(0.2);
  });

  it("win rate last30 vs prior30 |delta| < 0.20", () => {
    const last = winRate(ds.metrics.deals_won, ds.metrics.deals_lost, last30From, today);
    const prior = winRate(ds.metrics.deals_won, ds.metrics.deals_lost, prior30From, prior30To);
    expect(last).not.toBeNull();
    expect(prior).not.toBeNull();
    const rel = Math.abs(((last as number) - (prior as number)) / (prior as number));
    expect(rel).toBeLessThan(0.2);
  });
});

describe("Dataset C — win rate spike", () => {
  const ds = indexed.C;
  const today = ds.days;

  it("winRate(last30) / winRate(prior30) > 1.25", () => {
    const last = winRate(ds.metrics.deals_won, ds.metrics.deals_lost, today - 30, today);
    const prior = winRate(ds.metrics.deals_won, ds.metrics.deals_lost, today - 60, today - 30);
    expect(last).not.toBeNull();
    expect(prior).not.toBeNull();
    expect((last as number) / (prior as number)).toBeGreaterThan(1.25);
  });
});

describe("Dataset D — response time spike + outlier", () => {
  const ds = indexed.D;
  const today = ds.days;

  it("weighted response_time last30 / prior30 > 1.20", () => {
    const last = weightedAvg(
      ds.metrics.avg_response_time_min,
      ds.metrics.leads_created,
      today - 30,
      today,
    );
    const prior = weightedAvg(
      ds.metrics.avg_response_time_min,
      ds.metrics.leads_created,
      today - 60,
      today - 30,
    );
    expect(last).not.toBeNull();
    expect(prior).not.toBeNull();
    expect((last as number) / (prior as number)).toBeGreaterThan(1.2);
  });

  it("at least one day with response_time > 60 min (outlier)", () => {
    const m = ds.metrics.avg_response_time_min;
    let found = false;
    for (let i = 0; i < m.values.length; i++) {
      if (m.mask[i] === 1 && (m.values[i] as number) > 60) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });
});

it("sum sanity: traffic over full year is positive in all datasets", () => {
  for (const id of ["A", "B", "C", "D"] as const) {
    const ds = indexed[id];
    expect(sum(ds.metrics.traffic, 0, ds.days).total).toBeGreaterThan(0);
  }
});

describe("insights por dataset", () => {
  it("A: topInsights incluye stale_deals_growing (high)", () => {
    const top = topInsights(indexed.A);
    const ins = top.find((i) => i.key === "stale_deals_growing");
    expect(ins).toBeDefined();
    expect(ins?.severity).toBe("high");
  });

  it("B: topInsights tiene length <= 1 (dataset estable)", () => {
    const top = topInsights(indexed.B);
    expect(top.length).toBeLessThanOrEqual(1);
  });

  it("C: topInsights incluye win_rate_spike y/o funnel_breakthrough", () => {
    const top = topInsights(indexed.C);
    const hasSpike = top.some((i) => i.key === "win_rate_spike");
    const hasBreak = top.some((i) => i.key === "funnel_breakthrough");
    expect(hasSpike || hasBreak).toBe(true);
  });

  it("D: topInsights incluye response_time_spike y/o response_time_outlier", () => {
    const top = topInsights(indexed.D);
    const hasSpike = top.some((i) => i.key === "response_time_spike");
    const hasOutlier = top.some((i) => i.key === "response_time_outlier");
    expect(hasSpike || hasOutlier).toBe(true);
  });
});

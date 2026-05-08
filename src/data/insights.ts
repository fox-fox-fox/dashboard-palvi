import {
  funnelRates,
  lastValid,
  sum,
  weightedAvg,
  windowIndicesByDate,
} from "./aggregations";
import type { IndexedDataset, IndexedMetric, MetricKey } from "./schema";

export type InsightSeverity = "high" | "medium";
export type InsightTone = "negative" | "positive";
export type InsightKey =
  | "win_rate_dropped"
  | "win_rate_spike"
  | "response_time_spike"
  | "stale_deals_growing"
  | "funnel_choke"
  | "funnel_breakthrough"
  | "support_overload"
  | "lead_drought"
  | "response_time_outlier";

export interface Insight {
  key: InsightKey;
  severity: InsightSeverity;
  tone: InsightTone;
  title: string;
  description: string;
  metric?: MetricKey | "win_rate" | "funnel" | "stale_deals";
  magnitude: number;
}

type FunnelStepKey = "lead_rate" | "qualify_rate" | "deal_rate" | "close_rate";

const STEP_NAMES_ES: Record<FunnelStepKey, string> = {
  lead_rate: "Tráfico → Leads",
  qualify_rate: "Leads → Calificados",
  deal_rate: "Calificados → Deals",
  close_rate: "Deals → Ganados",
};

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

function signedPct(x: number): string {
  const v = x * 100;
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

/** Median of finite values (sorted copy). Returns null if empty. */
function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const arr = xs.slice().sort((a, b) => a - b);
  const mid = arr.length >> 1;
  if (arr.length % 2 === 1) return arr[mid] as number;
  return ((arr[mid - 1] as number) + (arr[mid] as number)) / 2;
}

/** Median Absolute Deviation: median(|x - median(x)|). */
function mad(xs: number[], med: number): number | null {
  if (xs.length === 0) return null;
  const dev = xs.map((v) => Math.abs(v - med));
  return median(dev);
}

function collectValid(
  metric: IndexedMetric,
  fromIdx: number,
  toIdxExclusive: number,
): { values: number[]; indices: number[] } {
  const values: number[] = [];
  const indices: number[] = [];
  const lo = Math.max(0, fromIdx);
  const hi = Math.min(metric.values.length, toIdxExclusive);
  for (let i = lo; i < hi; i++) {
    if (metric.mask[i] === 1) {
      values.push(metric.values[i] as number);
      indices.push(i);
    }
  }
  return { values, indices };
}

function relDelta(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return (current - prior) / prior;
}

export function computeInsights(ds: IndexedDataset): Insight[] {
  const win30 = windowIndicesByDate(ds.dates, "30d", ds.dates.length);
  if (win30 === null) return [];
  const { from, to, priorFrom, priorTo } = win30;
  // Need at least one full prior 30d window to compare.
  const hasPrior = priorTo > priorFrom;

  const insights: Insight[] = [];

  // 1 & 2. Win rate dropped / spike
  if (hasPrior) {
    const wonCur = sum(ds.metrics.deals_won, from, to).total;
    const lostCur = sum(ds.metrics.deals_lost, from, to).total;
    const wonPri = sum(ds.metrics.deals_won, priorFrom, priorTo).total;
    const lostPri = sum(ds.metrics.deals_lost, priorFrom, priorTo).total;
    const denCur = wonCur + lostCur;
    const denPri = wonPri + lostPri;
    if (denCur > 0 && denPri > 0) {
      const cur = wonCur / denCur;
      const pri = wonPri / denPri;
      const r = relDelta(cur, pri);
      if (r !== null) {
        if (r < -0.15) {
          insights.push({
            key: "win_rate_dropped",
            severity: "high",
            tone: "negative",
            title: "Win rate cayó",
            description: `Win rate de ${pct(cur)} vs ${pct(pri)} en período anterior (${signedPct(r)}). Revisar pipeline.`,
            metric: "win_rate",
            magnitude: Math.abs(r),
          });
        } else if (r > 0.25) {
          insights.push({
            key: "win_rate_spike",
            severity: "medium",
            tone: "positive",
            title: "Win rate al alza",
            description: `Win rate subió a ${pct(cur)} desde ${pct(pri)} (${signedPct(r)}). Identificar qué cambió y replicarlo.`,
            metric: "win_rate",
            magnitude: r,
          });
        }
      }
    }
  }

  // 3. Response time spike
  if (hasPrior) {
    const cur = weightedAvg(
      ds.metrics.avg_response_time_min,
      ds.metrics.leads_created,
      from,
      to,
    );
    const pri = weightedAvg(
      ds.metrics.avg_response_time_min,
      ds.metrics.leads_created,
      priorFrom,
      priorTo,
    );
    if (cur !== null && pri !== null && pri > 0) {
      const r = (cur - pri) / pri;
      if (r > 0.25) {
        insights.push({
          key: "response_time_spike",
          severity: "high",
          tone: "negative",
          title: "Tiempo de respuesta empeoró",
          description: `Promedio ponderado subió a ${cur.toFixed(1)} min (${signedPct(r)} vs período anterior). Cada minuto extra cuesta conversión.`,
          metric: "avg_response_time_min",
          magnitude: r,
        });
      }
    }
  }

  // 4. Stale deals growing
  {
    const todayIdx = to - 1;
    const cur = lastValid(ds.metrics.stale_deals, todayIdx);
    const weekAgo = lastValid(ds.metrics.stale_deals, todayIdx - 7);
    if (cur !== null && weekAgo !== null) {
      const absDelta = cur - weekAgo;
      if (absDelta >= 10) {
        insights.push({
          key: "stale_deals_growing",
          severity: "high",
          tone: "negative",
          title: "Deals atascados",
          description: `+${absDelta} deals atascados en 7 días (total: ${cur}). Pipeline necesita limpieza.`,
          metric: "stale_deals",
          magnitude: absDelta / 10,
        });
      }
    }
  }

  // 5 & 6. Funnel choke / breakthrough — baseline 90d previo a la ventana actual
  {
    const baseFrom = from - 90;
    const baseTo = from;
    if (baseFrom >= 0) {
      const cur = funnelRates(ds, from, to);
      const base = funnelRates(ds, baseFrom, baseTo);
      const steps: FunnelStepKey[] = [
        "lead_rate",
        "qualify_rate",
        "deal_rate",
        "close_rate",
      ];
      let worstNeg: { step: FunnelStepKey; rel: number; cur: number } | null = null;
      let bestPos: { step: FunnelStepKey; rel: number; cur: number } | null = null;
      for (const step of steps) {
        const c = cur[step];
        const b = base[step];
        if (c === null || b === null || b <= 0) continue;
        const r = (c - b) / b;
        if (r < -0.2) {
          if (worstNeg === null || r < worstNeg.rel) {
            worstNeg = { step, rel: r, cur: c };
          }
        } else if (r > 0.2) {
          if (bestPos === null || r > bestPos.rel) {
            bestPos = { step, rel: r, cur: c };
          }
        }
      }
      if (worstNeg !== null) {
        insights.push({
          key: "funnel_choke",
          severity: "high",
          tone: "negative",
          title: "Cuello en el embudo",
          description: `${STEP_NAMES_ES[worstNeg.step]}: cayó a ${pct(worstNeg.cur)} (${signedPct(worstNeg.rel)} vs baseline 90d). Revisar este paso.`,
          metric: "funnel",
          magnitude: Math.abs(worstNeg.rel),
        });
      }
      if (bestPos !== null) {
        insights.push({
          key: "funnel_breakthrough",
          severity: "medium",
          tone: "positive",
          title: "Embudo mejora",
          description: `${STEP_NAMES_ES[bestPos.step]}: subió a ${pct(bestPos.cur)} (${signedPct(bestPos.rel)} vs baseline 90d). Buen momento para reforzar.`,
          metric: "funnel",
          magnitude: bestPos.rel,
        });
      }
    }
  }

  // 7. Support overload
  if (hasPrior) {
    const tCur = sum(ds.metrics.support_tickets_opened, from, to).total;
    const tPri = sum(ds.metrics.support_tickets_opened, priorFrom, priorTo).total;
    const rCur = weightedAvg(
      ds.metrics.support_avg_resolution_hours,
      ds.metrics.support_tickets_opened,
      from,
      to,
    );
    const rPri = weightedAvg(
      ds.metrics.support_avg_resolution_hours,
      ds.metrics.support_tickets_opened,
      priorFrom,
      priorTo,
    );
    const tRel = tPri > 0 ? (tCur - tPri) / tPri : null;
    const rRel = rCur !== null && rPri !== null && rPri > 0 ? (rCur - rPri) / rPri : null;
    const ticketsTriggered = tRel !== null && tRel > 0.3;
    const resolutionTriggered = rRel !== null && rRel > 0.2;
    if (ticketsTriggered || resolutionTriggered) {
      const parts: string[] = [];
      if (ticketsTriggered) {
        parts.push(`tickets ${signedPct(tRel as number)} (${tCur} vs ${tPri})`);
      }
      if (resolutionTriggered) {
        parts.push(
          `resolución ${signedPct(rRel as number)} (${(rCur as number).toFixed(1)}h vs ${(rPri as number).toFixed(1)}h)`,
        );
      }
      const mag = Math.max(
        ticketsTriggered ? (tRel as number) : 0,
        resolutionTriggered ? (rRel as number) : 0,
      );
      insights.push({
        key: "support_overload",
        severity: "medium",
        tone: "negative",
        title: "Soporte saturado",
        description: `${parts.join(" · ")}. Soporte podría estar costando deals.`,
        magnitude: mag,
      });
    }
  }

  // 8. Lead drought — current 30d vs baseline 90d (previo a la ventana actual)
  {
    const baseFrom = from - 90;
    const baseTo = from;
    if (baseFrom >= 0) {
      const cur = sum(ds.metrics.leads_qualified, from, to).total;
      const base90 = sum(ds.metrics.leads_qualified, baseFrom, baseTo).total;
      // Normalizo baseline a 30 días equivalentes para comparación de magnitud.
      const baseNorm = base90 / 3;
      if (baseNorm > 0) {
        const r = (cur - baseNorm) / baseNorm;
        if (r < -0.25) {
          insights.push({
            key: "lead_drought",
            severity: "medium",
            tone: "negative",
            title: "Pocos leads calificados",
            description: `Leads calificados 30d (${cur}) vs baseline (${baseNorm.toFixed(0)}/30 días eq) caen ${signedPct(r)}.`,
            metric: "leads_qualified",
            magnitude: Math.abs(r),
          });
        }
      }
    }
  }

  // 9. Response time outlier — sobre la ventana 30d
  {
    const { values, indices } = collectValid(ds.metrics.avg_response_time_min, from, to);
    if (values.length >= 5) {
      const med = median(values);
      const m = med !== null ? mad(values, med) : null;
      if (med !== null && m !== null && m > 0) {
        const threshold = med + 3 * m;
        let worstIdx = -1;
        let worstVal = -Infinity;
        for (let k = 0; k < values.length; k++) {
          const v = values[k] as number;
          if (v > threshold && v > worstVal) {
            worstVal = v;
            worstIdx = indices[k] as number;
          }
        }
        if (worstIdx >= 0) {
          const date = ds.dates[worstIdx] ?? "";
          const magnitude = (worstVal - med) / m;
          insights.push({
            key: "response_time_outlier",
            severity: "medium",
            tone: "negative",
            title: "Día atípico de respuesta",
            description: `${date}: ${worstVal.toFixed(0)} min, ${magnitude.toFixed(1)}× MAD sobre la mediana. Investigar.`,
            metric: "avg_response_time_min",
            magnitude,
          });
        }
      }
    }
  }

  return insights;
}

const SEVERITY_RANK: Record<InsightSeverity, number> = { high: 0, medium: 1 };

export function topInsights(ds: IndexedDataset, n: number = 3): Insight[] {
  const all = computeInsights(ds);
  all.sort((a, b) => {
    const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (sev !== 0) return sev;
    return b.magnitude - a.magnitude;
  });
  return all.slice(0, n);
}

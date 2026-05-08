import {
  METRIC_KEYS,
  type Dataset,
  type DatasetId,
  type IndexedDataset,
  type IndexedMetric,
  type IndexedMetrics,
  type MetricKey,
  type Metrics,
} from "./schema";

export function indexDataset(dataset: Dataset, id: DatasetId): IndexedDataset {
  const N = dataset.days.length;
  const dates: string[] = new Array<string>(N);
  const metrics = {} as Record<MetricKey, IndexedMetric>;

  for (const key of METRIC_KEYS) {
    metrics[key] = {
      values: new Float64Array(N),
      mask: new Uint8Array(N),
      n: 0,
    };
  }

  for (let i = 0; i < N; i++) {
    const day = dataset.days[i];
    if (!day) continue;
    dates[i] = day.date;
    for (const key of METRIC_KEYS) {
      const v = day.metrics[key];
      const m = metrics[key];
      if (v === null || v === undefined || Number.isNaN(v)) {
        m.values[i] = NaN;
        m.mask[i] = 0;
      } else {
        m.values[i] = v;
        m.mask[i] = 1;
        m.n++;
      }
    }
  }

  return {
    id,
    metadata: dataset.metadata,
    dates,
    metrics,
    days: N,
  };
}

export function indexAll(metrics: Metrics): IndexedMetrics {
  return {
    A: indexDataset(metrics.A, "A"),
    B: indexDataset(metrics.B, "B"),
    C: indexDataset(metrics.C, "C"),
    D: indexDataset(metrics.D, "D"),
  };
}

export type Direction = "higher_is_better" | "lower_is_better";

export type MetricKey =
  | "traffic"
  | "leads_created"
  | "leads_qualified"
  | "deals_created"
  | "deals_won"
  | "deals_lost"
  | "avg_response_time_min"
  | "avg_deal_cycle_days"
  | "stale_deals"
  | "support_tickets_opened"
  | "support_avg_resolution_hours";

export interface MetricMeta {
  key: MetricKey;
  label: string;
  unit: string;
  direction: Direction;
  description: string;
}

export interface DayRecord {
  date: string;
  metrics: Record<MetricKey, number | null>;
}

export interface Dataset {
  metadata: {
    start_date: string;
    end_date: string;
    days: number;
    metrics: MetricMeta[];
  };
  days: DayRecord[];
}

export type DatasetId = "A" | "B" | "C" | "D";
export type Metrics = Record<DatasetId, Dataset>;

export interface IndexedMetric {
  values: Float64Array;
  mask: Uint8Array;
  n: number;
}

export interface IndexedDataset {
  id: DatasetId;
  metadata: Dataset["metadata"];
  dates: string[];
  metrics: Record<MetricKey, IndexedMetric>;
  days: number;
}

export type IndexedMetrics = Record<DatasetId, IndexedDataset>;

export const METRIC_KEYS: readonly MetricKey[] = [
  "traffic",
  "leads_created",
  "leads_qualified",
  "deals_created",
  "deals_won",
  "deals_lost",
  "avg_response_time_min",
  "avg_deal_cycle_days",
  "stale_deals",
  "support_tickets_opened",
  "support_avg_resolution_hours",
] as const;

export const DATASET_IDS: readonly DatasetId[] = ["A", "B", "C", "D"] as const;

import rawData from "./metrics.json";
import {
  DATASET_IDS,
  METRIC_KEYS,
  type Dataset,
  type DatasetId,
  type Metrics,
} from "./schema";

function fail(reason: string): never {
  throw new Error(`metrics.json invalid: ${reason}`);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateDataset(id: DatasetId, value: unknown): Dataset {
  if (!isObject(value)) fail(`dataset ${id} is not an object`);
  const metadata = value["metadata"];
  const days = value["days"];
  if (!isObject(metadata)) fail(`dataset ${id} missing metadata`);
  if (!Array.isArray(days)) fail(`dataset ${id} missing days array`);
  const metricsMeta = metadata["metrics"];
  if (!Array.isArray(metricsMeta)) fail(`dataset ${id} missing metadata.metrics`);
  const expectedDays = metadata["days"];
  if (typeof expectedDays !== "number") fail(`dataset ${id} metadata.days is not a number`);
  if (days.length !== expectedDays) {
    fail(`dataset ${id} days.length (${days.length}) !== metadata.days (${expectedDays})`);
  }
  if (metricsMeta.length !== METRIC_KEYS.length) {
    fail(`dataset ${id} metadata.metrics has ${metricsMeta.length} entries, expected ${METRIC_KEYS.length}`);
  }
  return value as unknown as Dataset;
}

export function loadMetrics(): Metrics {
  if (!isObject(rawData)) fail("root is not an object");
  const result: Partial<Metrics> = {};
  for (const id of DATASET_IDS) {
    if (!(id in rawData)) fail(`missing dataset ${id}`);
    result[id] = validateDataset(id, (rawData as Record<string, unknown>)[id]);
  }
  return result as Metrics;
}

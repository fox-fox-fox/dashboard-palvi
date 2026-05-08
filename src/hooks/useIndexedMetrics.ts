import { loadMetrics } from "@/data/load";
import { indexAll } from "@/data/transform";
import type { IndexedMetrics } from "@/data/schema";

let cache: IndexedMetrics | null = null;

function getIndexedMetrics(): IndexedMetrics {
  if (cache === null) {
    cache = indexAll(loadMetrics());
  }
  return cache;
}

export function useIndexedMetrics(): IndexedMetrics {
  return getIndexedMetrics();
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { topInsights } from "@/data/insights";
import type { Insight, InsightKey } from "@/data/insights";
import { useDatasetId } from "@/store/useAppStore";
import { useIndexedMetrics } from "./useIndexedMetrics";

export interface InsightsResult {
  insights: Insight[];
  empty: boolean;
  ready: boolean;
  dismiss: (key: InsightKey) => void;
  reset: () => void;
}

const VISIBLE_LIMIT = 3;
const FETCH_LIMIT = 5;

export function useInsights(): InsightsResult {
  const datasetId = useDatasetId();
  const indexed = useIndexedMetrics();
  const ds = indexed[datasetId];

  const [dismissed, setDismissed] = useState<Set<InsightKey>>(() => new Set());

  useEffect(() => {
    setDismissed(new Set());
  }, [datasetId]);

  const all = useMemo<Insight[]>(() => {
    if (ds === undefined) return [];
    return topInsights(ds, FETCH_LIMIT);
  }, [ds]);

  const filtered = useMemo<Insight[]>(() => {
    return all.filter((i) => !dismissed.has(i.key)).slice(0, VISIBLE_LIMIT);
  }, [all, dismissed]);

  const dismiss = useCallback((key: InsightKey) => {
    setDismissed((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setDismissed(new Set());
  }, []);

  return {
    insights: filtered,
    empty: filtered.length === 0,
    ready: ds !== undefined,
    dismiss,
    reset,
  };
}

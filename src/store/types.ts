import type { DatasetId } from "@/data/schema";

export type WindowKey = "7d" | "30d" | "90d" | "MTD" | "QTD" | "365d";
export type Theme = "light" | "dark" | "system";

export interface AppState {
  datasetId: DatasetId;
  windowKey: WindowKey;
  theme: Theme;
  setDataset: (id: DatasetId) => void;
  setWindow: (key: WindowKey) => void;
  setTheme: (theme: Theme) => void;
}

export const WINDOW_KEYS: readonly WindowKey[] = [
  "7d",
  "30d",
  "90d",
  "MTD",
  "QTD",
  "365d",
] as const;
export const DEFAULT_WINDOW: WindowKey = "30d";
export const DEFAULT_DATASET: DatasetId = "A";
export const DEFAULT_THEME: Theme = "system";

import { DATASET_IDS, type DatasetId } from "@/data/schema";
import {
  DEFAULT_DATASET,
  DEFAULT_THEME,
  DEFAULT_WINDOW,
  WINDOW_KEYS,
  type Theme,
  type WindowKey,
} from "./types";

const STORAGE_KEY = "palvi-prefs-v1";
const THEMES: readonly Theme[] = ["light", "dark", "system"] as const;

function isDatasetId(value: unknown): value is DatasetId {
  return typeof value === "string" && (DATASET_IDS as readonly string[]).includes(value);
}

function isWindowKey(value: unknown): value is WindowKey {
  return typeof value === "string" && (WINDOW_KEYS as readonly string[]).includes(value);
}

function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

export function readURL(): { datasetId?: DatasetId; windowKey?: WindowKey } {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const ds = params.get("ds");
  const range = params.get("range");
  const out: { datasetId?: DatasetId; windowKey?: WindowKey } = {};
  if (isDatasetId(ds)) out.datasetId = ds;
  if (isWindowKey(range)) out.windowKey = range;
  return out;
}

export function writeURL(state: { datasetId: DatasetId; windowKey: WindowKey }): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("ds", state.datasetId);
    url.searchParams.set("range", state.windowKey);
    window.history.replaceState(null, "", url.toString());
  } catch {
    console.warn("[palvi] writeURL failed");
  }
}

export function readLocalStorage(): {
  datasetId?: DatasetId;
  windowKey?: WindowKey;
  theme?: Theme;
} {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const obj = parsed as Record<string, unknown>;
    const out: { datasetId?: DatasetId; windowKey?: WindowKey; theme?: Theme } = {};
    if (isDatasetId(obj.datasetId)) out.datasetId = obj.datasetId;
    if (isWindowKey(obj.windowKey)) out.windowKey = obj.windowKey;
    if (isTheme(obj.theme)) out.theme = obj.theme;
    return out;
  } catch {
    return {};
  }
}

export function writeLocalStorage(state: {
  datasetId: DatasetId;
  windowKey: WindowKey;
  theme: Theme;
}): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // private mode or quota — silent
  }
}

export function loadInitialState(): {
  datasetId: DatasetId;
  windowKey: WindowKey;
  theme: Theme;
} {
  const stored = readLocalStorage();
  const url = readURL();
  return {
    datasetId: url.datasetId ?? stored.datasetId ?? DEFAULT_DATASET,
    windowKey: url.windowKey ?? stored.windowKey ?? DEFAULT_WINDOW,
    theme: stored.theme ?? DEFAULT_THEME,
  };
}

import { create } from "zustand";
import type { DatasetId } from "@/data/schema";
import { loadInitialState, writeLocalStorage, writeURL } from "./persistence";
import type { AppState, Theme, WindowKey } from "./types";

const initial = loadInitialState();

export const useAppStore = create<AppState>((set, get) => ({
  datasetId: initial.datasetId,
  windowKey: initial.windowKey,
  theme: initial.theme,
  setDataset: (id: DatasetId) => {
    set({ datasetId: id });
    const { windowKey, theme } = get();
    writeURL({ datasetId: id, windowKey });
    writeLocalStorage({ datasetId: id, windowKey, theme });
  },
  setWindow: (key: WindowKey) => {
    set({ windowKey: key });
    const { datasetId, theme } = get();
    writeURL({ datasetId, windowKey: key });
    writeLocalStorage({ datasetId, windowKey: key, theme });
  },
  setTheme: (theme: Theme) => {
    set({ theme });
    const { datasetId, windowKey } = get();
    writeLocalStorage({ datasetId, windowKey, theme });
  },
}));

export const useDatasetId = () => useAppStore((s) => s.datasetId);
export const useWindowKey = () => useAppStore((s) => s.windowKey);
export const useTheme = () => useAppStore((s) => s.theme);

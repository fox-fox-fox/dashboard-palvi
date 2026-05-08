import { useDatasetId, useWindowKey } from "@/store/useAppStore";
import { useIndexedMetrics } from "@/hooks/useIndexedMetrics";
import { DatasetSwitcher } from "./DatasetSwitcher";
import { WindowSelector } from "./WindowSelector";
import { ThemeToggle } from "./ThemeToggle";

const MONTHS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

function formatShortSpanish(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "—";
  const year = match[1];
  const monthIdx = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (monthIdx < 0 || monthIdx > 11 || Number.isNaN(day)) return "—";
  const month = MONTHS_ES[monthIdx];
  if (!month) return "—";
  return `${day} ${month} ${year}`;
}

export function Header() {
  const datasetId = useDatasetId();
  const windowKey = useWindowKey();
  const indexed = useIndexedMetrics();
  const ds = indexed[datasetId];
  const lastDate = ds.dates[ds.dates.length - 1] ?? "";
  const formatted = lastDate ? formatShortSpanish(lastDate) : "";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 md:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between md:gap-6">
            <div className="flex flex-col">
              <span className="font-mono text-caption text-text-subtle">PALVI</span>
              <h1 className="text-small font-medium text-text-muted">Reporte Ejecutivo</h1>
            </div>
            <div className="md:hidden">
              <ThemeToggle />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <DatasetSwitcher />
            <WindowSelector />
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
          </div>
        </div>

        <div className="mt-2 text-caption text-text-subtle">
          {formatted ? `Hoy ${formatted} · ` : ""}Dataset {datasetId} · {windowKey}
        </div>
      </div>
    </header>
  );
}

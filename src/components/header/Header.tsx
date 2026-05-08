import { BarChart3, Calendar } from "lucide-react";
import { useDatasetId } from "@/store/useAppStore";
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

const WEEKDAYS_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const;

function formatLongSpanish(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "—";
  const year = match[1];
  const monthIdx = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (monthIdx < 0 || monthIdx > 11 || Number.isNaN(day)) return "—";
  const month = MONTHS_ES[monthIdx];
  if (!month) return "—";
  const date = new Date(`${iso}T00:00:00`);
  const weekday = WEEKDAYS_ES[date.getUTCDay()] ?? "";
  return weekday ? `${weekday} · ${day} ${month} ${year}` : `${day} ${month} ${year}`;
}

export function Header() {
  const datasetId = useDatasetId();
  const indexed = useIndexedMetrics();
  const ds = indexed[datasetId];
  const lastDate = ds.dates[ds.dates.length - 1] ?? "";
  const formatted = lastDate ? formatLongSpanish(lastDate) : "—";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur-md shadow-sm">
      {/* Top accent stripe — marca visual de identidad */}
      <div
        aria-hidden="true"
        className="h-1 bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-500"
      />

      <div className="mx-auto max-w-7xl px-4 py-3 md:px-8 md:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          {/* Brand block */}
          <div className="flex items-center justify-between gap-3 lg:justify-start">
            <div className="flex items-center gap-3">
              <div
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-md ring-2 ring-indigo-500/30"
              >
                <BarChart3 size={22} strokeWidth={2.25} />
              </div>
              <div className="flex flex-col leading-tight">
                <h1 className="text-h1 font-bold tracking-tight text-text">PALVI</h1>
                <p className="text-small text-text-muted">Reporte ejecutivo de ventas</p>
              </div>
            </div>
            {/* Theme toggle visible junto al brand solo en mobile/tablet */}
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
          </div>

          {/* Controles a la derecha */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 lg:flex-nowrap lg:justify-end">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3 py-1.5 text-small shadow-sm">
              <Calendar size={14} className="text-text-muted" aria-hidden="true" />
              <span className="font-medium tabular-nums text-text">{formatted}</span>
            </div>
            <DatasetSwitcher />
            <WindowSelector />
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

import type { KPIDetailStats } from "@/hooks/useKPIDetail";

const MONTH_NAMES_ES = [
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
  if (iso.length < 10) return iso;
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  if (!Number.isFinite(m) || !Number.isFinite(d) || m < 1 || m > 12) return iso;
  const monthName = MONTH_NAMES_ES[m - 1] ?? "";
  return `${d} ${monthName}`;
}

interface StatsBreakdownProps {
  stats: KPIDetailStats;
  format: (n: number | null) => string;
}

interface StatTileProps {
  caption: string;
  value: string;
  subCaption: string;
}

function StatTile({ caption, value, subCaption }: StatTileProps) {
  return (
    <div className="rounded-lg border border-border-strong bg-surface-2 dark:bg-surface p-4">
      <div className="text-caption uppercase tracking-wide text-text-muted">
        {caption}
      </div>
      <div className="mt-2 text-h2 font-semibold tabular-nums text-text">
        {value}
      </div>
      <div className="mt-1 text-small tabular-nums text-text-subtle">
        {subCaption}
      </div>
    </div>
  );
}

export function StatsBreakdown({ stats, format }: StatsBreakdownProps) {
  const bestValue = stats.bestDay === null ? format(null) : format(stats.bestDay.value);
  const worstValue =
    stats.worstDay === null ? format(null) : format(stats.worstDay.value);
  const avgValue = format(stats.average);

  const bestDate =
    stats.bestDay === null ? "—" : formatShortSpanish(stats.bestDay.date);
  const worstDate =
    stats.worstDay === null ? "—" : formatShortSpanish(stats.worstDay.date);
  const avgSub = stats.nDays > 0 ? `${stats.nDays} días con dato` : "—";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatTile caption="Mejor día" value={bestValue} subCaption={bestDate} />
      <StatTile caption="Peor día" value={worstValue} subCaption={worstDate} />
      <StatTile caption="Promedio" value={avgValue} subCaption={avgSub} />
    </div>
  );
}

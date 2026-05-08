import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { KPIDetailPoint, KPIDetailStats } from "@/hooks/useKPIDetail";
import { cn } from "@/utils/cn";

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

function formatShortDate(iso: string): string {
  if (iso.length < 10) return iso;
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  if (!Number.isFinite(m) || !Number.isFinite(d) || m < 1 || m > 12) return iso;
  const monthName = MONTH_NAMES_ES[m - 1] ?? "";
  return `${d} ${monthName}`;
}

function pickTickIndices(len: number, count: number): number[] {
  if (len <= count) {
    const out: number[] = new Array<number>(len);
    for (let i = 0; i < len; i++) out[i] = i;
    return out;
  }
  const out: number[] = new Array<number>(count);
  for (let i = 0; i < count; i++) {
    out[i] = Math.round((i * (len - 1)) / (count - 1));
  }
  return out;
}

interface ChartDatum {
  date: string;
  label: string;
  value: number | null;
}

interface Chart90Props {
  data: KPIDetailPoint[];
  stats: KPIDetailStats;
  format: (n: number | null) => string;
}

interface HoverInfo {
  date: string;
  value: number | null;
}

interface ChartMouseEvent {
  activePayload?: Array<{ payload?: ChartDatum }>;
}

function extractHover(e: ChartMouseEvent): HoverInfo | null {
  const first = e.activePayload?.[0];
  const datum = first?.payload;
  if (datum === undefined) return null;
  return { date: datum.label, value: datum.value };
}

export function Chart90({ data, stats, format }: Chart90Props) {
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const chartData = useMemo<ChartDatum[]>(
    () =>
      data.map((p) => ({
        date: p.date,
        label: formatShortDate(p.date),
        value: p.value,
      })),
    [data],
  );

  const tickLabels = useMemo(() => {
    const indices = pickTickIndices(chartData.length, 5);
    return indices.map((i) => chartData[i]?.label ?? "");
  }, [chartData]);

  const bestLabel =
    stats.bestDay === null ? null : formatShortDate(stats.bestDay.date);
  const worstLabel =
    stats.worstDay === null ? null : formatShortDate(stats.worstDay.date);

  return (
    <div aria-label="Tendencia de los últimos 90 días">
      <div className="relative h-12 mb-1">
        <div
          className={cn(
            "pointer-events-none absolute left-1/2 top-0 -translate-x-1/2",
            "transition-opacity duration-150 motion-reduce:transition-none",
            hover ? "opacity-100" : "opacity-0",
          )}
          aria-hidden="true"
        >
          <div className="rounded-md border border-border-strong bg-surface px-3 py-2 shadow-md">
            {hover && (
              <>
                <div className="font-mono text-caption text-text-subtle">
                  {hover.date}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2 w-2 rounded-sm"
                    style={{ background: "rgb(var(--color-accent))" }}
                  />
                  <span className="text-small font-medium tabular-nums text-text">
                    {format(hover.value)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          onMouseMove={(e: ChartMouseEvent) => {
            if (e?.activePayload && e.activePayload.length > 0) {
              setHover(extractHover(e));
            }
          }}
          onMouseLeave={() => setHover(null)}
        >
          <CartesianGrid
            stroke="rgb(var(--color-border))"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            ticks={tickLabels}
            interval="preserveStartEnd"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "rgb(var(--color-text-subtle))", fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={36}
            tick={{ fill: "rgb(var(--color-text-subtle))", fontSize: 11 }}
            allowDecimals={false}
          />
          <Tooltip
            content={() => null}
            cursor={{ stroke: "rgb(var(--color-border-strong))", strokeDasharray: "3 3" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="rgb(var(--color-accent))"
            fill="rgb(var(--color-accent))"
            fillOpacity={0.12}
            strokeWidth={1.5}
            connectNulls={false}
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 3 }}
          />
          {bestLabel !== null && stats.bestDay !== null && (
            <ReferenceDot
              x={bestLabel}
              y={stats.bestDay.value}
              r={4}
              fill="rgb(var(--color-positive))"
              stroke="rgb(var(--color-surface))"
              strokeWidth={1.5}
              isFront
            />
          )}
          {worstLabel !== null && stats.worstDay !== null && (
            <ReferenceDot
              x={worstLabel}
              y={stats.worstDay.value}
              r={4}
              fill="rgb(var(--color-negative))"
              stroke="rgb(var(--color-surface))"
              strokeWidth={1.5}
              isFront
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

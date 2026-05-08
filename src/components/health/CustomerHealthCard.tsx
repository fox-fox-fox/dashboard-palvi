import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, Skeleton } from "@/components/ui";
import { DirectionAwareBadge } from "@/components/kpi";
import {
  useCustomerHealth,
  type CustomerHealthSeriesPoint,
} from "@/hooks/useCustomerHealth";
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
  // yyyy-mm-dd → "abr 25"
  if (iso.length < 10) return iso;
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  if (!Number.isFinite(m) || !Number.isFinite(d) || m < 1 || m > 12) return iso;
  const monthName = MONTH_NAMES_ES[m - 1] ?? "";
  return `${monthName} ${d}`;
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
  tickets: number | null;
  dealsLost: number | null;
}

function buildChartData(series: CustomerHealthSeriesPoint[]): ChartDatum[] {
  return series.map((p) => ({
    date: p.date,
    label: formatShortDate(p.date),
    tickets: p.tickets,
    dealsLost: p.dealsLost,
  }));
}

interface HoverInfo {
  date: string;
  tickets: number | null;
  dealsLost: number | null;
}

interface ChartMouseEvent {
  activePayload?: Array<{ payload?: ChartDatum }>;
}

function extractHover(e: ChartMouseEvent): HoverInfo | null {
  const first = e.activePayload?.[0];
  const datum = first?.payload;
  if (datum === undefined) return null;
  return {
    date: datum.label,
    tickets: datum.tickets,
    dealsLost: datum.dealsLost,
  };
}

function HealthSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton variant="text" width="40%" height={20} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton variant="rect" height={88} />
        <Skeleton variant="rect" height={88} />
      </div>
      <Skeleton variant="rect" height={200} />
    </div>
  );
}

export function CustomerHealthCard() {
  const health = useCustomerHealth();
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const chartData = useMemo(() => buildChartData(health.series), [health.series]);
  const tickIndices = useMemo(
    () => pickTickIndices(chartData.length, 5),
    [chartData.length],
  );
  const tickLabels = useMemo(
    () => tickIndices.map((i) => chartData[i]?.label ?? ""),
    [tickIndices, chartData],
  );

  const ticketsLabel = `Tickets abiertos · ${health.periodLabel}`;
  const resolutionLabel = `Resolución promedio · ${health.periodLabel}`;

  const resolutionDisplay =
    health.resolutionCurrent === null
      ? "—"
      : `${health.resolutionCurrent.toFixed(1)} h`;

  return (
    <Card padded as="section" aria-label="Salud del cliente">
      <div className="flex flex-col gap-4">
        <header className="relative flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-h2 font-semibold text-text">Salud del cliente</h2>
            <span className="text-caption text-text-muted">{health.periodLabel}</span>
          </div>
          <div
            className={cn(
              "pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2",
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
                  <div className="mt-1 flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="inline-block h-2 w-2 rounded-sm"
                        style={{ background: "rgb(var(--color-warning))" }}
                      />
                      <span className="text-small text-text-muted">Tickets:</span>
                      <span className="text-small font-medium tabular-nums text-text">
                        {hover.tickets ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="inline-block h-2 w-2 rounded-sm"
                        style={{ background: "rgb(var(--color-negative))" }}
                      />
                      <span className="text-small text-text-muted">
                        Deals perdidos:
                      </span>
                      <span className="text-small font-medium tabular-nums text-text">
                        {hover.dealsLost ?? "—"}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {!health.ready ? (
          <HealthSkeleton />
        ) : (
          <>
            {health.isCorrelating && (
              <div
                role="note"
                className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-small text-text"
              >
                <AlertTriangle
                  size={16}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-warning"
                />
                <span>
                  Tickets y deals perdidos suben juntos. Soporte podría estar costando
                  deals.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="text-caption text-text-muted">{ticketsLabel}</span>
                <span className="text-display font-semibold tabular-nums text-text">
                  {health.ticketsCurrent}
                </span>
                <div>
                  <DirectionAwareBadge
                    delta={health.ticketsDelta}
                    sign={health.ticketsSign}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-caption text-text-muted">{resolutionLabel}</span>
                <span className="text-display font-semibold tabular-nums text-text">
                  {resolutionDisplay}
                </span>
                <div>
                  <DirectionAwareBadge
                    delta={health.resolutionDelta}
                    sign={health.resolutionSign}
                  />
                </div>
              </div>
            </div>

            <div
              className="h-[200px] w-full"
              aria-label="Tendencia de tickets y deals perdidos en los últimos 30 días"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
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
                    yAxisId="tickets"
                    orientation="left"
                    tickLine={false}
                    axisLine={false}
                    width={32}
                    tick={{ fill: "rgb(var(--color-text-subtle))", fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <YAxis
                    yAxisId="lost"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    width={32}
                    tick={{ fill: "rgb(var(--color-text-subtle))", fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={() => null}
                    cursor={{ fill: "rgb(var(--color-surface-2))", opacity: 0.4 }}
                  />
                  <Bar
                    yAxisId="tickets"
                    dataKey="tickets"
                    fill="rgb(var(--color-warning))"
                    radius={[2, 2, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="lost"
                    type="monotone"
                    dataKey="dealsLost"
                    stroke="rgb(var(--color-negative))"
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

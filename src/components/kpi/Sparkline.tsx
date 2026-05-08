interface SparklineProps {
  data: number[];
  height?: number;
  ariaLabel?: string;
  tone?: "neutral" | "positive" | "negative" | "warning";
}

const toneToColor: Record<NonNullable<SparklineProps["tone"]>, string> = {
  neutral: "rgb(var(--color-text-muted))",
  positive: "rgb(var(--color-positive))",
  negative: "rgb(var(--color-negative))",
  warning: "rgb(var(--color-warning))",
};

export function Sparkline({
  data,
  height = 36,
  ariaLabel,
  tone = "neutral",
}: SparklineProps) {
  const validCount = data.reduce((acc, v) => (Number.isFinite(v) ? acc + 1 : acc), 0);

  if (data.length < 2 || validCount < 2) {
    return (
      <div
        role="img"
        aria-label={ariaLabel ?? "Sin datos suficientes para graficar"}
        style={{ height }}
        className="w-full"
      />
    );
  }

  const width = 100;
  const finiteValues = data.filter((v) => Number.isFinite(v));
  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);
  const range = max - min || 1;

  // Padding vertical para que línea no toque bordes.
  const padY = 2;
  const innerH = height - padY * 2;
  const stepX = width / (data.length - 1);

  // Construir path con gaps: cuando hay NaN, romper con un nuevo M.
  const segments: string[] = [];
  let openSegment = false;
  type Pt = { x: number; y: number };
  const pts: Array<Pt | null> = data.map((v, i) => {
    if (!Number.isFinite(v)) return null;
    const x = i * stepX;
    const y = padY + (1 - (v - min) / range) * innerH;
    return { x, y };
  });

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (p == null) {
      openSegment = false;
      continue;
    }
    if (!openSegment) {
      segments.push(`M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
      openSegment = true;
    } else {
      segments.push(`L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
    }
  }
  const linePath = segments.join(" ");

  // Área: cada subsegmento contiguo cerrado al baseline.
  const baseline = height;
  const areaParts: string[] = [];
  let runStart: number | null = null;
  const flushRun = (endIdx: number) => {
    if (runStart == null) return;
    const sub = pts.slice(runStart, endIdx + 1).filter((p): p is Pt => p != null);
    if (sub.length < 2) {
      runStart = null;
      return;
    }
    const first = sub[0]!;
    const last = sub[sub.length - 1]!;
    const d =
      `M ${first.x.toFixed(2)} ${baseline} ` +
      sub
        .map((p, i) => `${i === 0 ? "L" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
        .join(" ") +
      ` L ${last.x.toFixed(2)} ${baseline} Z`;
    areaParts.push(d);
    runStart = null;
  };
  for (let i = 0; i < pts.length; i++) {
    if (pts[i] != null) {
      if (runStart == null) runStart = i;
    } else {
      flushRun(i - 1);
    }
  }
  flushRun(pts.length - 1);
  const areaPath = areaParts.join(" ");

  // Último punto válido para dot.
  let lastValid: Pt | null = null;
  for (let i = pts.length - 1; i >= 0; i--) {
    if (pts[i] != null) {
      lastValid = pts[i]!;
      break;
    }
  }

  const color = toneToColor[tone];

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height, color, display: "block" }}
    >
      {areaPath && (
        <path d={areaPath} fill="currentColor" opacity={0.12} stroke="none" />
      )}
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {lastValid && (
        <circle cx={lastValid.x} cy={lastValid.y} r={2} fill="currentColor" />
      )}
    </svg>
  );
}

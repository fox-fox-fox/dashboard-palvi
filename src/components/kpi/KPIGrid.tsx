import { Skeleton } from "@/components/ui";
import { KPICard } from "./KPICard";
// Tipos / hook provistos por agente paralelo.
import { useKPIs } from "@/hooks/useKPIs";
import type { KpiKey } from "@/data/kpis";

interface KPIGridProps {
  onSelectKpi?: (key: KpiKey) => void;
}

export function KPIGrid({ onSelectKpi }: KPIGridProps) {
  const { kpis, ready } = useKPIs();

  return (
    <div
      className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4"
      role="region"
      aria-label="Indicadores clave"
      aria-live="polite"
      aria-busy={!ready}
    >
      {!ready
        ? Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} variant="rect" className="h-44" />
          ))
        : kpis.map((kpi) => {
            const onClick = onSelectKpi ? () => onSelectKpi(kpi.key) : undefined;
            return <KPICard key={kpi.key} kpi={kpi} {...(onClick ? { onClick } : {})} />;
          })}
    </div>
  );
}

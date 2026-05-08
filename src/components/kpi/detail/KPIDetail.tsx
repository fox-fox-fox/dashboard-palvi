import { Maximize2 } from "lucide-react";
import { Skeleton } from "@/components/ui";
import type { KpiKey } from "@/data/kpis";
import { useKPIDetail } from "@/hooks/useKPIDetail";
import { useAppStore, useWindowKey } from "@/store/useAppStore";
import { Chart90 } from "./Chart90";
import { StatsBreakdown } from "./StatsBreakdown";

interface KPIDetailProps {
  kpiKey: KpiKey;
  onClose: () => void;
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton variant="rect" height={220} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Skeleton variant="rect" height={88} />
        <Skeleton variant="rect" height={88} />
        <Skeleton variant="rect" height={88} />
      </div>
    </div>
  );
}

export function KPIDetail({ kpiKey, onClose }: KPIDetailProps) {
  const detail = useKPIDetail(kpiKey);
  const windowKey = useWindowKey();

  const handleViewFullPeriod = () => {
    useAppStore.getState().setWindow("365d");
    onClose();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-h2 font-semibold text-text">{detail.spec.label}</h2>
        <p className="text-caption text-text-muted">{detail.spec.description}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <span className="text-display font-semibold tabular-nums text-text">
            {detail.formattedCurrentValue}
          </span>
          <span className="inline-flex items-center rounded-md border border-accent/20 bg-accent/10 px-2.5 py-1 text-caption font-medium text-accent">
            {detail.windowLabel}
          </span>
        </div>
      </div>

      {!detail.ready ? (
        <DetailSkeleton />
      ) : (
        <>
          <div className="pt-2">
            <Chart90
              data={detail.chart90}
              stats={detail.stats}
              format={detail.spec.format}
            />
          </div>
          <StatsBreakdown stats={detail.stats} format={detail.spec.format} />
          {windowKey !== "365d" && (
            <div>
              <button
                type="button"
                onClick={handleViewFullPeriod}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-small font-medium text-white shadow-sm transition-colors hover:bg-accent/90 focus-visible:ring-offset-2"
              >
                <Maximize2 size={16} aria-hidden="true" />
                <span>Ver período completo (365 días)</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

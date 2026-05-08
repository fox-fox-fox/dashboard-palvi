import { Suspense, lazy, useState } from "react";
import { Header } from "@/components/header/Header";
import { KPIGrid } from "@/components/kpi";
import { InsightFeed } from "@/components/insights";
import { FunnelView } from "@/components/funnel";
import { Modal, Skeleton } from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { KPI_SPECS, type KpiKey } from "@/data/kpis";

const CustomerHealthCard = lazy(() =>
  import("@/components/health").then((m) => ({ default: m.CustomerHealthCard })),
);

const KPIDetail = lazy(() =>
  import("@/components/kpi/detail").then((m) => ({ default: m.KPIDetail })),
);

export default function App() {
  useTheme();
  const [selectedKpi, setSelectedKpi] = useState<KpiKey | null>(null);

  const selectedLabel =
    selectedKpi === null
      ? ""
      : (KPI_SPECS.find((s) => s.key === selectedKpi)?.label ?? selectedKpi);

  return (
    <div className="min-h-screen bg-bg text-text">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <div className="mb-6 md:mb-8">
          <InsightFeed />
        </div>
        <KPIGrid onSelectKpi={setSelectedKpi} />
        <div className="mt-8 md:mt-10">
          <FunnelView />
        </div>
        <div className="mt-8 md:mt-10">
          <Suspense fallback={<Skeleton variant="rect" className="h-80 w-full" />}>
            <CustomerHealthCard />
          </Suspense>
        </div>
      </main>
      {selectedKpi != null && (
        <Modal
          open
          onClose={() => setSelectedKpi(null)}
          title={selectedLabel}
        >
          <Suspense fallback={<Skeleton variant="rect" className="h-96 w-full" />}>
            <KPIDetail kpiKey={selectedKpi} onClose={() => setSelectedKpi(null)} />
          </Suspense>
        </Modal>
      )}
    </div>
  );
}

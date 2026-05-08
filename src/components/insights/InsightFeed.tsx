import { Skeleton } from "@/components/ui";
import { useInsights } from "@/hooks/useInsights";
import { EmptyInsight } from "./EmptyInsight";
import { InsightCard } from "./InsightCard";

export function InsightFeed() {
  const { insights, empty, ready, dismiss } = useInsights();

  return (
    <section aria-label="Alertas del día">
      <header className="mb-3 md:mb-4">
        <h2 className="text-h2 font-semibold text-text">Foco hoy</h2>
        <p className="text-caption text-text-subtle">Hasta 3 alertas priorizadas</p>
      </header>

      {!ready ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
          <Skeleton variant="rect" className="h-28 w-full" />
          <Skeleton variant="rect" className="h-28 w-full" />
        </div>
      ) : empty ? (
        <EmptyInsight />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
          {insights.map((insight) => (
            <InsightCard key={insight.key} insight={insight} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </section>
  );
}

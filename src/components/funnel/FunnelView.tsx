import { ChevronDown } from "lucide-react";
import { Card, Skeleton } from "@/components/ui";
import { useFunnel } from "@/hooks/useFunnel";
import { FunnelStep } from "./FunnelStep";

const SKELETON_COUNT = 5;

export function FunnelView() {
  const result = useFunnel();
  const maxVolume = result.steps[0]?.volume ?? 0;

  return (
    <Card padded>
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-h2 font-semibold">Embudo</h2>
        <span className="text-caption text-text-muted">{result.periodLabel}</span>
      </div>

      {!result.ready || result.steps.length === 0 ? (
        <div className="flex flex-col gap-3 md:grid md:grid-cols-5 md:gap-3">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton variant="text" className="w-2/3" />
              <Skeleton variant="rect" height={8} />
              <Skeleton variant="text" className="w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Mobile: vertical stack with arrows between steps */}
          <div className="flex flex-col gap-3 md:hidden">
            {result.steps.map((step, i) => {
              const next = result.steps[i + 1] ?? null;
              return (
                <div key={step.key} className="flex flex-col gap-2">
                  <FunnelStep step={step} nextStep={next} maxVolume={maxVolume} />
                  {next != null && (
                    <div
                      className="flex justify-center text-text-muted"
                      aria-hidden="true"
                    >
                      <ChevronDown size={16} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop: 5 columns */}
          <div className="hidden md:grid md:grid-cols-5 md:gap-3">
            {result.steps.map((step, i) => {
              const next = result.steps[i + 1] ?? null;
              return (
                <FunnelStep
                  key={step.key}
                  step={step}
                  nextStep={next}
                  maxVolume={maxVolume}
                />
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}

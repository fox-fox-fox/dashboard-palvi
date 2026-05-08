import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function EmptyInsight() {
  return (
    <Card padded className="flex flex-col items-center justify-center py-10 text-center">
      <CheckCircle2 size={28} className="text-text-subtle" aria-hidden="true" />
      <p className="mt-3 text-body text-text-muted">
        Hoy no hay focos rojos. Buen momento para revisar pipeline.
      </p>
    </Card>
  );
}

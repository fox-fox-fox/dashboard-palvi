import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useAppStore } from "@/store/useAppStore";
import { WINDOW_KEYS, type WindowKey } from "@/store/types";

const OPTIONS = WINDOW_KEYS.map((k) => ({ value: k, label: k }));

export function WindowSelector() {
  const windowKey = useAppStore((s) => s.windowKey);
  const setWindow = useAppStore((s) => s.setWindow);

  return (
    <div className="max-w-full overflow-x-auto">
      <SegmentedControl<WindowKey>
        options={OPTIONS}
        value={windowKey}
        onChange={setWindow}
        ariaLabel="Seleccionar ventana temporal"
        tone="accent"
      />
    </div>
  );
}

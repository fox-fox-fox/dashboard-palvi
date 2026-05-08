import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { DATASET_IDS, type DatasetId } from "@/data/schema";
import { useAppStore } from "@/store/useAppStore";

const OPTIONS = DATASET_IDS.map((id) => ({ value: id, label: id }));

export function DatasetSwitcher() {
  const datasetId = useAppStore((s) => s.datasetId);
  const setDataset = useAppStore((s) => s.setDataset);

  return (
    <SegmentedControl<DatasetId>
      options={OPTIONS}
      value={datasetId}
      onChange={setDataset}
      ariaLabel="Seleccionar dataset"
      tone="accent"
    />
  );
}

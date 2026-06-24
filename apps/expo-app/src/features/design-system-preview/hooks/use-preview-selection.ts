import { useState } from "react";
import type { PreviewRecord } from "../data/sample-data";

export function usePreviewSelection() {
  const [selectedRecord, setSelectedRecord] = useState<PreviewRecord | null>(null);

  return {
    selectedRecord,
    setSelectedRecord,
    clearSelection: () => setSelectedRecord(null),
  };
}

import { useState } from "react";
import type { PreviewFilterState } from "../utils/preview-filtering";

export function usePreviewFilters() {
  const [filters, setFilters] = useState<PreviewFilterState>({
    search: "",
    statuses: new Set(),
    types: new Set(),
  });
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const setSearch = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  };

  const toggleStatus = (status: string) => {
    setFilters((prev) => {
      const next = new Set(prev.statuses);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return { ...prev, statuses: next };
    });
  };

  const clearFilters = () => {
    setFilters((prev) => ({ ...prev, statuses: new Set(), types: new Set() }));
  };

  return {
    filters,
    setSearch,
    toggleStatus,
    clearFilters,
    isFilterSheetOpen,
    setIsFilterSheetOpen,
  };
}

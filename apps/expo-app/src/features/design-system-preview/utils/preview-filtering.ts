import type { PreviewRecord } from "../data/sample-data";
import { getRecordSearchCopy } from "./preview-record-copy";

export type PreviewFilterState = {
  search: string;
  statuses: Set<string>;
  types: Set<string>;
};

export function filterPreviewRecords(
  records: PreviewRecord[],
  filters: PreviewFilterState
): PreviewRecord[] {
  const searchLower = filters.search.toLowerCase().trim();
  
  return records.filter((record) => {
    if (filters.statuses.size > 0 && !filters.statuses.has(record.status)) {
      return false;
    }
    
    if (searchLower) {
      const copy = getRecordSearchCopy(record);
      if (!copy.includes(searchLower)) {
        return false;
      }
    }
    
    return true;
  });
}

import type { PreviewRecord } from "../data/sample-data";
import { getRecordSearchCopy } from "./preview-record-copy";

export type PreviewFilterState = {
	search: string;
	statuses: Set<string>;
	facets: Record<string, Set<string>>;
};

export function filterPreviewRecords(
	records: PreviewRecord[],
	filters: PreviewFilterState,
	activeTab?: string,
): PreviewRecord[] {
	const searchLower = filters.search.toLowerCase().trim();

	return records.filter((record) => {
		if (activeTab && !record.tabs.includes(activeTab)) {
			return false;
		}
		if (filters.statuses.size > 0 && !filters.statuses.has(record.status)) {
			return false;
		}
		for (const [key, selected] of Object.entries(filters.facets)) {
			if (selected.size > 0 && !selected.has(record.facets[key] || "")) {
				return false;
			}
		}
		if (searchLower && !getRecordSearchCopy(record).includes(searchLower)) {
			return false;
		}
		return true;
	});
}

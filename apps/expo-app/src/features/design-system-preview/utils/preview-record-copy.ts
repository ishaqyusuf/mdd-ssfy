import type { PreviewRecord } from "../data/sample-data";

export function getRecordSearchCopy(record: PreviewRecord): string {
	const parts = [
		record.id,
		record.title,
		record.subtitle,
		record.status,
		record.amount ?? "",
		record.action ?? "",
		...record.tabs,
		...Object.values(record.facets),
		...record.meta.map((item) => item.label),
		...Object.values(record.detail || {}).flat(),
	];
	return parts.filter(Boolean).join(" ").toLowerCase();
}

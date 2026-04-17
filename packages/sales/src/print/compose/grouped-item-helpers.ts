import type { PrintSalesItem } from "../query";

function safeRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return {};
	}
	return value as Record<string, unknown>;
}

function normalizeTitle(value?: string | null) {
	return String(value || "")
		.trim()
		.toLowerCase();
}

function getNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

function findStep(item: PrintSalesItem, title: string) {
	const expected = normalizeTitle(title);
	return (item.formSteps || []).find(
		(step) => normalizeTitle(step?.step?.title) === expected,
	);
}

export function getPersistedItemMeta(item: PrintSalesItem) {
	const meta = safeRecord(item.meta);
	const nested = safeRecord(meta.meta);
	return Object.keys(nested).length ? nested : meta;
}

export function getSalesItemType(item: PrintSalesItem) {
	const meta = getPersistedItemMeta(item);
	const metaDoorType = String(meta.doorType || "").trim();
	if (metaDoorType) return metaDoorType;

	const hptDoorType = String(item.housePackageTool?.doorType || "").trim();
	if (hptDoorType) return hptDoorType;

	return String(findStep(item, "Item Type")?.value || "").trim();
}

export function getSectionIndex(item: PrintSalesItem, fallbackIndex: number) {
	const meta = getPersistedItemMeta(item);
	return (
		getNumber(meta.lineIndex) ??
		getNumber(meta.line_index) ??
		getNumber(safeRecord(item.meta).lineIndex) ??
		getNumber(safeRecord(item.meta).line_index) ??
		fallbackIndex
	);
}

export function getLegacyUid(item: PrintSalesItem, fallbackIndex: number) {
	const meta = safeRecord(item.meta);
	return (
		getNumber(meta.uid) ??
		getNumber(getPersistedItemMeta(item).uid) ??
		getSectionIndex(item, fallbackIndex)
	);
}

export function getMetaRows<T = Record<string, unknown>>(
	item: PrintSalesItem,
	key: "mouldingRows" | "serviceRows",
) {
	const meta = getPersistedItemMeta(item) as Record<string, unknown>;
	return Array.isArray(meta[key]) ? (meta[key] as T[]) : [];
}

export function isMetadataBackedMouldingItem(item: PrintSalesItem) {
	const type = normalizeTitle(getSalesItemType(item));
	return (
		!item.housePackageTool &&
		(type === "moulding" ||
			type === "mouldings" ||
			type === "molding" ||
			type === "moldings") &&
		getMetaRows(item, "mouldingRows").length > 0
	);
}

export function isMetadataBackedServiceItem(item: PrintSalesItem) {
	const type = normalizeTitle(getSalesItemType(item));
	return (
		!item.housePackageTool &&
		(type === "service" || type === "services") &&
		getMetaRows(item, "serviceRows").length > 0
	);
}

export function findSelectedStepComponent(
	item: PrintSalesItem,
	title: string,
	rowUid?: string | null,
) {
	const stepMeta = safeRecord(findStep(item, title)?.meta);
	const selectedComponents = Array.isArray(stepMeta.selectedComponents)
		? (stepMeta.selectedComponents as Array<Record<string, unknown>>)
		: [];

	if (!selectedComponents.length) return null;

	if (rowUid) {
		const matched = selectedComponents.find(
			(component) => String(component?.uid || "") === String(rowUid),
		);
		if (matched) return matched;
	}

	return selectedComponents[0] || null;
}

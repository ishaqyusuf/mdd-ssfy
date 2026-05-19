import type { SalesFormStateRecord } from "../types";

export function getFirstSalesFormLineItemUid(
	record: SalesFormStateRecord | null,
) {
	return record?.lineItems?.[0]?.uid || null;
}

export function getNextSalesFormActiveItem(
	record: SalesFormStateRecord,
	removedUid: string,
	currentActiveItem: string | null,
) {
	if (currentActiveItem !== removedUid) return currentActiveItem;
	return record.lineItems.find((line) => line.uid !== removedUid)?.uid || null;
}


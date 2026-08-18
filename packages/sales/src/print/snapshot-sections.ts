import type { SalesSetting } from "../exports";
import { composePrintSections } from "./compose/sections";
import { getModeConfig } from "./constants";
import { buildPrintItemsFromSalesFormLineItems } from "./persisted-form-fallback";
import type { PrintSalesData } from "./query";
import type { PrintSection } from "./types";

type InvoicePrintSnapshotInput = {
	lineItems: unknown;
	salesOrderId?: number | null;
	revisionDate?: Date | string | null;
	setting?: SalesSetting | null;
};

function resolveRevisionDate(value: InvoicePrintSnapshotInput["revisionDate"]) {
	if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
	if (typeof value === "string") {
		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) return parsed;
	}
	return new Date(0);
}

export function buildInvoicePrintSectionsFromSalesFormSnapshot(
	input: InvoicePrintSnapshotInput,
): PrintSection[] {
	const revisionDate = resolveRevisionDate(input.revisionDate);
	const salesOrderId = input.salesOrderId ?? -1;
	const items = buildPrintItemsFromSalesFormLineItems(input.lineItems, {
		salesOrderId,
		createdAt: revisionDate,
		updatedAt: revisionDate,
	});
	if (!items) return [];

	const sale = {
		id: salesOrderId,
		createdAt: revisionDate,
		updatedAt: revisionDate,
		items,
	} as unknown as PrintSalesData;

	return composePrintSections(
		sale,
		getModeConfig("invoice"),
		input.setting ?? null,
	);
}

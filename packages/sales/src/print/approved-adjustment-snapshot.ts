import { projectApprovedAdjustmentDoorRows } from "../sales-form/application/approved-adjustment-projection";
import type { PrintSalesData, PrintSalesItem } from "./query";

function safeRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return value as Record<string, unknown>;
}

function persistedLineForItem(
	item: PrintSalesItem,
	lines: Array<Record<string, unknown>>,
) {
	const itemMeta = safeRecord(item.meta);
	const nestedMeta = safeRecord(itemMeta.meta);
	const itemUid = String(
		itemMeta.uid || nestedMeta.uid || `sales-item-${item.id}`,
	);

	return (
		lines.find((line) => Number(line.id || 0) === item.id) ||
		lines.find((line) => String(line.uid || "") === itemUid)
	);
}

/**
 * An applied adjustment's persisted form snapshot owns the retained HPT door
 * rows. Legacy relations may enrich those rows, but cannot restore removed
 * sizes or overwrite approved quantities and prices.
 */
export function applyApprovedAdjustmentPrintSnapshot(
	sale: PrintSalesData,
): PrintSalesData {
	const saleMeta = safeRecord(sale.meta);
	const form = safeRecord(saleMeta.newSalesForm);
	if (!form.approvedAdjustmentId || !Array.isArray(form.lineItems)) return sale;

	const persistedLines = form.lineItems.map(safeRecord);
	return {
		...sale,
		items: sale.items.map((item) => {
			const persistedLine = persistedLineForItem(item, persistedLines);
			if (!persistedLine) return item;

			const persistedHptValue = persistedLine.housePackageTool;
			if (persistedHptValue === null) {
				return { ...item, housePackageTool: null };
			}

			const persistedHpt = safeRecord(persistedHptValue);
			if (!Array.isArray(persistedHpt.doors)) return item;

			const legacyHpt = item.housePackageTool;
			const doors = projectApprovedAdjustmentDoorRows(
				persistedHpt.doors,
				legacyHpt?.doors || [],
			);

			return {
				...item,
				housePackageTool: {
					...(legacyHpt || {}),
					...persistedHpt,
					doors,
				} as NonNullable<PrintSalesItem["housePackageTool"]>,
			};
		}),
	};
}

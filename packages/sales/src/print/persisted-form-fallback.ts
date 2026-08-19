import {
	type SalesFormLineItem,
	salesFormLineItemSchema,
} from "../sales-form/contracts/schemas";
import type { PrintSalesData, PrintSalesItem } from "./query";

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function parseSalesFormLineItems(value: unknown): SalesFormLineItem[] | null {
	if (!Array.isArray(value) || value.length === 0) return null;

	const parsed = value.map((lineItem) =>
		salesFormLineItemSchema.safeParse(lineItem),
	);
	if (parsed.some((result) => !result.success)) return null;

	return parsed.map((result) => {
		if (!result.success) throw new Error("Unreachable line-item parse failure");
		return result.data;
	});
}

function getPersistedLineItems(
	sale: PrintSalesData,
): SalesFormLineItem[] | null {
	const meta = asRecord(sale.meta);
	const newSalesForm = asRecord(meta.newSalesForm);
	return parseSalesFormLineItems(newSalesForm.lineItems);
}

function hasMetadataRows(meta: Record<string, unknown>) {
	return (
		(Array.isArray(meta.mouldingRows) && meta.mouldingRows.length > 0) ||
		(Array.isArray(meta.serviceRows) && meta.serviceRows.length > 0)
	);
}

function toPrintItem(
	sale: PrintSalesData,
	lineItem: SalesFormLineItem,
	index: number,
): PrintSalesItem {
	const itemId = -(index + 1);
	const revisionDate = sale.updatedAt ?? sale.createdAt;
	const itemMeta = {
		...asRecord(lineItem.meta),
		lineIndex:
			typeof lineItem.meta?.lineIndex === "number"
				? lineItem.meta.lineIndex
				: index,
	};
	const formSteps = (lineItem.formSteps ?? []).map((formStep, stepIndex) => ({
		...formStep,
		id: -(index * 100 + stepIndex + 1),
		stepId: formStep.stepId ?? formStep.step?.id ?? -(stepIndex + 1),
		updatedAt: revisionDate,
		step: {
			...formStep.step,
			id: formStep.step?.id ?? formStep.stepId ?? -(stepIndex + 1),
			title: formStep.step?.title ?? null,
		},
		component: formStep.component ?? null,
	}));
	const shelfItems = (lineItem.shelfItems ?? []).map(
		(shelfItem, shelfIndex) => ({
			...shelfItem,
			id: -(index * 100 + shelfIndex + 1),
			shelfProduct: shelfItem.shelfProduct ?? null,
		}),
	);
	const housePackageTool =
		lineItem.housePackageTool && !hasMetadataRows(itemMeta)
			? {
					...lineItem.housePackageTool,
					id: itemId,
					deletedAt: null,
					updatedAt: revisionDate,
					door: lineItem.housePackageTool.door ?? null,
					molding: lineItem.housePackageTool.molding ?? null,
					stepProduct: lineItem.housePackageTool.stepProduct ?? null,
					doors: (lineItem.housePackageTool.doors ?? []).map(
						(door, doorIndex) => ({
							...door,
							id: -(index * 100 + doorIndex + 1),
							updatedAt: revisionDate,
							stepProduct: door.stepProduct ?? null,
						}),
					),
				}
			: null;

	return {
		...lineItem,
		id: itemId,
		salesOrderId: sale.id,
		description: lineItem.description ?? lineItem.title,
		dykeDescription: lineItem.title,
		qty: lineItem.qty,
		rate: lineItem.unitPrice,
		total: lineItem.lineTotal,
		meta: {
			uid: lineItem.uid,
			meta: itemMeta,
			title: lineItem.title,
			description: lineItem.description,
		},
		formSteps,
		shelfItems,
		housePackageTool,
		multiDyke: false,
		multiDykeUid: null,
	} as unknown as PrintSalesItem;
}

/**
 * Some migrated quotes retain the complete sales-form snapshot after their
 * relational items were lost. Use that snapshot only when no active relation
 * exists, and only when every saved line validates successfully.
 */
export function applyPersistedFormPrintFallback(
	sale: PrintSalesData,
): PrintSalesData {
	if (sale.items.length > 0) return sale;

	const lineItems = getPersistedLineItems(sale);
	if (!lineItems) return sale;

	return {
		...sale,
		items: lineItems.map((lineItem, index) =>
			toPrintItem(sale, lineItem, index),
		),
	};
}

export function buildPrintItemsFromSalesFormLineItems(
	value: unknown,
	context: {
		salesOrderId: number;
		createdAt?: Date | null;
		updatedAt?: Date | null;
	},
): PrintSalesItem[] | null {
	const lineItems = parseSalesFormLineItems(value);
	if (!lineItems) return null;

	const sale = {
		id: context.salesOrderId,
		createdAt: context.createdAt ?? new Date(0),
		updatedAt: context.updatedAt ?? new Date(0),
	} as PrintSalesData;
	return lineItems.map((lineItem, index) => toPrintItem(sale, lineItem, index));
}

import {
	computeNormalizedSalesFormSummary,
	createEmptySalesFormLineItem,
	createSalesFormLineItemUid,
	hydrateSalesFormRecord,
	normalizeSalesFormExtraCosts,
	normalizeSalesFormLineItem,
	normalizeSalesFormLineItems,
	normalizeSalesFormMeta,
	repriceSalesFormLineItemsForProfile,
	toSalesFormSaveDraftPayload,
} from "@gnd/sales/sales-form";
import type {
	NewSalesFormExtraCost,
	NewSalesFormLineItem,
	NewSalesFormMeta,
	NewSalesFormRecord,
	NewSalesFormSaveDraftInput,
	NewSalesFormSummary,
} from "./schema";

export function createLineItemUid(index = 0) {
	return createSalesFormLineItemUid(index);
}

export function createEmptyLineItem(index = 0): NewSalesFormLineItem {
	return createEmptySalesFormLineItem(index) as NewSalesFormLineItem;
}

export function normalizeLineItem(
	line: Partial<NewSalesFormLineItem>,
	index = 0,
): NewSalesFormLineItem {
	return normalizeSalesFormLineItem(line, index) as NewSalesFormLineItem;
}

export function normalizeLineItems(
	lines: Partial<NewSalesFormLineItem>[],
): NewSalesFormLineItem[] {
	return normalizeSalesFormLineItems(lines) as NewSalesFormLineItem[];
}

export function normalizeMeta(
	meta: Partial<NewSalesFormMeta>,
): NewSalesFormMeta {
	return normalizeSalesFormMeta(meta) as NewSalesFormMeta;
}

export function repriceLineItemsByProfile(
	lineItems: NewSalesFormLineItem[],
	previousProfileCoefficient?: number | null,
	nextProfileCoefficient?: number | null,
): NewSalesFormLineItem[] {
	return repriceSalesFormLineItemsForProfile(
		lineItems,
		previousProfileCoefficient,
		nextProfileCoefficient,
	) as NewSalesFormLineItem[];
}

export function computeSummary(
	lineItems: NewSalesFormLineItem[],
	taxRate = 0,
	extraCosts: NewSalesFormExtraCost[] = [],
	paymentMethod?: string | null,
	cccPercentage?: number | null,
): NewSalesFormSummary {
	return computeNormalizedSalesFormSummary(
		lineItems,
		taxRate,
		extraCosts,
		paymentMethod,
		cccPercentage,
	) as NewSalesFormSummary;
}

export function normalizeExtraCosts(
	costs: Partial<NewSalesFormExtraCost>[] = [],
): NewSalesFormExtraCost[] {
	return normalizeSalesFormExtraCosts(costs) as NewSalesFormExtraCost[];
}

export function hydrateRecord(record: NewSalesFormRecord): NewSalesFormRecord {
	return hydrateSalesFormRecord(record) as NewSalesFormRecord;
}

export function toSaveDraftInput(
	source: Pick<
		NewSalesFormRecord,
		| "type"
		| "salesId"
		| "slug"
		| "inventoryStatus"
		| "version"
		| "form"
		| "lineItems"
		| "extraCosts"
		| "summary"
	>,
	autosave = true,
): NewSalesFormSaveDraftInput {
	return toSalesFormSaveDraftPayload(
		source,
		autosave,
	) as NewSalesFormSaveDraftInput;
}

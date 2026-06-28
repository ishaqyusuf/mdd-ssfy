import {
	computeNormalizedSalesFormSummary,
	composeSalesFormSavePayload,
	repriceSalesFormLineItemsForProfile,
} from "@gnd/sales/sales-form";
import type {
	NewSalesFormExtraCost,
	NewSalesFormLineItem,
	NewSalesFormRecord,
	NewSalesFormSaveDraftInput,
	NewSalesFormSummary,
} from "./schema";

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
	return composeSalesFormSavePayload(
		source,
		{
			surface: "www",
			autosave,
			pricing: {
				mode: "coefficient",
			},
		},
	) as NewSalesFormSaveDraftInput;
}

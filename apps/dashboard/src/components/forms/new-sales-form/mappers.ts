import {
	computeNormalizedSalesFormSummary,
	composeSalesFormSavePayload,
	repriceSalesFormLineItemsForProfile,
} from "@gnd/sales/sales-form";
import type {
	NewSalesFormExtraCost,
	NewSalesFormLineItem,
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
	source: {
		type: NewSalesFormSaveDraftInput["type"];
		salesId?: number | null;
		slug?: string | null;
		inventoryStatus?: unknown;
		version?: string | null;
		form: unknown;
		lineItems: unknown[];
		extraCosts: unknown[];
		summary: unknown;
	},
	autosave = true,
): NewSalesFormSaveDraftInput {
	return composeSalesFormSavePayload(
		source as Parameters<typeof composeSalesFormSavePayload>[0],
		{
			surface: "www",
			autosave,
			pricing: {
				mode: "coefficient",
			},
		},
	) as NewSalesFormSaveDraftInput;
}

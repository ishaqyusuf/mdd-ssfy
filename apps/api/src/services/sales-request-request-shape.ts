import {
	type NewSalesFormSeed,
	newSalesFormSeedSchema,
} from "@gnd/sales/sales-form-core";

export const SALES_REQUEST_COMPLEXITY_VERSION = "request-shape-v1" as const;
export const SALES_REQUEST_COMPLEXITY_VERSIONS = [
	SALES_REQUEST_COMPLEXITY_VERSION,
] as const;
export type SalesRequestComplexityVersion =
	(typeof SALES_REQUEST_COMPLEXITY_VERSIONS)[number];

export const SALES_REQUEST_COMPLEXITY_STRATA = [
	"simple",
	"standard",
	"complex",
] as const;
export type SalesRequestComplexityStratum =
	(typeof SALES_REQUEST_COMPLEXITY_STRATA)[number];

export type SalesRequestComplexity = {
	version: SalesRequestComplexityVersion;
	stratum: SalesRequestComplexityStratum;
};

/**
 * Derive only coarse structural complexity after the generation boundary has
 * already validated component references against its authoritative snapshot.
 * No identifier, title, quantity, price, customer fact, or source text enters
 * the result.
 */
export function deriveSalesRequestComplexity(
	value: NewSalesFormSeed,
): SalesRequestComplexity | null {
	const parsed = newSalesFormSeedSchema.safeParse(value);
	if (!parsed.success || parsed.data.unresolved.length > 0) return null;

	let selectedValueCount = 0;
	let structuredRowCount = 0;
	let multiSelectionGroupCount = 0;
	for (const line of parsed.data.lineItems) {
		for (const step of line.formSteps) {
			if ("value" in step) return null;
			if ("meta" in step) {
				multiSelectionGroupCount += 1;
				selectedValueCount += step.meta.selectedProdUids.length;
			} else {
				selectedValueCount += 1;
			}
		}
		structuredRowCount += line.housePackageTool?.doors.length ?? 0;
		if ("meta" in line) {
			structuredRowCount += line.meta?.serviceRows?.length ?? 0;
			structuredRowCount += line.meta?.mouldingRows?.length ?? 0;
		}
	}

	const lineCount = parsed.data.lineItems.length;
	const deliveryPresent =
		parsed.data.schemaVersion === 2 &&
		(parsed.data.form?.deliveryOption === "delivery" ||
			(parsed.data.extraCosts?.length ?? 0) > 0);
	const complex =
		lineCount >= 3 ||
		selectedValueCount >= 8 ||
		structuredRowCount >= 4 ||
		multiSelectionGroupCount >= 2 ||
		(deliveryPresent && (lineCount >= 2 || structuredRowCount >= 1));
	const simple =
		lineCount === 1 &&
		selectedValueCount <= 3 &&
		structuredRowCount <= 1 &&
		multiSelectionGroupCount === 0 &&
		!deliveryPresent;

	return {
		version: SALES_REQUEST_COMPLEXITY_VERSION,
		stratum: complex ? "complex" : simple ? "simple" : "standard",
	};
}

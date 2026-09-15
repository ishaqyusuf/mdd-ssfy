import type { SalesPrintRequest } from "./sales-print-service";

export type SalesPrintContinuationInput = Pick<
	SalesPrintRequest,
	| "baseUrl"
	| "dispatchId"
	| "mode"
	| "pageBreakMode"
	| "priceDisplay"
	| "pricingMode"
	| "printConfig"
	| "salesIds"
	| "templateId"
>;

export function buildSalesPrintContinuationRequest(
	input: SalesPrintContinuationInput,
): SalesPrintRequest {
	return {
		salesIds: input.salesIds,
		mode: input.mode,
		pricingMode: input.pricingMode ?? null,
		priceDisplay: input.priceDisplay ?? null,
		dispatchId: input.dispatchId ?? null,
		templateId: input.templateId ?? null,
		pageBreakMode: input.pageBreakMode ?? null,
		printConfig: input.printConfig ?? null,
		baseUrl: input.baseUrl ?? null,
	};
}

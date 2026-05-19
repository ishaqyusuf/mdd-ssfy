import type { SalesFormSummaryRecord } from "../../application";

export function hasSalesFormSummaryDrift(
	currentSummary: SalesFormSummaryRecord | null | undefined,
	nextSummary: SalesFormSummaryRecord | null | undefined,
) {
	return (
		Number(currentSummary?.subTotal || 0) !==
			Number(nextSummary?.subTotal || 0) ||
		Number(currentSummary?.adjustedSubTotal || 0) !==
			Number(nextSummary?.adjustedSubTotal || 0) ||
		Number(currentSummary?.taxTotal || 0) !==
			Number(nextSummary?.taxTotal || 0) ||
		Number(currentSummary?.grandTotal || 0) !==
			Number(nextSummary?.grandTotal || 0) ||
		Number(currentSummary?.ccc || 0) !== Number(nextSummary?.ccc || 0)
	);
}


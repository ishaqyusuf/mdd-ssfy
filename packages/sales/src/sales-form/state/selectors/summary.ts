import {
	computeNormalizedSalesFormSummary,
	normalizeSalesFormExtraCosts,
} from "../../application";
import type { SalesFormStateRecord } from "../types";

export function recomputeSalesFormRecordSummary<
	TRecord extends SalesFormStateRecord,
>(record: TRecord | null): TRecord | null {
	if (!record) return null;
	const summary = computeNormalizedSalesFormSummary(
		record.lineItems,
		record.summary?.taxRate || 0,
		normalizeSalesFormExtraCosts(record.extraCosts || []),
		record.form?.paymentMethod || null,
		record.settings?.cccPercentage,
	);

	return {
		...record,
		summary: {
			...record.summary,
			...summary,
		},
	};
}


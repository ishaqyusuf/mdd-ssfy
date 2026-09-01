import type {
	SalesCompletionMethod,
	SalesCompletionMilestone,
	SalesCompletionProjection,
	SalesCompletionSource,
} from "./sales-completion";

export type SalesCompletionReportScope = "OPERATIONAL" | "ADMINISTRATIVE";

export type SalesCompletionReportRow = {
	salesOrderId: number;
	orderNo: string;
	milestone: SalesCompletionMilestone;
	method: SalesCompletionMethod;
	source: SalesCompletionSource;
	effectiveAt: Date | null;
	recordedAt: Date | null;
};

/**
 * Builds completion reporting rows without translating an administrative
 * declaration into operational evidence. The default scope is deliberately
 * operational; callers must opt into the administrative audit view.
 */
export function buildSalesCompletionReportRows(
	projections: SalesCompletionProjection[],
	scope: SalesCompletionReportScope = "OPERATIONAL",
) {
	const rows: SalesCompletionReportRow[] = [];
	for (const projection of projections) {
		const milestones = [
			{
				milestone: "PRODUCTION_COMPLETED" as const,
				satisfied: projection.productionCompletionSatisfied,
				method: projection.productionCompletionMethod,
				source: projection.productionCompletionSource,
				effectiveAt: projection.productionEffectiveAt,
				recordedAt: projection.productionRecordedAt,
			},
			{
				milestone: "FULFILLMENT_COMPLETED" as const,
				satisfied: projection.fulfillmentCompletionSatisfied,
				method: projection.fulfillmentMethod,
				source: projection.fulfillmentCompletionSource,
				effectiveAt: projection.fulfillmentEffectiveAt,
				recordedAt: projection.fulfillmentRecordedAt,
			},
		];
		for (const milestone of milestones) {
			if (!milestone.satisfied || !milestone.method) continue;
			if (scope === "OPERATIONAL" && milestone.method !== "FULL_WORKFLOW") {
				continue;
			}
			rows.push({
				salesOrderId: projection.salesOrderId,
				orderNo: projection.orderNo,
				milestone: milestone.milestone,
				method: milestone.method,
				source: milestone.source,
				effectiveAt: milestone.effectiveAt,
				recordedAt: milestone.recordedAt,
			});
		}
	}
	return rows;
}

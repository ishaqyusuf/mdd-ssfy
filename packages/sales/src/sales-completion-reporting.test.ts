import { describe, expect, test } from "bun:test";

import type { SalesCompletionProjection } from "./sales-completion";
import { buildSalesCompletionReportRows } from "./sales-completion-reporting";

function projection(
	overrides: Partial<SalesCompletionProjection> = {},
): SalesCompletionProjection {
	return {
		salesOrderId: 91,
		orderNo: "091LRG",
		orderCreatedAt: null,
		isRecentOrder: false,
		revision: "revision",
		operationalProductionCompleted: false,
		canonicalFulfilled: false,
		productionCompletionSatisfied: true,
		fulfillmentCompletionSatisfied: false,
		fulfillmentDisposition: "PENDING",
		productionCompletionSource: "STATUS_ONLY",
		fulfillmentCompletionSource: "NONE",
		productionCompletionMethod: "STATUS_ONLY",
		fulfillmentMethod: null,
		productionEffectiveAt: null,
		fulfillmentEffectiveAt: null,
		productionRecordedAt: new Date("2026-08-01T12:00:00.000Z"),
		fulfillmentRecordedAt: null,
		availableActions: {
			markProductionStatusOnly: false,
			cancelProductionStatusOnly: true,
			productionCancellationBlockedReason: null,
			markFulfillmentStatusOnly: true,
			cancelFulfillmentStatusOnly: false,
		},
		activeProductionRecord: null,
		activeFulfillmentRecord: null,
		history: [],
		...overrides,
	};
}

describe("sales completion reporting", () => {
	test("excludes status-only declarations from the default operational report", () => {
		expect(buildSalesCompletionReportRows([projection()])).toEqual([]);
	});

	test("administrative reporting keeps method, effective, and recorded dates separate", () => {
		const rows = buildSalesCompletionReportRows(
			[projection()],
			"ADMINISTRATIVE",
		);
		expect(rows).toEqual([
			{
				salesOrderId: 91,
				orderNo: "091LRG",
				milestone: "PRODUCTION_COMPLETED",
				method: "STATUS_ONLY",
				source: "STATUS_ONLY",
				effectiveAt: null,
				recordedAt: new Date("2026-08-01T12:00:00.000Z"),
			},
		]);
	});

	test("includes full-workflow evidence in the operational report", () => {
		expect(
			buildSalesCompletionReportRows([
				projection({
					operationalProductionCompleted: true,
					productionCompletionSource: "OPERATIONAL_WORKFLOW",
					productionCompletionMethod: "FULL_WORKFLOW",
					productionRecordedAt: null,
				}),
			]),
		).toHaveLength(1);
	});

	test("labels Fulfillment-implied Production instead of fabricating a declaration", () => {
		const rows = buildSalesCompletionReportRows(
			[
				projection({
					productionCompletionSource: "IMPLIED_BY_FULFILLMENT",
					fulfillmentCompletionSatisfied: true,
					fulfillmentDisposition: "ADMINISTRATIVELY_COMPLETED",
					fulfillmentCompletionSource: "STATUS_ONLY",
					fulfillmentMethod: "STATUS_ONLY",
				}),
			],
			"ADMINISTRATIVE",
		);
		expect(rows.map((row) => [row.milestone, row.source])).toEqual([
			["PRODUCTION_COMPLETED", "IMPLIED_BY_FULFILLMENT"],
			["FULFILLMENT_COMPLETED", "STATUS_ONLY"],
		]);
	});
});

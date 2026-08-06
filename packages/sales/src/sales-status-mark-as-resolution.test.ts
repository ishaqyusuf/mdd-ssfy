import { describe, expect, mock, test } from "bun:test";
import type { Db } from "@gnd/db";

import {
	type SalesStatusMarkAsPreflightResult,
	resolveSalesStatusMarkAsDependenciesForContinue,
} from "./sales-status-mark-as-resolution";

function makePreflight(
	overrides: Partial<SalesStatusMarkAsPreflightResult> = {},
): SalesStatusMarkAsPreflightResult {
	return {
		ok: false,
		action: "fulfilled",
		saleCount: 1,
		configuredSaleCount: 1,
		unconfiguredSaleCount: 0,
		blockedSaleCount: 1,
		totals: {
			pendingQty: 12,
			openInboundQty: 12,
			unresolvedComponentCount: 2,
			resolvableDemandCount: 0,
			unresolvableComponentCount: 2,
			pendingStockAllocationCount: 0,
			pendingStockAllocationQty: 0,
			autoInboundDemandCount: 0,
			autoInboundQty: 0,
		},
		canResolveAndContinue: true,
		blockers: [
			{
				salesOrderId: 25372,
				orderId: "09166LRG",
				title: null,
				readiness: "awaiting_inbound",
				reason: "awaiting_inbound",
				requiredComponentCount: 2,
				unresolvedComponentCount: 2,
				pendingQty: 12,
				openInboundQty: 12,
				resolvableDemandIds: [],
				pendingStockAllocationIds: [],
				autoInboundDemandIds: [],
				autoInboundSelections: [],
				unresolvableComponentCount: 2,
				components: [],
			},
		],
		automation: {
			affectedSalesOrderCount: 1,
			pendingProductionReviewCount: 1,
			pendingProductionSubmissionCount: 1,
			pendingProductionQty: 12,
			inboundShipmentCount: 1,
			inboundItemCount: 1,
			inboundQtyToReceive: 12,
			manualAvailabilityComponentCount: 1,
			autoPaymentReview: true,
			willCompleteDispatch: true,
		},
		...overrides,
	};
}

describe("resolveSalesStatusMarkAsDependenciesForContinue", () => {
	test("receives the whole linked inbound before approving production and continuing", async () => {
		const events: string[] = [];
		const initialPreflight = makePreflight();
		const remainingPreflight = makePreflight({
			ok: false,
			automation: {
				...initialPreflight.automation,
				pendingProductionReviewCount: 0,
				pendingProductionSubmissionCount: 0,
				pendingProductionQty: 0,
				inboundShipmentCount: 0,
				inboundItemCount: 0,
				inboundQtyToReceive: 0,
				manualAvailabilityComponentCount: 0,
				autoPaymentReview: false,
			},
		});
		const getStatusPreflight = mock()
			.mockResolvedValueOnce(initialPreflight)
			.mockResolvedValueOnce(remainingPreflight);
		const loadContext = mock(async () => ({
			reviews: [],
			inboundDemands: [
				{
					lineItemComponentId: 5903,
					lineItemComponent: { parent: { saleId: 25372 } },
					inboundShipmentItem: {
						id: 440,
						inboundId: 119,
						qty: 12,
						qtyGood: 0,
						qtyIssue: 0,
						inbound: { status: "pending" },
					},
				},
			],
		}));
		const receiveInbound = mock(async (_db: Db, input: unknown) => {
			events.push("receive-inbound");
			expect(input).toEqual({ inboundId: 119, authorName: "Admin" });
			return {
				inboundId: 119,
				shipmentStatus: "completed" as const,
				receivedItemCount: 1,
				stockMovementCount: 1,
				issueCount: 0,
				skippedItemCount: 0,
				newlyReceivedQty: 12,
				alreadyReceivedQty: 0,
				lineItemComponentIds: [5903],
				inventoryVariantIds: [79],
			};
		});
		const manualFulfill = mock(async () => {
			events.push("mark-remaining-available");
			return {
				salesOrderId: 25372,
				orderId: "09166LRG",
				fulfilledComponentCount: 1,
				protectedComponentCount: 0,
				protectedComponentIds: [],
				cancelledDemandCount: 0,
				inventoryStatus: "AVAILABLE",
			};
		});
		const getPendingReviews = mock(async () => [
			{
				id: 4,
				salesOrderId: 25372,
				updatedAt: new Date("2026-08-06T15:00:00.000Z"),
				submissions: [{ id: 12383, qty: 12 }],
			},
		]);
		const getReviewDetail = mock(async () => ({
			currentEvidence: {
				classification: { state: "finalized" },
				materialSnapshot: [],
			},
		}));
		const decideReview = mock(async (_db: Db, input: unknown) => {
			events.push("approve-production");
			expect(input).toMatchObject({
				reviewId: 4,
				action: "RECHECK_AND_APPROVE",
			});
			return { reviewId: 4, status: "APPROVED" as const };
		});
		const overrideAvailability = mock(async () => {
			events.push("override-residual-checks");
			return {
				action: "fulfilled" as const,
				continueAllowed: true,
				overriddenSalesOrderCount: 1,
				auditHistoryCount: 1,
				preflight: remainingPreflight,
				remainingPreflight,
			};
		});

		const result = await resolveSalesStatusMarkAsDependenciesForContinue(
			{} as Db,
			{
				salesOrderIds: [25372],
				action: "fulfilled",
				authorName: "Admin",
				triggeredByUserId: 1,
			},
			{
				getStatusPreflight: getStatusPreflight as never,
				loadContext: loadContext as never,
				getPendingReviews: getPendingReviews as never,
				overrideAvailability: overrideAvailability as never,
				receiveInbound: receiveInbound as never,
				manualFulfill: manualFulfill as never,
				getReviewDetail: getReviewDetail as never,
				decideReview: decideReview as never,
			},
		);

		expect(events).toEqual([
			"receive-inbound",
			"mark-remaining-available",
			"approve-production",
			"override-residual-checks",
		]);
		expect(result).toMatchObject({
			continueAllowed: true,
			receivedInboundShipmentCount: 1,
			receivedInboundItemCount: 1,
			receivedInboundQty: 12,
			manuallyFulfilledComponentCount: 1,
			overriddenSalesOrderCount: 1,
			approvedProductionReviewCount: 1,
		});
	});
});

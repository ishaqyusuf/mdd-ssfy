import { describe, expect, test } from "bun:test";
import { getSalesOrderLifecycleStatus } from "./order-status";
import {
	buildSalesWorkflowCancellationPreview,
	cancelSalesWorkflowLayer,
	cancelSalesWorkflowLayerSchema,
} from "./sales-workflow-cancellation";

function state(overrides: Record<string, unknown> = {}) {
	return {
		id: 91,
		orderId: "09166LRG",
		status: "active",
		prodStatus: "completed",
		updatedAt: new Date("2026-08-06T12:00:00Z"),
		deliveries: [],
		productions: [],
		productionSubmissionMaterialReviews: [],
		payments: [],
		productionReadinessOverride: null,
		lineItems: [],
		...overrides,
	} as never;
}

function automaticSubmission(
	id: number,
	overrides: Record<string, unknown> = {},
) {
	return {
		id,
		meta: { source: "sales_mark_as_completed" },
		materialReviewId: null,
		updatedAt: new Date("2026-08-06T12:00:00Z"),
		payroll: null,
		...overrides,
	};
}

function dispatch(status: string, overrides: Record<string, unknown> = {}) {
	return {
		id: 301,
		status,
		deliveredAt: null,
		deliveredTo: null,
		meta: null,
		updatedAt: new Date("2026-08-06T12:00:00Z"),
		items: [],
		...overrides,
	};
}

describe("safe layered sales workflow cancellation", () => {
	test("allows queued fulfillment and returns to the derived production state", () => {
		const preview = buildSalesWorkflowCancellationPreview(
			state({
				prodStatus: "pending",
				deliveries: [dispatch("queue")],
			}),
			"fulfillment",
		);

		expect(preview.allowed).toBe(true);
		expect(preview.effects.dispatchIds).toEqual([301]);
		expect(preview.resultingLifecycle).toBe("awaiting_production");
	});

	test("unpacks packed rows while retaining the row as evidence", () => {
		const preview = buildSalesWorkflowCancellationPreview(
			state({
				deliveries: [
					dispatch("packed", {
						items: [
							{
								id: 801,
								packingStatus: "packed",
								packedBy: "Warehouse",
								unpackedBy: null,
								updatedAt: new Date("2026-08-06T12:00:00Z"),
							},
						],
					}),
				],
			}),
			"fulfillment",
		);

		expect(preview.allowed).toBe(true);
		expect(preview.effects.packedItemIds).toEqual([801]);
		expect(preview.resultingLifecycle).toBe("ready_to_fulfill");
	});

	test("cancels every reversible dispatch in one guarded order command", () => {
		const preview = buildSalesWorkflowCancellationPreview(
			state({
				deliveries: [
					dispatch("queue", { id: 301 }),
					dispatch("packing", { id: 302 }),
					dispatch("packed", { id: 303 }),
				],
			}),
			"fulfillment",
		);

		expect(preview.allowed).toBe(true);
		expect(preview.effects.dispatchIds).toEqual([301, 302, 303]);
	});

	test.each(["in progress", "in transit"])(
		"blocks %s fulfillment",
		(status) => {
			const preview = buildSalesWorkflowCancellationPreview(
				state({ deliveries: [dispatch(status)] }),
				"fulfillment",
			);
			expect(preview.allowed).toBe(false);
			expect(preview.blockers[0]?.code).toBe("FULFILLMENT_IN_TRANSIT");
		},
	);

	test("blocks delivered dispatches without erasing proof", () => {
		const preview = buildSalesWorkflowCancellationPreview(
			state({
				deliveries: [
					dispatch("packed", {
						deliveredAt: new Date("2026-08-06T13:00:00Z"),
						meta: { dispatchCompletion: { receivedBy: "Customer" } },
					}),
				],
			}),
			"fulfillment",
		);
		expect(preview.allowed).toBe(false);
		expect(preview.blockers[0]?.code).toBe("FULFILLMENT_DELIVERED");
	});

	test("allows automatic production and preserves inbound and stock evidence", () => {
		const preview = buildSalesWorkflowCancellationPreview(
			state({
				productions: [automaticSubmission(401)],
				lineItems: [
					{
						components: [
							{
								inboundDemands: [
									{
										id: 1,
										qtyReceived: 4,
										status: "fulfilled",
										updatedAt: new Date("2026-08-06T12:00:00Z"),
										inboundShipmentItem: {
											inboundId: 119,
											stockMovement: [{ id: 70 }],
										},
									},
								],
							},
						],
					},
				],
			}),
			"production",
		);

		expect(preview.allowed).toBe(true);
		expect(preview.effects.automaticSubmissionIds).toEqual([401]);
		expect(preview.preserved.inboundShipmentIds).toEqual([119]);
		expect(preview.preserved.receivedInboundQty).toBe(4);
		expect(preview.preserved.stockMovementCount).toBe(1);
		expect(preview.resultingLifecycle).toBe("awaiting_production");
	});

	test("preserves manual production and a shared material review", () => {
		const preview = buildSalesWorkflowCancellationPreview(
			state({
				productions: [
					automaticSubmission(401, { materialReviewId: 55 }),
					{
						...automaticSubmission(402, { materialReviewId: 55 }),
						meta: { source: "manual" },
					},
				],
				productionSubmissionMaterialReviews: [
					{
						id: 55,
						status: "APPROVED",
						resolution: null,
						updatedAt: new Date("2026-08-06T12:00:00Z"),
						submissions: [
							{ id: 401, meta: { source: "sales_mark_as_completed" } },
							{ id: 402, meta: { source: "manual" } },
						],
					},
				],
			}),
			"production",
		);

		expect(preview.preserved.manualSubmissionIds).toEqual([402]);
		expect(preview.effects.preservedMaterialReviewIds).toEqual([55]);
		expect(preview.effects.cancelledMaterialReviewIds).toEqual([]);
		expect(preview.effects.paymentReviewIds).toEqual([]);
	});

	test("reopens only untouched automatic reviews owned by the cancelled layer", () => {
		const automaticFulfillmentReview = {
			id: 701,
			reviewStatus: "reviewed",
			reviewMethod: "auto",
			reviewedByAction: "fulfillment",
			reviewedAt: new Date("2026-08-06T12:00:00Z"),
			reviewedById: 7,
			reviewNote: null,
			updatedAt: new Date("2026-08-06T12:00:00Z"),
		};
		const fulfillment = buildSalesWorkflowCancellationPreview(
			state({
				deliveries: [dispatch("queue")],
				payments: [
					automaticFulfillmentReview,
					{
						...automaticFulfillmentReview,
						id: 702,
						reviewMethod: "manual",
					},
				],
			}),
			"fulfillment",
		);
		expect(fulfillment.effects.paymentReviewIds).toEqual([701]);

		const productionWithManualWork = buildSalesWorkflowCancellationPreview(
			state({
				productions: [
					automaticSubmission(401),
					{ ...automaticSubmission(402), meta: { source: "manual" } },
				],
				payments: [
					{
						...automaticFulfillmentReview,
						id: 703,
						reviewedByAction: "production",
					},
				],
			}),
			"production",
		);
		expect(productionWithManualWork.effects.paymentReviewIds).toEqual([]);
	});

	test("soft-deletes only pending unpaid payroll", () => {
		const reversible = buildSalesWorkflowCancellationPreview(
			state({
				productions: [
					automaticSubmission(401, {
						payroll: {
							id: 601,
							status: "PENDING",
							payoutId: null,
							deletedAt: null,
							updatedAt: new Date("2026-08-06T12:00:00Z"),
						},
					}),
				],
			}),
			"production",
		);
		expect(reversible.allowed).toBe(true);
		expect(reversible.effects.deletedPendingPayrollIds).toEqual([601]);

		const paid = buildSalesWorkflowCancellationPreview(
			state({
				productions: [
					automaticSubmission(401, {
						payroll: {
							id: 602,
							status: "COMPLETED",
							payoutId: 9,
							deletedAt: null,
							updatedAt: new Date("2026-08-06T12:00:00Z"),
						},
					}),
				],
			}),
			"production",
		);
		expect(paid.allowed).toBe(false);
		expect(paid.blockers[0]?.code).toBe("PRODUCTION_PAYROLL_LOCKED");
	});

	test("blocks production after fulfillment begins", () => {
		const preview = buildSalesWorkflowCancellationPreview(
			state({
				productions: [automaticSubmission(401)],
				deliveries: [dispatch("packing")],
			}),
			"production",
		);
		expect(preview.allowed).toBe(false);
		expect(
			preview.blockers.some(
				({ code }) => code === "FULFILLMENT_ALREADY_STARTED",
			),
		).toBe(true);
	});

	test("revision changes when a guarded resource changes", () => {
		const first = buildSalesWorkflowCancellationPreview(
			state({ deliveries: [dispatch("queue")] }),
			"fulfillment",
		);
		const second = buildSalesWorkflowCancellationPreview(
			state({ deliveries: [dispatch("packed")] }),
			"fulfillment",
		);
		expect(first.revision).not.toBe(second.revision);
	});

	test("keeps an explicitly cancelled sales order terminal", () => {
		expect(
			getSalesOrderLifecycleStatus({
				orderStatus: "cancelled",
				productionStatus: "completed",
				fulfillmentStatus: "unknown",
			}),
		).toBe("cancelled");
	});

	test("requires a reason at the public command boundary", () => {
		expect(() =>
			cancelSalesWorkflowLayerSchema.parse({
				salesOrderId: 91,
				action: "production",
				expectedRevision: "a".repeat(64),
				requestId: crypto.randomUUID(),
				reason: " ",
			}),
		).toThrow();
	});

	test("replays a completed request id without applying domain changes again", async () => {
		const savedResult = {
			requestId: "637b68b3-4f48-497f-b9ca-cd1df23872f1",
			salesOrderId: 91,
			action: "fulfillment" as const,
			currentLifecycle: "packing" as const,
			resultingLifecycle: "ready_to_fulfill" as const,
			effects: {
				dispatchIds: [301],
				packedItemIds: [],
				automaticSubmissionIds: [],
				cancelledMaterialReviewIds: [],
				preservedMaterialReviewIds: [],
				deletedPendingPayrollIds: [],
				paymentReviewIds: [],
				revokedReadinessOverrideId: null,
			},
			idempotentReplay: false,
		};
		const tx = {
			salesWorkflowCancellation: {
				findUnique: async () => ({
					salesOrderId: 91,
					action: "fulfillment",
					result: savedResult,
				}),
			},
		};
		const db = {
			$transaction: async (run: (value: typeof tx) => Promise<unknown>) =>
				run(tx),
		};

		const result = await cancelSalesWorkflowLayer(
			db as never,
			{
				salesOrderId: 91,
				action: "fulfillment",
				expectedRevision: "a".repeat(64),
				requestId: savedResult.requestId,
				reason: "Duplicate client retry",
			},
			{ id: 7, name: "Operations" },
		);

		expect(result.idempotentReplay).toBe(true);
		expect(result.effects.dispatchIds).toEqual([301]);
	});
});

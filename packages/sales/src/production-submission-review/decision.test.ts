import { describe, expect, it, mock } from "bun:test";

import { decideProductionSubmissionMaterialReview } from "./decision";

function pendingReview() {
	return {
		id: 55,
		salesOrderId: 42,
		status: "PENDING",
		updatedAt: new Date("2026-07-30T12:00:00.000Z"),
		assignmentScope: [
			{ controlUid: "door-1", salesItemId: 10, assignmentId: 77 },
		],
		order: { id: 42, orderId: "10042" },
		submissions: [
			{
				id: 91,
				qty: 1,
				assignment: {
					assignedToId: 7,
					laborCost: 10,
					salesItemControlUid: "door-1",
				},
			},
		],
	};
}

describe("production submission material review decision", () => {
	it("marks scoped needs available and approves only after readiness is rechecked", async () => {
		const updateMany = mock(async () => ({ count: 1 }));
		const salesHistoryCreate = mock(async () => ({}));
		const tx = {
			salesProductionSubmissionMaterialReview: {
				findUniqueOrThrow: mock(async () => pendingReview()),
				updateMany,
			},
			salesHistory: { create: salesHistoryCreate },
		};
		const db = {
			$transaction: async (callback: any) => callback(tx),
		};
		const evaluateEvidence = mock()
			.mockResolvedValueOnce({
				classification: {
					state: "pending_material_review",
					reason: "AWAITING_INBOUND",
				},
				materialSnapshot: [{ componentId: 100, readiness: "awaiting_inbound" }],
				materialRevision: "before",
			})
			.mockResolvedValueOnce({
				classification: { state: "finalized", reason: null },
				materialSnapshot: [{ componentId: 100, readiness: "fulfilled" }],
				materialRevision: "after",
			});
		const manualFulfill = mock(async () => ({
			fulfilledComponentCount: 1,
		}));
		const resetSales = mock(async () => ({}));

		const result = await decideProductionSubmissionMaterialReview(
			db as never,
			{
				reviewId: 55,
				expectedUpdatedAt: new Date("2026-07-30T12:00:00.000Z"),
				action: "MARK_AVAILABLE_AND_APPROVE",
				note: "Materials are physically available.",
			},
			{ id: 9, name: "Admin" },
			{
				evaluateEvidence: evaluateEvidence as never,
				manualFulfill: manualFulfill as never,
				resetSales: resetSales as never,
				onApproved: mock(async () => {}),
			},
		);

		expect(manualFulfill).toHaveBeenCalledWith(
			tx,
			{
				salesOrderId: 42,
				lineItemComponentIds: [100],
				authorName: "Admin",
				triggeredByUserId: 9,
			},
			{ writeHistory: false },
		);
		expect(updateMany).toHaveBeenCalledWith({
			where: {
				id: 55,
				status: "PENDING",
				updatedAt: new Date("2026-07-30T12:00:00.000Z"),
			},
			data: expect.objectContaining({
				status: "APPROVED",
				reviewedById: 9,
				decisionNote: "Materials are physically available.",
				materialRevision: "after",
			}),
		});
		expect(resetSales).toHaveBeenCalledWith(tx, 42);
		expect(result).toEqual({
			reviewId: 55,
			status: "APPROVED",
			materialRevision: "after",
		});
	});

	it("approves an explicit configuration exception without fabricating stock", async () => {
		const updateMany = mock(async () => ({ count: 1 }));
		const onApproved = mock(async () => {});
		const tx = {
			salesProductionSubmissionMaterialReview: {
				findUniqueOrThrow: mock(async () => pendingReview()),
				updateMany,
			},
			salesHistory: { create: mock(async () => ({})) },
		};
		const evidence = {
			classification: {
				state: "pending_material_review" as const,
				reason: "NOT_CONFIGURED" as const,
			},
			materialSnapshot: [{ componentId: null, readiness: "not_configured" }],
			materialRevision: "configuration-missing",
		};

		const result = await decideProductionSubmissionMaterialReview(
			{
				$transaction: async (
					callback: (client: typeof tx) => Promise<unknown>,
				) => callback(tx),
			} as never,
			{
				reviewId: 55,
				expectedUpdatedAt: new Date("2026-07-30T12:00:00.000Z"),
				action: "APPROVE_CONFIGURATION_EXCEPTION",
				note: "Approved by the explicit one-click fulfillment confirmation.",
			},
			{ id: 9, name: "Admin" },
			{
				evaluateEvidence: mock(async () => evidence) as never,
				resetSales: mock(async () => {}) as never,
				onApproved,
			},
		);

		expect(result).toEqual({
			reviewId: 55,
			status: "APPROVED",
			materialRevision: "configuration-missing",
		});
		expect(updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					status: "APPROVED",
					resolution: expect.objectContaining({
						action: "APPROVE_CONFIGURATION_EXCEPTION",
						configurationException: true,
						noPhysicalStockChange: true,
					}),
				}),
			}),
		);
		expect(onApproved).toHaveBeenCalledTimes(1);
	});

	it("rejects a configuration exception for a configured material blocker", async () => {
		const updateMany = mock(async () => ({ count: 1 }));
		const tx = {
			salesProductionSubmissionMaterialReview: {
				findUniqueOrThrow: mock(async () => pendingReview()),
				updateMany,
			},
		};

		await expect(
			decideProductionSubmissionMaterialReview(
				{
					$transaction: async (
						callback: (client: typeof tx) => Promise<unknown>,
					) => callback(tx),
				} as never,
				{
					reviewId: 55,
					expectedUpdatedAt: new Date("2026-07-30T12:00:00.000Z"),
					action: "APPROVE_CONFIGURATION_EXCEPTION",
					note: "This must not bypass configured inventory.",
				},
				{ id: 9, name: "Admin" },
				{
					evaluateEvidence: mock(async () => ({
						classification: {
							state: "pending_material_review" as const,
							reason: "BLOCKED" as const,
						},
						materialSnapshot: [{ componentId: 101, readiness: "unavailable" }],
						materialRevision: "configured-blocker",
					})) as never,
				},
			),
		).rejects.toThrow(
			"A configuration exception can only approve an unconfigured production review.",
		);
		expect(updateMany).not.toHaveBeenCalled();
	});

	it("rejects a pending review and releases reported work from projections", async () => {
		const updateMany = mock(async () => ({ count: 1 }));
		const tx = {
			salesProductionSubmissionMaterialReview: {
				findUniqueOrThrow: mock(async () => pendingReview()),
				updateMany,
			},
			orderProductionSubmissions: {
				updateMany: mock(async () => ({ count: 1 })),
			},
			salesHistory: { create: mock(async () => ({})) },
		};
		const resetSales = mock(async () => ({}));
		const db = {
			$transaction: async (callback: any) => callback(tx),
		};

		const result = await decideProductionSubmissionMaterialReview(
			db as never,
			{
				reviewId: 55,
				expectedUpdatedAt: new Date("2026-07-30T12:00:00.000Z"),
				action: "REJECT",
				note: "Production report needs correction.",
			},
			{ id: 9, name: "Admin" },
			{ resetSales: resetSales as never },
		);

		expect(updateMany).toHaveBeenCalledWith({
			where: {
				id: 55,
				status: "PENDING",
				updatedAt: new Date("2026-07-30T12:00:00.000Z"),
			},
			data: expect.objectContaining({
				status: "REJECTED",
				reviewedById: 9,
			}),
		});
		expect(resetSales).toHaveBeenCalledWith(tx, 42);
		expect(tx.orderProductionSubmissions.updateMany).toHaveBeenCalledWith({
			where: {
				id: { in: [91] },
				deletedAt: null,
			},
			data: { deletedAt: expect.any(Date) },
		});
		expect(result).toEqual({ reviewId: 55, status: "REJECTED" });
	});

	it("applies mixed inbound and manual resolutions in one review", async () => {
		const updateMany = mock(async () => ({ count: 1 }));
		const tx = {
			salesProductionSubmissionMaterialReview: {
				findUniqueOrThrow: mock(async () => pendingReview()),
				updateMany,
			},
			inboundShipmentItem: {
				count: mock(async () => 1),
			},
			salesHistory: { create: mock(async () => ({})) },
		};
		const db = {
			$transaction: async (callback: any) => callback(tx),
		};
		const evaluateEvidence = mock()
			.mockResolvedValueOnce({
				classification: {
					state: "pending_material_review",
					reason: "AWAITING_INBOUND",
				},
				materialSnapshot: [
					{ componentId: 100, readiness: "awaiting_inbound" },
					{ componentId: 101, readiness: "blocked" },
				],
				materialRevision: "before",
			})
			.mockResolvedValueOnce({
				classification: { state: "finalized", reason: null },
				materialSnapshot: [
					{ componentId: 100, readiness: "fulfilled" },
					{ componentId: 101, readiness: "fulfilled" },
				],
				materialRevision: "after",
			});
		const receiveInbound = mock(async () => ({ inboundId: 80 }));
		const manualFulfill = mock(async () => ({
			fulfilledComponentCount: 1,
		}));

		const result = await decideProductionSubmissionMaterialReview(
			db as never,
			{
				reviewId: 55,
				expectedUpdatedAt: new Date("2026-07-30T12:00:00.000Z"),
				action: "RESOLVE_AND_APPROVE",
				note: "Confirmed receipt and remaining materials.",
				resolutions: {
					receipts: [
						{
							inboundId: 80,
							items: [
								{
									inboundShipmentItemId: 800,
									qtyGood: 2,
									qtyIssue: 0,
								},
							],
						},
					],
					markAvailableComponentIds: [101],
				},
			},
			{ id: 9, name: "Admin" },
			{
				evaluateEvidence: evaluateEvidence as never,
				receiveInbound: receiveInbound as never,
				manualFulfill: manualFulfill as never,
				resetSales: mock(async () => {}) as never,
				onApproved: mock(async () => {}),
			},
		);

		expect(receiveInbound).toHaveBeenCalledTimes(1);
		expect(manualFulfill).toHaveBeenCalledWith(
			tx,
			expect.objectContaining({
				lineItemComponentIds: [101],
			}),
			{ writeHistory: false },
		);
		expect(result).toMatchObject({
			status: "APPROVED",
			materialRevision: "after",
		});
	});

	it("keeps the review pending and commits refreshed evidence when blockers remain", async () => {
		const updateMany = mock(async () => ({ count: 1 }));
		const tx = {
			salesProductionSubmissionMaterialReview: {
				findUniqueOrThrow: mock(async () => pendingReview()),
				updateMany,
			},
			salesHistory: { create: mock(async () => ({})) },
		};
		const evidence = {
			classification: {
				state: "pending_material_review" as const,
				reason: "BLOCKED" as const,
			},
			materialSnapshot: [{ componentId: 100, readiness: "blocked" }],
			materialRevision: "still-blocked",
		};

		const result = await decideProductionSubmissionMaterialReview(
			{ $transaction: async (callback: any) => callback(tx) } as never,
			{
				reviewId: 55,
				expectedUpdatedAt: new Date("2026-07-30T12:00:00.000Z"),
				action: "RECHECK_AND_APPROVE",
				note: "Rechecked current status.",
			},
			{ id: 9, name: "Admin" },
			{
				evaluateEvidence: mock(async () => evidence) as never,
			},
		);

		expect(result).toMatchObject({
			reviewId: 55,
			status: "PENDING",
			reason: "BLOCKED",
		});
		expect(updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					classificationReason: "BLOCKED",
					materialRevision: "still-blocked",
				}),
			}),
		);
	});

	it("returns the existing final decision for a repeated request", async () => {
		const review = {
			...pendingReview(),
			status: "APPROVED",
			materialRevision: "approved-revision",
		};
		const db = {
			$transaction: async (callback: any) =>
				callback({
					salesProductionSubmissionMaterialReview: {
						findUniqueOrThrow: mock(async () => review),
					},
				}),
		};

		const result = await decideProductionSubmissionMaterialReview(
			db as never,
			{
				reviewId: 55,
				expectedUpdatedAt: review.updatedAt,
				action: "RECHECK_AND_APPROVE",
				note: "Retry",
			},
			{ id: 9, name: "Admin" },
		);

		expect(result).toEqual({
			reviewId: 55,
			status: "APPROVED",
			materialRevision: "approved-revision",
			idempotentReplay: true,
		});
	});
});

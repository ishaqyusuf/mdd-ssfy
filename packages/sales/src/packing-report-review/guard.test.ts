import { describe, expect, it } from "bun:test";

import {
	assertNoPendingPackingReports,
	lockAndAssertNoPendingPackingReports,
	pendingPackingReviewAllowsDelivery,
} from "./guard";

describe("pending packing report downstream hold", () => {
	it("blocks packing, trip start, loading, and completion while pending", async () => {
		await expect(
			assertNoPendingPackingReports(
				{
					salesPackingReport: {
						count: async () => 1,
					},
				} as Parameters<typeof assertNoPendingPackingReports>[0],
				{ dispatchId: 41, salesOrderId: 51 },
			),
		).rejects.toThrow("cannot start, load, or complete");
	});

	it("allows downstream commands when no report is pending", async () => {
		await expect(
			assertNoPendingPackingReports(
				{
					salesPackingReport: {
						count: async () => 0,
					},
				} as Parameters<typeof assertNoPendingPackingReports>[0],
				{ dispatchId: 41, salesOrderId: 51 },
			),
		).resolves.toBeUndefined();
	});

	it("allows delivery progression for reports created under the non-blocking policy", async () => {
		await expect(
			assertNoPendingPackingReports(
				{
					salesPackingReport: {
						findMany: async () => [
							{
								evidenceSnapshot: {
									policy: {
										enabled: true,
										allowAwaitingProductionSubmission: true,
										allowPendingMaterialReview: true,
										reviewMode: "ALLOW_DELIVERY_WHILE_PENDING",
										notifySalesRep: true,
										createProductionEvidenceOnApproval: true,
										revision: 3,
										changedAt: "2026-08-28T12:00:00.000Z",
									},
								},
							},
						],
					},
				} as Parameters<typeof assertNoPendingPackingReports>[0],
				{ dispatchId: 41, salesOrderId: 51 },
				{ allowDeliveryWhilePending: true },
			),
		).resolves.toBeUndefined();
	});

	it("uses the current relaxed policy for reports created under an older blocking revision", async () => {
		await expect(
			assertNoPendingPackingReports(
				{
					settings: {
						findFirst: async () => ({
							meta: {
								guardedPacking: {
									enabled: true,
									allowAwaitingProductionSubmission: true,
									allowPendingMaterialReview: true,
									reviewMode: "ALLOW_DELIVERY_WHILE_PENDING",
									notifySalesRep: true,
									createProductionEvidenceOnApproval: true,
									revision: 4,
									changedAt: "2026-08-29T12:00:00.000Z",
								},
							},
						}),
					},
					salesPackingReport: {
						findMany: async () => [
							{
								evidenceSnapshot: {
									policy: {
										enabled: true,
										allowAwaitingProductionSubmission: true,
										allowPendingMaterialReview: true,
										reviewMode: "BLOCK_DELIVERY_UNTIL_APPROVED",
										notifySalesRep: true,
										createProductionEvidenceOnApproval: true,
										revision: 3,
										changedAt: "2026-08-28T12:00:00.000Z",
									},
								},
							},
						],
					},
				} as Parameters<typeof assertNoPendingPackingReports>[0],
				{ dispatchId: 41, salesOrderId: 51 },
				{ allowDeliveryWhilePending: true },
			),
		).resolves.toBeUndefined();
	});

	it("still blocks packing edits for a non-blocking delivery report", async () => {
		const evidenceSnapshot = {
			policy: {
				...{
					enabled: true,
					allowAwaitingProductionSubmission: true,
					allowPendingMaterialReview: true,
					notifySalesRep: true,
					createProductionEvidenceOnApproval: true,
				},
				reviewMode: "ALLOW_DELIVERY_WHILE_PENDING",
				revision: 1,
				changedAt: "2026-08-28T12:00:00.000Z",
			},
		};
		await expect(
			assertNoPendingPackingReports(
				{
					salesPackingReport: {
						findMany: async () => [{ evidenceSnapshot }],
					},
				} as Parameters<typeof assertNoPendingPackingReports>[0],
				{ dispatchId: 41, salesOrderId: 51 },
			),
		).rejects.toThrow("cannot start, load, or complete");
	});

	it("identifies a pending physical-verification report released for delivery", async () => {
		const allowed = await pendingPackingReviewAllowsDelivery(
			{
				salesPackingReport: {
					findMany: async () => [
						{
							evidenceSnapshot: {
								policy: {
									enabled: true,
									allowAwaitingProductionSubmission: true,
									allowPendingMaterialReview: true,
									reviewMode: "ALLOW_DELIVERY_WHILE_PENDING",
									notifySalesRep: true,
									createProductionEvidenceOnApproval: true,
									revision: 3,
									changedAt: "2026-08-28T12:00:00.000Z",
								},
							},
						},
					],
				},
			} as Parameters<typeof pendingPackingReviewAllowsDelivery>[0],
			{ dispatchId: 41, salesOrderId: 51 },
		);

		expect(allowed).toBe(true);
	});

	it("locks the dispatch before checking the fail-closed hold", async () => {
		const calls: string[] = [];
		const db = {
			$queryRaw: async () => calls.push("lock"),
			salesPackingReport: {
				count: async () => {
					calls.push("hold");
					return 0;
				},
			},
		} as Parameters<typeof lockAndAssertNoPendingPackingReports>[0];
		await lockAndAssertNoPendingPackingReports(db, {
			dispatchId: 41,
			salesOrderId: 51,
		});
		expect(calls).toEqual(["lock", "hold"]);
	});

	it("fails closed when the packing-report model is unavailable", async () => {
		await expect(
			assertNoPendingPackingReports(
				{} as Parameters<typeof assertNoPendingPackingReports>[0],
				{
					dispatchId: 41,
					salesOrderId: 51,
				},
			),
		).rejects.toThrow();
	});
});

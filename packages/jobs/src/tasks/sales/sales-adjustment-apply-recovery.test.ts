import { describe, expect, test } from "bun:test";

import {
	SALES_ADJUSTMENT_APPLY_LEASE_MS,
	claimExpiredSalesAdjustmentApply,
	getCommittedSalesAdjustmentCheckpoint,
	resolveSalesAdjustmentApplyRecovery,
} from "./sales-adjustment-apply-recovery";

describe("resolveSalesAdjustmentApplyRecovery", () => {
	test("schedules delayed recovery while the apply lease is live", () => {
		const updatedAt = new Date("2026-08-06T10:00:00.000Z");
		const result = resolveSalesAdjustmentApplyRecovery({
			status: "APPLYING",
			updatedAt,
			now: new Date(updatedAt.getTime() + 10_000),
		});

		expect(result.action).toBe("schedule");
		expect(result.recoverAt?.getTime()).toBe(
			updatedAt.getTime() + SALES_ADJUSTMENT_APPLY_LEASE_MS,
		);
	});

	test("takes over an expired apply lease", () => {
		const updatedAt = new Date("2026-08-06T10:00:00.000Z");
		expect(
			resolveSalesAdjustmentApplyRecovery({
				status: "APPLYING",
				updatedAt,
				now: new Date(
					updatedAt.getTime() + SALES_ADJUSTMENT_APPLY_LEASE_MS + 1,
				),
			}).action,
		).toBe("takeover");
	});

	test("does not recover a terminal adjustment", () => {
		expect(
			resolveSalesAdjustmentApplyRecovery({
				status: "APPLIED",
				updatedAt: new Date(),
			}).action,
		).toBe("none");
	});

	test("allows only one expired worker to take over the observed lease", async () => {
		const observedUpdatedAt = new Date("2026-08-06T10:00:00.000Z");
		let currentUpdatedAt = observedUpdatedAt;
		const store = {
			updateMany: async (input: {
				where: { updatedAt: Date };
			}) => {
				if (input.where.updatedAt.getTime() !== currentUpdatedAt.getTime()) {
					return { count: 0 };
				}
				currentUpdatedAt = new Date(currentUpdatedAt.getTime() + 1);
				return { count: 1 };
			},
		};

		const claims = await Promise.all([
			claimExpiredSalesAdjustmentApply(store, {
				adjustmentId: "adjustment-1",
				observedUpdatedAt,
			}),
			claimExpiredSalesAdjustmentApply(store, {
				adjustmentId: "adjustment-1",
				observedUpdatedAt,
			}),
		]);

		expect(claims.map((claim) => claim.count)).toEqual([1, 0]);
	});

	test("reads the committed checkpoint independently of mutable form metadata", () => {
		const checkpoint = getCommittedSalesAdjustmentCheckpoint({
			applyCheckpoint: {
				stage: "COMMERCIAL_COMMITTED",
				inboundReconciliation: { adjustedDemandCount: 1 },
			},
		});

		expect(checkpoint?.stage).toBe("COMMERCIAL_COMMITTED");
		expect(checkpoint?.inboundReconciliation).toEqual({
			adjustedDemandCount: 1,
		});
	});
});

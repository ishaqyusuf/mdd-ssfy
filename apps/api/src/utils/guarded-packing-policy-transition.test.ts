import { describe, expect, it, mock } from "bun:test";
import { DEFAULT_GUARDED_PACKING_POLICY } from "@gnd/settings";

import { applyGuardedPackingPolicyTransition } from "./guarded-packing-policy-transition";

describe("guarded packing policy transition", () => {
	it("reconciles pending dispatches and notifies assigned drivers when approval stops blocking delivery", async () => {
		const reconcile = mock(async () => ({ readyDispatchIds: [41, 42] }));
		const notify = mock(async () => ({
			sent: true as const,
			activityIds: [9],
		}));
		const db = {
			salesPackingReport: {
				findMany: async () => [
					{ orderDeliveryId: 41 },
					{ orderDeliveryId: 42 },
					{ orderDeliveryId: 43 },
				],
			},
			orderDelivery: {
				findMany: async () => [
					{
						id: 41,
						driverId: 7,
						dueDate: new Date("2026-09-01T00:00:00.000Z"),
						deliveryMode: "delivery",
						order: { orderId: "09100PC" },
					},
					{
						id: 42,
						driverId: null,
						dueDate: null,
						deliveryMode: "pickup",
						order: { orderId: "09101PC" },
					},
				],
			},
		};

		const result = await applyGuardedPackingPolicyTransition(
			{ db: db as never, actorUserId: 3 },
			{
				previous: DEFAULT_GUARDED_PACKING_POLICY,
				next: {
					...DEFAULT_GUARDED_PACKING_POLICY,
					reviewMode: "ALLOW_DELIVERY_WHILE_PENDING",
					revision: 1,
				},
			},
			{ reconcile, notify },
		);

		expect(reconcile).toHaveBeenCalledWith(db, [41, 42, 43]);
		expect(notify).toHaveBeenCalledTimes(1);
		expect(notify.mock.calls[0]?.slice(1, 4)).toEqual([
			3,
			7,
			"sales_dispatch_approval_pending_released",
		]);
		expect(result).toEqual({
			pendingDispatchCount: 3,
			readyDispatchCount: 2,
			notifiedDriverCount: 1,
			notificationFailureCount: 0,
		});
	});

	it("does nothing for changes that do not relax pending approval", async () => {
		const findMany = mock(async () => []);
		const result = await applyGuardedPackingPolicyTransition(
			{
				db: { salesPackingReport: { findMany } } as never,
				actorUserId: 3,
			},
			{
				previous: DEFAULT_GUARDED_PACKING_POLICY,
				next: { ...DEFAULT_GUARDED_PACKING_POLICY, revision: 1 },
			},
		);

		expect(findMany).not.toHaveBeenCalled();
		expect(result).toEqual({
			pendingDispatchCount: 0,
			readyDispatchCount: 0,
			notifiedDriverCount: 0,
			notificationFailureCount: 0,
		});
	});

	it("fails the policy transaction when an assigned driver cannot be notified", async () => {
		const notify = mock(async () => ({
			sent: false as const,
			reason: "DELIVERY_FAILED" as const,
		}));
		const db = {
			salesPackingReport: {
				findMany: async () => [{ orderDeliveryId: 41 }],
			},
			orderDelivery: {
				findMany: async () => [
					{
						id: 41,
						driverId: 7,
						dueDate: null,
						deliveryMode: "delivery",
						order: { orderId: "09100PC" },
					},
				],
			},
		};

		await expect(
			applyGuardedPackingPolicyTransition(
				{ db: db as never, actorUserId: 3 },
				{
					previous: DEFAULT_GUARDED_PACKING_POLICY,
					next: {
						...DEFAULT_GUARDED_PACKING_POLICY,
						reviewMode: "ALLOW_DELIVERY_WHILE_PENDING",
						revision: 1,
					},
				},
				{
					reconcile: async () => ({ readyDispatchIds: [41] }),
					notify,
				},
			),
		).rejects.toThrow("delivery policy was not changed");
	});

	it("fails safely before reconciling an unbounded pending-dispatch set", async () => {
		const reconcile = mock(async () => ({ readyDispatchIds: [] }));
		const db = {
			salesPackingReport: {
				findMany: async () =>
					Array.from({ length: 101 }, (_, index) => ({
						orderDeliveryId: index + 1,
					})),
			},
		};

		await expect(
			applyGuardedPackingPolicyTransition(
				{ db: db as never, actorUserId: 3 },
				{
					previous: DEFAULT_GUARDED_PACKING_POLICY,
					next: {
						...DEFAULT_GUARDED_PACKING_POLICY,
						reviewMode: "ALLOW_DELIVERY_WHILE_PENDING",
						revision: 1,
					},
				},
				{ reconcile },
			),
		).rejects.toThrow("limited to 100 pending dispatches");
		expect(reconcile).not.toHaveBeenCalled();
	});
});

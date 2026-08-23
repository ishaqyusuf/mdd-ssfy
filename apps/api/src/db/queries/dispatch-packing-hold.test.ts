import { describe, expect, it, mock } from "bun:test";

import {
	assertDispatchDeletionPackingAllowed,
	assertDispatchStatusPackingAllowed,
} from "./dispatch-status-packing-hold";

describe("alternate dispatch status packing-report hold", () => {
	it("blocks a direct status transition before the writer runs", async () => {
		const tx = {
			$queryRaw: async () => [{ id: 41 }],
			salesPackingReport: { count: async () => 1 },
		};
		await expect(
			assertDispatchStatusPackingAllowed(
				tx as Parameters<typeof assertDispatchStatusPackingAllowed>[0],
				{
					dispatchId: 41,
					salesOrderId: 91,
					newStatus: "in progress",
				},
			),
		).rejects.toThrow("awaiting packing report review");
	});

	it("does not hold cancellation or queue corrections", async () => {
		const count = mock(async () => 1);
		await assertDispatchStatusPackingAllowed(
			{ salesPackingReport: { count } } as Parameters<
				typeof assertDispatchStatusPackingAllowed
			>[0],
			{ dispatchId: 41, salesOrderId: 91, newStatus: "cancelled" },
		);
		expect(count).not.toHaveBeenCalled();
	});

	it("locks every deleted dispatch and rejects before soft deletion when one has a pending report", async () => {
		const calls: string[] = [];
		const tx = {
			$queryRaw: async () => {
				calls.push("lock");
				return [{ id: 41 }];
			},
			salesPackingReport: {
				count: async ({
					where,
				}: {
					where: { orderDeliveryId: number };
				}) => {
					calls.push(`hold:${where.orderDeliveryId}`);
					return where.orderDeliveryId === 42 ? 1 : 0;
				},
			},
		};

		await expect(
			assertDispatchDeletionPackingAllowed(
				tx as Parameters<typeof assertDispatchDeletionPackingAllowed>[0],
				{
					dispatchIds: [42, 41, 42],
					salesOrderId: 91,
				},
			),
		).rejects.toThrow("awaiting packing report review");
		expect(calls).toEqual(["lock", "hold:41", "lock", "hold:42"]);
	});
});

import { describe, expect, test } from "bun:test";

import { cleanupSalesInventoryRepairResidue } from "./sales-inventory-repair";

describe("cleanupSalesInventoryRepairResidue", () => {
	test("repairs only safe rows attached to deleted or cancelled components", async () => {
		const calls: Array<{ type: string; payload: unknown }> = [];
		const db = {
			stockAllocation: {
				updateMany: async (payload: unknown) => {
					calls.push({ type: "allocation", payload });
					return { count: 2 };
				},
			},
			inboundDemand: {
				updateMany: async (payload: unknown) => {
					calls.push({ type: "demand", payload });
					return { count: 3 };
				},
			},
		};

		const result = await cleanupSalesInventoryRepairResidue(db as never, {
			salesOrderId: 42,
		});

		expect(result).toEqual({
			releasedAllocationCount: 2,
			cancelledDemandCount: 3,
		});
		expect(calls).toHaveLength(2);
		for (const call of calls) {
			expect(call.payload).toMatchObject({
				where: {
					deletedAt: null,
					lineItemComponent: {
						is: {
							OR: [
								{
									parent: {
										is: {
											saleId: 42,
											deletedAt: { not: null },
										},
									},
								},
								{
									status: "cancelled",
									parent: {
										is: {
											saleId: 42,
										},
									},
								},
							],
						},
					},
				},
			});
		}
		expect(calls.find((call) => call.type === "demand")?.payload).toMatchObject(
			{
				where: {
					status: { in: ["pending", "ordered"] },
					qtyReceived: { lte: 0 },
					inboundShipmentItemId: null,
				},
				data: {
					status: "cancelled",
				},
			},
		);
		expect(
			calls.find((call) => call.type === "allocation")?.payload,
		).toMatchObject({
			where: {
				status: { in: ["pending_review", "approved", "reserved"] },
			},
			data: {
				status: "released",
			},
		});
	});
});

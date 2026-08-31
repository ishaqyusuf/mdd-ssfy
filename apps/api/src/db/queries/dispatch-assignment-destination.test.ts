import { describe, expect, it } from "bun:test";
import { TRPCError } from "@trpc/server";

import {
	assertDispatchAssignmentDestinations,
	getDispatchAssignmentDestinationPreflight,
} from "./dispatch-assignment-destination";

function makeContext() {
	return {
		db: {
			salesOrders: {
				findMany: async () => [
					{
						id: 11,
						orderId: "ORDER-11",
						customer: { id: 1, name: "Ready", businessName: null },
						shippingAddress: {
							address1: "100 Ready Ave",
							address2: null,
							city: "Miami",
							state: "FL",
							country: "US",
							meta: {
								placeId: "ready-place",
								lat: 25.7,
								lng: -80.3,
								formattedAddress: "100 Ready Ave, Miami, FL",
							},
						},
					},
					{
						id: 12,
						orderId: "ORDER-12",
						customer: { id: 2, name: "Legacy", businessName: null },
						shippingAddress: {
							address1: "200 Legacy Rd",
							address2: null,
							city: "Miami",
							state: "FL",
							country: "US",
							meta: {},
						},
					},
				],
			},
		},
	} as any;
}

describe("dispatch assignment destination preflight", () => {
	it("returns only orders missing a Google-verified delivery address", async () => {
		const result = await getDispatchAssignmentDestinationPreflight(
			makeContext(),
			{ salesIds: [11, 12], deliveryMode: "delivery" },
		);

		expect(result.ready.map((item) => item.salesId)).toEqual([11]);
		expect(result.missing).toHaveLength(1);
		expect(result.missing[0]).toMatchObject({
			orderNo: "ORDER-12",
			primaryAddress: "200 Legacy Rd, Miami FL, US",
			salesId: 12,
		});
	});

	it("fails the assignment boundary before a driver write can begin", async () => {
		try {
			await assertDispatchAssignmentDestinations(makeContext(), {
				salesIds: [11, 12],
				deliveryMode: "delivery",
			});
			throw new Error("Expected assignment preflight to fail");
		} catch (error) {
			expect(error).toBeInstanceOf(TRPCError);
			expect((error as Error).message).toContain("Order ORDER-12");
		}
	});

	it("does not require a customer destination for warehouse pickup", async () => {
		const result = await getDispatchAssignmentDestinationPreflight(
			makeContext(),
			{ salesIds: [11, 12], deliveryMode: "pickup" },
		);

		expect(result.missing).toHaveLength(0);
		expect(result.ready).toHaveLength(2);
	});
});

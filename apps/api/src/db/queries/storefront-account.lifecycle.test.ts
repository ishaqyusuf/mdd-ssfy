import { describe, expect, it } from "bun:test";

import { listStorefrontOrders } from "./storefront-account";

describe("storefront canonical lifecycle projection", () => {
	it("keeps an existing order visible with explicit unavailable status", async () => {
		const createdAt = new Date("2026-09-01T12:00:00.000Z");
		const order = {
			id: 77,
			orderId: "ORDER-77",
			slug: "order-77",
			status: "Processing",
			prodStatus: null,
			invoiceStatus: "Paid",
			salesChannel: "storefront",
			createdAt,
			updatedAt: createdAt,
			deliveredAt: null,
			grandTotal: 100,
			amountDue: 0,
			deliveryOption: "delivery",
			items: [
				{ id: 1, description: "Garage door", qty: 1, price: 100, total: 100 },
			],
			deliveries: [],
		};
		const db = {
			salesOrders: {
				findMany: async ({ select }: { select?: Record<string, unknown> }) =>
					select?.slug ? [order] : [],
			},
		};

		const result = await listStorefrontOrders(
			{ db, customerId: 42, userId: 9 } as never,
			{ status: "all", limit: 20 },
		);

		expect(result.items).toHaveLength(1);
		expect(result.items[0]).toMatchObject({
			id: 77,
			status: "unknown",
			statusLabel: "Status unavailable",
			pipeline: {
				production: { state: "unknown" },
				fulfillment: { state: "unknown" },
			},
		});
	});
});

import { describe, expect, it } from "bun:test";
import { getSalesHx } from "./sales-hx";

describe("getSalesHx", () => {
	it("returns saved snapshot records with matching author activity", async () => {
		const ctx = {
			db: {
				notePad: {
					findMany: async () => [
						{
							id: 10,
							createdAt: new Date("2026-07-18T12:00:00.000Z"),
							senderContact: { name: "Pat Admin" },
							tags: [
								{ tagName: "salesNo", tagValue: "00100AA-hx01" },
								{
									tagName: "activity",
									tagValue: "sales_invoice_updated",
								},
							],
						},
					],
				},
				salesOrders: {
					findMany: async () => [
						{
							id: 101,
							orderId: "00100AA-hx01",
							slug: "00100AA-hx01",
							type: "order-hx",
							createdAt: new Date("2026-07-18T11:59:59.000Z"),
							updatedAt: new Date("2026-07-18T12:00:00.000Z"),
							subTotal: 100,
							tax: 7,
							grandTotal: 107,
							customerProfileId: 3,
							salesProfile: { title: "Builder" },
							_count: { items: 2 },
						},
					],
				},
			},
		};

		const history = await getSalesHx(ctx as any, { salesNo: "00100AA" });

		expect(history).toHaveLength(1);
		expect(history[0]).toMatchObject({
			id: 101,
			orderId: "00100AA-hx01",
			authorName: "Pat Admin",
			grandTotal: 107,
			customerProfileName: "Builder",
			lineItemCount: 2,
		});
	});
});

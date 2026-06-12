import { describe, expect, test } from "bun:test";

import { buildInventoryPrintPage } from "./inventory-print-data";

describe("buildInventoryPrintPage", () => {
	test("outputs current sales print template page data from inventory lines", () => {
		const page = buildInventoryPrintPage(
			{
				orderId: "0001",
				createdAt: new Date("2026-06-11T10:00:00.000Z"),
				amountDue: 0,
				grandTotal: 1200,
				goodUntil: null,
				paymentTerm: "None",
				meta: {},
				payments: [],
				customer: {
					name: "Ada Customer",
					businessName: "Ada Builds",
					phoneNo: "305-555-0100",
					email: "ADA@example.com",
				},
				billingAddress: null,
				shippingAddress: null,
				salesRep: {
					name: "Sales Rep",
				},
				lineItems: [
					{
						id: 1,
						title: "Door package",
						qty: 10,
						components: [
							{
								id: 10,
								required: true,
								qty: 10,
								inventory: {
									name: "Hinge set",
									defaultSupplier: {
										id: 100,
										name: "Hardware Co",
									},
								},
								inventoryVariant: {
									id: 20,
									sku: "HINGE-BLK",
									description: "Black hinge set",
								},
								stockAllocations: [{ qty: 6, status: "reserved" }],
								inboundDemands: [
									{ qty: 4, qtyReceived: 0, status: "ordered" },
								],
							},
						],
					},
				],
			} as any,
			"production",
		);

		expect(page).toMatchObject({
			meta: {
				title: "Production",
				salesNo: "0001",
				total: "$1,200.00",
			},
			config: {
				mode: "production",
				showPrices: false,
			},
			footer: null,
			signing: null,
		});
		expect(page.sections).toHaveLength(1);
		expect(page.sections[0]).toMatchObject({
			kind: "line-item",
			title: "Inventory Production BOM",
		});
		expect(page.sections[0]?.headers.map((header) => header.title)).toEqual([
			"#",
			"Line Item",
			"Component",
			"SKU",
			"Req.",
			"Alloc.",
			"Inbound",
			"Backorder",
			"Status",
		]);
		expect(page.sections[0]?.rows[0]?.cells.map((cell) => cell.value)).toEqual([
			1,
			"Door package",
			"Hinge set",
			"HINGE-BLK",
			10,
			6,
			4,
			4,
			"Awaiting Inbound",
		]);
	});
});

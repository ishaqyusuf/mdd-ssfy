import { describe, expect, test } from "bun:test";

import { buildInventoryPrintPage } from "./inventory-print-data";

function inventoryPrintSaleFixture(overrides: Record<string, unknown> = {}) {
	return {
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
						inboundDemands: [{ qty: 4, qtyReceived: 0, status: "ordered" }],
					},
				],
			},
		],
		...overrides,
	} as any;
}

function firstSection(page: ReturnType<typeof buildInventoryPrintPage>) {
	return page.sections[0]!;
}

function firstRowValues(page: ReturnType<typeof buildInventoryPrintPage>) {
	return firstSection(page).rows[0]?.cells.map((cell) => cell.value);
}

describe("buildInventoryPrintPage", () => {
	test("outputs current sales print template page data from inventory lines", () => {
		const page = buildInventoryPrintPage(
			inventoryPrintSaleFixture(),
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
		expect(firstSection(page)).toMatchObject({
			kind: "line-item",
			title: "Inventory Production BOM",
		});
		expect(firstSection(page).headers.map((header) => header.title)).toEqual([
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
		expect(firstRowValues(page)).toEqual([
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

	test("emits a pick-list packet for order packing mode", () => {
		const page = buildInventoryPrintPage(
			inventoryPrintSaleFixture({
				lineItems: [
					{
						id: 1,
						title: "Door package",
						qty: 4,
						salesItem: {
							id: 11,
							qty: 4,
							itemDeliveries: [],
						},
						components: [
							{
								id: 10,
								required: true,
								qty: 4,
								stockAllocations: [{ qty: 4, status: "picked" }],
							},
						],
					},
				],
			}),
			"order-packing",
		);

		expect(firstSection(page).title).toBe("Inventory Pick List");
		expect(firstSection(page).headers.map((header) => header.title)).toEqual([
			"#",
			"Line Item",
			"Ordered",
			"Picked",
			"Shipped",
			"Remaining",
			"Backorder",
			"Status",
		]);
		expect(firstRowValues(page)).toEqual([
			1,
			"Door package",
			4,
			4,
			0,
			4,
			0,
			"Ready To Ship Remaining",
		]);
	});

	test("emits a packing-list packet for packing slip mode", () => {
		const page = buildInventoryPrintPage(
			inventoryPrintSaleFixture({
				lineItems: [
					{
						id: 1,
						title: "Door package",
						qty: 4,
						salesItem: {
							id: 11,
							qty: 4,
							itemDeliveries: [{ qty: 2, packingStatus: "packed" }],
						},
						components: [
							{
								id: 10,
								required: true,
								qty: 4,
								stockAllocations: [{ qty: 2, status: "consumed" }],
							},
						],
					},
				],
			}),
			"packing-slip",
		);

		expect(firstSection(page).title).toBe("Inventory Packing List");
		expect(firstRowValues(page)).toEqual([
			1,
			"Door package",
			4,
			2,
			2,
			2,
			2,
			"Partially Fulfilled",
		]);
	});

	test("emits a backorder packet when inventory lines have open shortages", () => {
		const page = buildInventoryPrintPage(inventoryPrintSaleFixture(), "invoice");

		expect(firstSection(page).title).toBe("Inventory Backorder Summary");
		expect(firstRowValues(page)).toEqual([
			1,
			"Door package",
			10,
			6,
			10,
			"Awaiting Inbound",
		]);
	});

	test("emits a customer remaining summary packet when no backorder is open", () => {
		const page = buildInventoryPrintPage(
			inventoryPrintSaleFixture({
				lineItems: [
					{
						id: 1,
						title: "Door package",
						qty: 4,
						salesItem: {
							id: 11,
							qty: 4,
							itemDeliveries: [{ qty: 4, packingStatus: "packed" }],
						},
						components: [
							{
								id: 10,
								required: true,
								qty: 4,
								stockAllocations: [{ qty: 4, status: "consumed" }],
							},
						],
					},
				],
			}),
			"invoice",
		);

		expect(firstSection(page).title).toBe(
			"Inventory Customer Remaining Summary",
		);
		expect(firstRowValues(page)).toEqual([
			1,
			"Door package",
			4,
			4,
			0,
			"Fulfilled",
		]);
	});
});

import { describe, expect, it } from "bun:test";
import { getPrintData } from "./get-print-data";

function createSale() {
	return {
		id: 1,
		orderId: "123ab",
		createdAt: new Date("2026-04-17T10:00:00.000Z"),
		amountDue: 120,
		grandTotal: 470,
		subTotal: 470,
		tax: 0,
		taxPercentage: 0,
		goodUntil: null,
		paymentTerm: "None",
		meta: {},
		payments: [],
		extraCosts: [],
		taxes: [],
		customer: {
			name: "Ada",
			businessName: "Ada Homes",
			phoneNo: "555-1111",
			email: "ada@example.com",
			address: "12 Main St",
		},
		billingAddress: null,
		shippingAddress: null,
		salesRep: {
			name: "Rep One",
		},
		items: [
			{
				id: 101,
				description: "Door line",
				dykeDescription: "Interior Door",
				qty: 1,
				rate: 100,
				total: 100,
				meta: {
					meta: {
						lineIndex: 1,
					},
				},
				formSteps: [
					{
						step: { title: "Item Type" },
						value: "Interior",
						prodUid: "door-root",
					},
				],
				housePackageTool: {
					doorType: "Interior",
					stepProduct: { img: null, door: { img: null }, product: { img: null } },
					doors: [
						{
							id: 201,
							dimension: '2-8 x 7-0',
							swing: "LH",
							unitPrice: 100,
							totalQty: 1,
							lhQty: 1,
							rhQty: 0,
							lineTotal: 100,
							stepProduct: {
								name: "Flush Door",
								door: { title: "Flush Door", img: null },
								product: { title: "Flush Door", img: null },
								img: null,
							},
						},
					],
				},
				multiDyke: false,
				shelfItems: [],
			},
			{
				id: 102,
				description: "Trim line",
				dykeDescription: "Moulding",
				qty: 2,
				rate: 75,
				total: 150,
				meta: {
					meta: {
						lineIndex: 2,
						mouldingRows: [
							{
								uid: "m-1",
								title: "Casing",
								qty: 2,
								salesPrice: 70,
							},
						],
					},
				},
				formSteps: [
					{
						step: { title: "Item Type" },
						value: "Moulding",
					},
					{
						step: { title: "Moulding" },
						meta: {
							selectedComponents: [
								{ uid: "m-1", title: "Casing", img: "casing.png" },
							],
						},
					},
				],
				housePackageTool: null,
				shelfItems: [],
			},
			{
				id: 103,
				description: "Install | Delivery",
				dykeDescription: "Services",
				qty: 2,
				rate: 65,
				total: 130,
				meta: {
					meta: {
						lineIndex: 3,
						serviceRows: [
							{ uid: "svc-1", service: "Install", qty: 1, unitPrice: 80 },
							{ uid: "svc-2", service: "Delivery", qty: 1, unitPrice: 50 },
						],
					},
				},
				formSteps: [
					{
						step: { title: "Item Type" },
						value: "Services",
					},
				],
				housePackageTool: null,
				shelfItems: [],
			},
			{
				id: 104,
				description: "Generic line item",
				swing: "RH",
				qty: 1,
				rate: 40,
				total: 40,
				meta: {
					meta: {
						lineIndex: 4,
					},
				},
				formSteps: [],
				housePackageTool: null,
				shelfItems: [],
			},
			{
				id: 105,
				description: "Shelf line",
				dykeDescription: "Shelf Items",
				meta: {
					meta: {
						lineIndex: 5,
					},
				},
				formSteps: [
					{
						step: { title: "Item Type" },
						value: "Shelf Items",
					},
				],
				housePackageTool: null,
				shelfItems: [
					{
						description: "Shelf Panel",
						qty: 1,
						unitPrice: 50,
						totalPrice: 50,
						shelfProduct: { title: "Shelf Panel", img: null },
					},
				],
			},
		],
	};
}

describe("getPrintData", () => {
	it("orders mixed new-form and legacy sections and excludes grouped rows from generic lines", async () => {
		const db = {
			salesOrders: {
				findMany: async () => [createSale()],
			},
			settings: {
				findFirst: async () => null,
			},
		} as any;

		const result = await getPrintData(db, {
			ids: [1],
			mode: "invoice",
			dispatchId: null,
		});

		expect(result.pages).toHaveLength(1);
		expect(result.pages[0]?.sections.map((section) => section.kind)).toEqual([
			"door",
			"moulding",
			"service",
			"line-item",
			"shelf",
		]);
		expect(result.pages[0]?.sections[1]?.rows).toHaveLength(1);
		expect(result.pages[0]?.sections[2]?.rows).toHaveLength(2);
		expect(result.pages[0]?.sections[3]?.rows).toHaveLength(1);
		expect(result.pages[0]?.sections[3]?.rows[0]?.cells[1]?.value).toBe(
			"GENERIC LINE ITEM",
		);
	});
});

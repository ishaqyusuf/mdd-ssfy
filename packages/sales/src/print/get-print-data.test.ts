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
						qty: 2,
						unitPrice: 12.34,
						totalPrice: 24.68,
						shelfProduct: { title: "Shelf Panel", img: null },
					},
				],
			},
		],
	};
}

function lineValue(lines: Array<{ label: string; value: string }>, label: string) {
	return lines.find((line) => line.label === label)?.value;
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
		} as unknown as Parameters<typeof getPrintData>[0];

		const result = await getPrintData(db, {
			ids: [1],
			mode: "invoice",
			dispatchId: null,
		});

		expect(result.pages).toHaveLength(1);
		expect(result.pages[0]?.billing?.lines.slice(0, 2)).toEqual([
			"ADA HOMES",
			"ADA",
		]);
		expect(result.pages[0]?.shipping?.lines.slice(0, 2)).toEqual([
			"ADA HOMES",
			"ADA",
		]);
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
		expect(result.pages[0]?.sections[4]?.rows[0]?.cells[3]?.value).toBe(
			"$12.34",
		);
		expect(result.pages[0]?.sections[4]?.rows[0]?.cells[4]?.value).toBe(
			"$24.68",
		);
	});

	it("adds derived credit-card ccc to preview total due", async () => {
		const sale = {
			...createSale(),
			amountDue: 1621.05,
			grandTotal: 1621.05,
			subTotal: 1515,
			tax: 106.05,
			taxPercentage: 7,
			meta: {
				newSalesForm: {
					form: {
						paymentMethod: "Credit Card",
					},
				},
				ccc_percentage: 3,
			},
		};
		const db = {
			salesOrders: {
				findMany: async () => [sale],
			},
			settings: {
				findFirst: async () => null,
			},
		} as unknown as Parameters<typeof getPrintData>[0];

		const result = await getPrintData(db, {
			ids: [1],
			mode: "invoice",
			dispatchId: null,
		});
		const footerLines = result.pages[0]?.footer?.lines || [];

		expect(result.pages[0]?.meta.total).toBe("$1,669.68");
		expect(result.pages[0]?.meta.balanceDue).toBe("$1,669.68");
		expect(lineValue(footerLines, "Estimated Card Fee")).toBe("$48.63");
		expect(lineValue(footerLines, "Order Due Amount")).toBe("$1,621.05");
		expect(lineValue(footerLines, "Total if Paying by Card")).toBe(
			"$1,669.68",
		);
	});

	it("prints a simple paid footer for a full single card payment", async () => {
		const sale = {
			...createSale(),
			amountDue: 0,
			grandTotal: 5000,
			subTotal: 5000,
			meta: {
				payment_option: "Credit Card",
				ccc_percentage: 3.5,
			},
			payments: [
				{
					amount: 5000,
					status: "success",
					deletedAt: null,
					createdAt: new Date("2026-06-24T12:00:00.000Z"),
					meta: {
						salesAmount: 5000,
						feeAmount: 175,
						customerChargeAmount: 5175,
						paymentCharges: [
							{
								type: "ccc",
								label: "C.C.C",
								baseAmount: 5000,
								percentage: 3.5,
								amount: 175,
							},
						],
					},
					transaction: { meta: null, paymentMethod: "credit-card" },
					squarePayments: null,
				},
			],
		};
		const db = {
			salesOrders: {
				findMany: async () => [sale],
			},
			settings: {
				findFirst: async () => null,
			},
		} as unknown as Parameters<typeof getPrintData>[0];

		const result = await getPrintData(db, {
			ids: [1],
			mode: "invoice",
			dispatchId: null,
		});
		const footerLines = result.pages[0]?.footer?.lines || [];

		expect(result.pages[0]?.meta.total).toBe("$5,175.00");
		expect(result.pages[0]?.meta.balanceDue).toBeUndefined();
		expect(lineValue(footerLines, "Order Total")).toBe("$5,000.00");
		expect(lineValue(footerLines, "Card Fees")).toBe("$175.00");
		expect(lineValue(footerLines, "Total Paid")).toBe("$5,175.00");
		expect(lineValue(footerLines, "Balance Due")).toBe("$0.00");
	});

	it("summarizes recorded card charges for partial mixed payments", async () => {
		const sale = {
			...createSale(),
			amountDue: 1500,
			grandTotal: 5000,
			subTotal: 5000,
			meta: {
				payment_option: "Credit Card",
				ccc_percentage: 3.5,
			},
			payments: [
				{
					amount: 2500,
					status: "success",
					deletedAt: null,
					createdAt: new Date("2026-06-24T12:00:00.000Z"),
					meta: {
						salesAmount: 2500,
						feeAmount: 87.5,
						customerChargeAmount: 2587.5,
						paymentCharges: [
							{
								type: "ccc",
								label: "C.C.C",
								baseAmount: 2500,
								percentage: 3.5,
								amount: 87.5,
							},
						],
					},
					transaction: { meta: null, paymentMethod: "credit-card" },
					squarePayments: null,
				},
				{
					amount: 1000,
					status: "success",
					deletedAt: null,
					createdAt: new Date("2026-06-24T13:00:00.000Z"),
					meta: {},
					transaction: { meta: null, paymentMethod: "cash" },
					squarePayments: null,
				},
			],
		};
		const db = {
			salesOrders: {
				findMany: async () => [sale],
			},
			settings: {
				findFirst: async () => null,
			},
		} as unknown as Parameters<typeof getPrintData>[0];

		const result = await getPrintData(db, {
			ids: [1],
			mode: "invoice",
			dispatchId: null,
		});
		const footerLines = result.pages[0]?.footer?.lines || [];

		expect(result.pages[0]?.meta.total).toBe("$5,000.00");
		expect(result.pages[0]?.meta.balanceDue).toBe("$1,500.00");
		expect(lineValue(footerLines, "Order Total")).toBe("$5,000.00");
		expect(lineValue(footerLines, "Card Fees")).toBe("$87.50");
		expect(lineValue(footerLines, "Total Paid")).toBe("$3,587.50");
		expect(lineValue(footerLines, "Balance Due")).toBe("$1,500.00");
		expect(lineValue(footerLines, "Card Payment")).toBeUndefined();
		expect(lineValue(footerLines, "C.C.C on Card Payment")).toBeUndefined();
		expect(lineValue(footerLines, "Charged to Card")).toBeUndefined();
	});

	it("aggregates multiple card payments into one customer-facing summary", async () => {
		const sale = {
			...createSale(),
			amountDue: 0,
			grandTotal: 946.2,
			subTotal: 946.2,
			meta: {
				payment_option: "Credit Card",
				ccc_percentage: 3,
			},
			payments: [
				{
					amount: 714.62,
					status: "success",
					deletedAt: null,
					createdAt: new Date("2026-06-24T12:00:00.000Z"),
					meta: {
						salesAmount: 714.62,
						feeAmount: 21.44,
						customerChargeAmount: 736.06,
					},
					transaction: { meta: null, paymentMethod: "credit-card" },
					squarePayments: null,
				},
				{
					amount: 231.58,
					status: "success",
					deletedAt: null,
					createdAt: new Date("2026-06-24T13:00:00.000Z"),
					meta: {
						salesAmount: 231.58,
						feeAmount: 6.95,
						customerChargeAmount: 238.53,
					},
					transaction: { meta: null, paymentMethod: "credit-card" },
					squarePayments: null,
				},
			],
		};
		const db = {
			salesOrders: {
				findMany: async () => [sale],
			},
			settings: {
				findFirst: async () => null,
			},
		} as unknown as Parameters<typeof getPrintData>[0];

		const result = await getPrintData(db, {
			ids: [1],
			mode: "invoice",
			dispatchId: null,
		});
		const footerLines = result.pages[0]?.footer?.lines || [];

		expect(lineValue(footerLines, "Order Total")).toBe("$946.20");
		expect(lineValue(footerLines, "Card Fees")).toBe("$28.39");
		expect(lineValue(footerLines, "Total Paid")).toBe("$974.59");
		expect(lineValue(footerLines, "Balance Due")).toBe("$0.00");
		expect(footerLines.map((line) => line.label)).toEqual([
			"Subtotal",
			"Order Total",
			"Card Fees",
			"Total Paid",
			"Balance Due",
		]);
	});

	it("does not infer fees for a partial card payment without matching metadata", async () => {
		const sale = {
			...createSale(),
			amountDue: 2500,
			grandTotal: 5000,
			subTotal: 5000,
			meta: {
				payment_option: "Credit Card",
				ccc_percentage: 3.5,
			},
			payments: [
				{
					amount: 2500,
					status: "success",
					deletedAt: null,
					createdAt: new Date("2026-06-24T12:00:00.000Z"),
					meta: {},
					transaction: { meta: null, paymentMethod: "credit-card" },
					squarePayments: null,
				},
			],
		};
		const db = {
			salesOrders: {
				findMany: async () => [sale],
			},
			settings: {
				findFirst: async () => null,
			},
		} as unknown as Parameters<typeof getPrintData>[0];

		const result = await getPrintData(db, {
			ids: [1],
			mode: "invoice",
			dispatchId: null,
		});
		const footerLines = result.pages[0]?.footer?.lines || [];

		expect(result.pages[0]?.meta.total).toBe("$5,000.00");
		expect(lineValue(footerLines, "Order Total")).toBe("$5,000.00");
		expect(lineValue(footerLines, "Card Fees")).toBeUndefined();
		expect(lineValue(footerLines, "Total Paid")).toBe("$2,500.00");
		expect(lineValue(footerLines, "Balance Due")).toBe("$2,500.00");
	});

	it("omits card fees for a fully paid non-card order", async () => {
		const sale = {
			...createSale(),
			amountDue: 0,
			grandTotal: 5000,
			subTotal: 5000,
			payments: [
				{
					amount: 5000,
					status: "success",
					deletedAt: null,
					createdAt: new Date("2026-06-24T12:00:00.000Z"),
					meta: {},
					transaction: { meta: null, paymentMethod: "cash" },
					squarePayments: null,
				},
			],
		};
		const db = {
			salesOrders: {
				findMany: async () => [sale],
			},
			settings: {
				findFirst: async () => null,
			},
		} as unknown as Parameters<typeof getPrintData>[0];

		const result = await getPrintData(db, {
			ids: [1],
			mode: "invoice",
			dispatchId: null,
		});
		const footerLines = result.pages[0]?.footer?.lines || [];

		expect(lineValue(footerLines, "Order Total")).toBe("$5,000.00");
		expect(lineValue(footerLines, "Card Fees")).toBeUndefined();
		expect(lineValue(footerLines, "Total Paid")).toBe("$5,000.00");
		expect(lineValue(footerLines, "Balance Due")).toBe("$0.00");
	});

	it("does not present an estimated fee as a recorded full card payment", async () => {
		const sale = {
			...createSale(),
			amountDue: 0,
			grandTotal: 5000,
			subTotal: 5000,
			meta: {
				payment_option: "Credit Card",
				ccc_percentage: 3.5,
			},
			payments: [
				{
					amount: 5000,
					status: "success",
					deletedAt: null,
					createdAt: new Date("2026-06-24T12:00:00.000Z"),
					meta: {},
					transaction: { meta: null, paymentMethod: "credit-card" },
					squarePayments: null,
				},
			],
		};
		const db = {
			salesOrders: {
				findMany: async () => [sale],
			},
			settings: {
				findFirst: async () => null,
			},
		} as unknown as Parameters<typeof getPrintData>[0];

		const result = await getPrintData(db, {
			ids: [1],
			mode: "invoice",
			dispatchId: null,
		});
		const footerLines = result.pages[0]?.footer?.lines || [];

		expect(lineValue(footerLines, "Order Total")).toBe("$5,000.00");
		expect(lineValue(footerLines, "Card Fees")).toBeUndefined();
		expect(lineValue(footerLines, "Total Paid")).toBe("$5,000.00");
		expect(lineValue(footerLines, "Balance Due")).toBe("$0.00");
	});

	it("supports comma-separated invoice and packing slip modes from one sales fetch", async () => {
		let findManyCalls = 0;
		const db = {
			salesOrders: {
				findMany: async () => {
					findManyCalls += 1;
					return [createSale()];
				},
			},
			settings: {
				findFirst: async () => null,
			},
			dispatchCompletedActivity: {
				findFirst: async () => null,
			},
		} as unknown as Parameters<typeof getPrintData>[0];

		const result = await getPrintData(db, {
			ids: [1],
			mode: "invoice,packing-slip",
			dispatchId: null,
		});

		expect(findManyCalls).toBe(1);
		expect(result.pages).toHaveLength(2);
		expect(result.pages.map((page) => page.config.mode)).toEqual([
			"invoice",
			"packing-slip",
		]);
	});
});

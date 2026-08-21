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
					stepProduct: {
						img: null,
						door: { img: null },
						product: { img: null },
					},
					doors: [
						{
							id: 201,
							dimension: "2-8 x 7-0",
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

function lineValue(
	lines: Array<{ label: string; value: string }>,
	label: string,
) {
	return lines.find((line) => line.label === label)?.value;
}

describe("getPrintData", () => {
	it("recovers printable sections from the saved form when relations are empty", async () => {
		const sale = {
			...createSale(),
			items: [],
			meta: {
				newSalesForm: {
					lineItems: [
						{
							uid: "door-line",
							title: "Interior Door",
							description: "Interior pre-hung",
							qty: 2,
							unitPrice: 100,
							lineTotal: 200,
							meta: { lineIndex: 0 },
							formSteps: [
								{
									id: 10,
									stepId: 1,
									value: "Interior",
									step: { id: 1, title: "Item Type" },
								},
							],
							housePackageTool: {
								doorType: "Interior",
								doors: [
									{
										id: 20,
										dimension: "2-8 x 7-0",
										lhQty: 1,
										rhQty: 1,
										totalQty: 2,
										unitPrice: 100,
										lineTotal: 200,
										stepProduct: { name: "Flush Door" },
									},
								],
							},
						},
						{
							uid: "moulding-line",
							title: "Mouldings",
							description: "Casing",
							qty: 3,
							unitPrice: 20,
							lineTotal: 60,
							meta: {
								lineIndex: 1,
								mouldingRows: [
									{ uid: "m-1", title: "Casing", qty: 3, salesPrice: 20 },
								],
							},
							formSteps: [
								{
									id: 11,
									stepId: 2,
									value: "Moulding",
									step: { id: 2, title: "Item Type" },
								},
							],
							housePackageTool: { doorType: "Moulding", doors: [] },
						},
						{
							uid: "service-line",
							title: "Services",
							description: "Installation",
							qty: 1,
							unitPrice: 80,
							lineTotal: 80,
							meta: {
								lineIndex: 2,
								serviceRows: [
									{
										uid: "svc-1",
										service: "Installation",
										qty: 1,
										unitPrice: 80,
									},
								],
							},
							formSteps: [
								{
									id: 12,
									stepId: 3,
									value: "Services",
									step: { id: 3, title: "Item Type" },
								},
							],
						},
					],
				},
			},
		};
		const db = {
			salesOrders: { findMany: async () => [sale] },
			settings: { findFirst: async () => null },
		} as unknown as Parameters<typeof getPrintData>[0];

		const result = await getPrintData(db, {
			ids: [1],
			mode: "quote",
			dispatchId: null,
		});

		expect(result.pages[0]?.sections.map((section) => section.kind)).toEqual([
			"door",
			"moulding",
			"service",
		]);
		expect(
			result.pages[0]?.sections.map((section) => section.rows.length),
		).toEqual([1, 1, 1]);
	});

	it("prints only door sizes retained by an applied adjustment snapshot", async () => {
		const sale: ReturnType<typeof createSale> & {
			meta: Record<string, unknown>;
		} = createSale();
		const firstItem = sale.items[0];
		if (!firstItem?.housePackageTool) {
			throw new Error("Expected the print fixture to include an HPT item.");
		}
		const retainedDoor = firstItem.housePackageTool.doors[0];
		if (!retainedDoor) {
			throw new Error(
				"Expected the print fixture to include one HPT door row.",
			);
		}
		firstItem.housePackageTool.doors.push({
			...retainedDoor,
			id: 202,
			dimension: "2-6 x 6-8",
			lhQty: 2,
			rhQty: 1,
			totalQty: 3,
			unitPrice: 120.84,
			lineTotal: 362.52,
		});
		sale.meta = {
			newSalesForm: {
				approvedAdjustmentId: "adjustment-1",
				lineItems: [
					{
						id: 101,
						uid: "sales-item-101",
						housePackageTool: {
							doors: [
								{
									id: 201,
									dimension: "2-8 x 7-0",
									lhQty: 1,
									rhQty: 0,
									totalQty: 1,
									unitPrice: 100,
									lineTotal: 100,
								},
							],
						},
					},
				],
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
		const doorSection = result.pages[0]?.sections.find(
			(section) => section.kind === "door",
		);

		expect(doorSection?.rows).toHaveLength(1);
		expect(doorSection?.rows[0]?.cells[2]?.value).toBe('32" x 84"');
		expect(doorSection?.rows[0]?.cells[1]?.value).toContain("Flush Door");
	});

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

	it("prints metadata-backed service groups once when legacy sibling rows are retained", async () => {
		const sale = createSale();
		const serviceItem = sale.items.find((item) => item.id === 103);
		if (!serviceItem) {
			throw new Error("Expected the print fixture to include a service item.");
		}

		serviceItem.multiDyke = true;
		serviceItem.multiDykeUid = "service-group-1";
		sale.items.push({
			id: 106,
			description: "Delivery",
			dykeDescription: "Services",
			qty: 1,
			rate: 50,
			total: 50,
			meta: {
				uid: "svc-2",
				meta: serviceItem.meta.meta,
			},
			formSteps: [],
			housePackageTool: null,
			shelfItems: [],
			multiDyke: false,
			multiDykeUid: "service-group-1",
		});

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
		const serviceSections = result.pages[0]?.sections.filter(
			(section) => section.kind === "service",
		);
		const genericSections = result.pages[0]?.sections.filter(
			(section) => section.kind === "line-item",
		);

		expect(serviceSections).toHaveLength(1);
		expect(serviceSections?.[0]?.rows).toHaveLength(2);
		expect(
			serviceSections?.[0]?.rows.map((row) => row.cells[1]?.value),
		).toEqual(["Install", "Delivery"]);
		expect(genericSections).toHaveLength(1);
		expect(genericSections?.[0]?.rows).toHaveLength(1);
		expect(genericSections?.[0]?.rows[0]?.cells[1]?.value).toBe(
			"GENERIC LINE ITEM",
		);
	});

	it("prints metadata-backed moulding groups once when legacy sibling rows are retained", async () => {
		const sale = createSale();
		const mouldingItem = sale.items.find((item) => item.id === 102);
		if (!mouldingItem) {
			throw new Error("Expected the print fixture to include a moulding item.");
		}

		mouldingItem.multiDyke = true;
		mouldingItem.multiDykeUid = "moulding-group-1";
		mouldingItem.meta.meta.mouldingRows.push({
			uid: "m-2",
			title: "Baseboard",
			qty: 3,
			salesPrice: 20,
		});
		const mouldingStep = mouldingItem.formSteps.find(
			(formStep) => formStep.step?.title === "Moulding",
		);
		if (!mouldingStep?.meta?.selectedComponents) {
			throw new Error("Expected selected moulding component metadata.");
		}
		mouldingStep.meta.selectedComponents.push({
			uid: "m-2",
			title: "Baseboard",
			img: "baseboard.png",
		});
		sale.items.push({
			id: 106,
			description: "Baseboard",
			dykeDescription: "Moulding",
			qty: 3,
			rate: 20,
			total: 60,
			meta: {
				uid: "m-2",
				meta: mouldingItem.meta.meta,
			},
			formSteps: [],
			housePackageTool: null,
			shelfItems: [],
			multiDyke: false,
			multiDykeUid: "moulding-group-1",
		});

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
		const mouldingSections = result.pages[0]?.sections.filter(
			(section) => section.kind === "moulding",
		);
		const genericSections = result.pages[0]?.sections.filter(
			(section) => section.kind === "line-item",
		);

		expect(mouldingSections).toHaveLength(1);
		expect(mouldingSections?.[0]?.rows).toHaveLength(2);
		expect(
			mouldingSections?.[0]?.rows.map((row) => row.cells[1]?.value),
		).toEqual(["Casing", "Baseboard"]);
		expect(genericSections).toHaveLength(1);
		expect(genericSections?.[0]?.rows).toHaveLength(1);
		expect(genericSections?.[0]?.rows[0]?.cells[1]?.value).toBe(
			"GENERIC LINE ITEM",
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
		expect(lineValue(footerLines, "Total if Paying by Card")).toBe("$1,669.68");
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
		expect(lineValue(footerLines, "Paid Toward Order")).toBe("$5,000.00");
		expect(lineValue(footerLines, "Card Payment")).toBe("$5,000.00");
		expect(lineValue(footerLines, "C.C.C. on Card Payment")).toBe("$175.00");
		expect(lineValue(footerLines, "Charged to Card")).toBe("$5,175.00");
		expect(lineValue(footerLines, "Card Payments Made")).toBeUndefined();
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
		expect(lineValue(footerLines, "Paid Toward Order")).toBe("$3,500.00");
		expect(lineValue(footerLines, "Card Payment")).toBe("$2,500.00");
		expect(lineValue(footerLines, "C.C.C. on Card Payment")).toBe("$87.50");
		expect(lineValue(footerLines, "Charged to Card")).toBe("$2,587.50");
		expect(lineValue(footerLines, "Cash Payment")).toBe("$1,000.00");
		expect(lineValue(footerLines, "Balance Due")).toBe("$1,500.00");
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
		expect(lineValue(footerLines, "Paid Toward Order")).toBe("$946.20");
		expect(lineValue(footerLines, "Card Payment")).toBe("$946.20");
		expect(lineValue(footerLines, "C.C.C. on Card Payment")).toBe("$28.39");
		expect(lineValue(footerLines, "Charged to Card")).toBe("$974.59");
		expect(lineValue(footerLines, "Card Payments Made")).toBe("2");
		expect(lineValue(footerLines, "Balance Due")).toBe("$0.00");
		expect(footerLines.map((line) => line.label)).toEqual([
			"Subtotal",
			"Order Total",
			"Paid Toward Order",
			"Card Payment",
			"C.C.C. on Card Payment",
			"Charged to Card",
			"Card Payments Made",
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
		expect(lineValue(footerLines, "Paid Toward Order")).toBe("$2,500.00");
		expect(lineValue(footerLines, "Card Payment")).toBe("$2,500.00");
		expect(lineValue(footerLines, "C.C.C. on Card Payment")).toBeUndefined();
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
		expect(lineValue(footerLines, "Paid Toward Order")).toBe("$5,000.00");
		expect(lineValue(footerLines, "Cash Payment")).toBe("$5,000.00");
		expect(lineValue(footerLines, "Cash Payments Made")).toBeUndefined();
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
		expect(lineValue(footerLines, "Paid Toward Order")).toBe("$5,000.00");
		expect(lineValue(footerLines, "Card Payment")).toBe("$5,000.00");
		expect(lineValue(footerLines, "C.C.C. on Card Payment")).toBeUndefined();
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

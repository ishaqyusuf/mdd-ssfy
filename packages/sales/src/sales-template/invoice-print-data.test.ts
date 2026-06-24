import { describe, expect, it } from "bun:test";
import { getInvoicePrintData } from "./invoice-print-data";

describe("getInvoicePrintData", () => {
	it("derives credit-card ccc into printed totals without stored order ccc", async () => {
		const db = {
			salesOrders: {
				findMany: async () => [
					{
						id: 1,
						orderId: "03000PC",
						type: "order",
						isDyke: true,
						createdAt: new Date("2026-06-24T10:00:00.000Z"),
						amountDue: 100,
						grandTotal: 100,
						meta: {
							payment_option: "Credit Card",
							ccc_percentage: 3.5,
						},
						goodUntil: null,
						paymentTerm: null,
						customer: {
							name: "Card Buyer",
							businessName: "Card Customer",
							phoneNo: null,
							email: null,
							address: null,
						},
						billingAddress: null,
						shippingAddress: null,
						salesRep: { name: "Rep" },
						deliveries: [],
						items: [],
					},
				],
			},
			settings: {
				findFirst: async () => null,
			},
		} as any;

		const [printData] = await getInvoicePrintData(db, {
			ids: [1],
			mode: "invoice",
			access: "internal",
			type: "order",
			dispatchId: null,
		});

		expect(Number(printData?.total)).toBe(103.5);
		expect(Number(printData?.due?.replace("$", ""))).toBe(103.5);
		expect(
			printData?.meta.details.find((detail) => detail.label === "Invoice Total")
				?.value,
		).toBe("103.50");
	});

	it("prints a fallback row for garage items saved without persisted door rows", async () => {
		const db = {
			salesOrders: {
				findMany: async () => [
					{
						id: 1,
						orderId: "02988PC",
						type: "order",
						isDyke: true,
						createdAt: new Date("2026-04-22T10:00:00.000Z"),
						amountDue: 0,
						grandTotal: 250,
						meta: {},
						goodUntil: null,
						paymentTerm: null,
						customer: {
							name: "Test Contact",
							businessName: "Test Customer",
							phoneNo: null,
							email: null,
							address: null,
						},
						billingAddress: null,
						shippingAddress: null,
						salesRep: { name: "Rep" },
						deliveries: [],
						items: [
							{
								id: 10,
								qty: 1,
								rate: 250,
								total: 250,
								swing: "LH",
								description: "Garage",
								dykeDescription: "Garage",
								meta: {
									lineIndex: 1,
									doorType: "Garage",
								},
								formSteps: [
									{
										step: { title: "Item Type" },
										value: "Garage",
										prodUid: "garage-root",
										component: null,
									},
								],
								shelfItems: [],
								multiDyke: false,
								multiDykeUid: null,
								housePackageTool: {
									doorType: "Garage",
									stepProduct: {
										name: "Garage Door",
										door: { title: "Garage Door" },
										product: { title: "Garage Door" },
									},
									doors: [],
								},
							},
						],
					},
				],
			},
			settings: {
				findFirst: async () => null,
			},
		} as any;

		const [printData] = await getInvoicePrintData(db, {
			ids: [1],
			mode: "invoice",
			access: "internal",
			type: "order",
			dispatchId: null,
		});

		expect(printData?.billing?.slice(0, 2)).toEqual([
			"Test Customer",
			"Test Contact",
		]);
		expect(printData?.shipping?.slice(0, 2)).toEqual([
			"Test Customer",
			"Test Contact",
		]);
		expect(printData?.linesSection).toHaveLength(1);
		expect(printData?.linesSection[0]?.tableRows).toHaveLength(1);
		expect(printData?.linesSection[0]?.tableRows[0]?.Door?.text?.[0]).toBe(
			"Garage",
		);
		expect(printData?.linesSection[0]?.tableRows[0]?.Qty?.text?.[0]).toBe(1);
	});

	it("prints package-authored shelf and HPT rows from item metadata", async () => {
		const db = {
			salesOrders: {
				findMany: async () => [
					{
						id: 1,
						orderId: "00001DPP",
						type: "quote",
						isDyke: true,
						createdAt: new Date("2026-05-23T10:00:00.000Z"),
						amountDue: 0,
						grandTotal: 610,
						meta: {},
						goodUntil: null,
						paymentTerm: null,
						customer: {
							name: "Dealer Buyer",
							businessName: "Dealer Customer",
							phoneNo: null,
							email: null,
							address: null,
						},
						billingAddress: null,
						shippingAddress: null,
						salesRep: { name: "Rep" },
						deliveries: [],
						items: [
							{
								id: 10,
								qty: 2,
								rate: 200,
								total: 400,
								swing: null,
								description: "Entry Door",
								dykeDescription: "Entry Door",
								meta: {
									uid: "door-line",
									title: "Entry Door",
									housePackageTool: {
										doors: [
											{
												dimension: "30 x 80",
												swing: "LH",
												lhQty: 2,
												rhQty: 0,
												totalQty: 2,
												unitPrice: 200,
												lineTotal: 400,
											},
										],
									},
								},
								formSteps: [
									{
										step: { title: "Item Type" },
										value: "Door",
										prodUid: "door-root",
										component: null,
									},
								],
								shelfItems: [],
								multiDyke: false,
								multiDykeUid: null,
								housePackageTool: null,
							},
							{
								id: 11,
								qty: 3,
								rate: 70,
								total: 210,
								swing: null,
								description: "Shelf Line",
								dykeDescription: "Shelf Line",
								meta: {
									uid: "shelf-line",
									title: "Shelf Line",
									shelfItems: [
										{
											description: "Shelf board",
											qty: 3,
											unitPrice: 70,
											totalPrice: 210,
										},
									],
								},
								formSteps: [],
								shelfItems: [],
								multiDyke: false,
								multiDykeUid: null,
								housePackageTool: null,
							},
						],
					},
				],
			},
			settings: {
				findFirst: async () => null,
			},
		} as any;

		const [printData] = await getInvoicePrintData(db, {
			ids: [1],
			mode: "quote",
			access: "internal",
			type: "quote",
			dispatchId: null,
		});

		expect(printData?.linesSection).toHaveLength(2);
		expect(printData?.linesSection[0]?.tableRows[0]?.Door?.text?.[0]).toBe(
			"Entry Door",
		);
		expect(printData?.linesSection[0]?.tableRows[0]?.Size?.text?.[0]).toBe(
			"30 x 80",
		);
		expect(
			printData?.linesSection[1]?.tableRows[0]?.Description?.text?.[0],
		).toBe("Shelf board");
		expect(printData?.linesSection[1]?.tableRows[0]?.Total?.text?.[0]).toBe(
			"210.00",
		);
	});
});

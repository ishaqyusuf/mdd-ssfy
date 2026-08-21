import { describe, expect, it } from "bun:test";
import { SalesOverviewInclude } from "@api/utils/sales";

import { salesOrderDto, salesOverviewDto, salesQuoteDto } from "./sales-dto";

function makeSale(overrides: Record<string, unknown> = {}) {
	return {
		id: 1,
		orderId: "12345AB",
		slug: "12345ab",
		type: "quote",
		createdAt: new Date("2026-05-14T00:00:00.000Z"),
		updatedAt: new Date("2026-05-14T00:00:00.000Z"),
		meta: {},
		productionGate: null,
		grandTotal: 113.85,
		amountDue: 113.85,
		subTotal: 100,
		extraCosts: [],
		taxes: [{ tax: 10, taxConfig: { title: "Tax" } }],
		stat: [],
		customer: null,
		billingAddress: null,
		shippingAddress: null,
		salesRep: null,
		isDyke: false,
		paymentTerm: null,
		paymentDueDate: null,
		deliveryOption: null,
		shippingAddressId: null,
		...overrides,
	} as any;
}

describe("sales dto cost lines", () => {
	it("keeps deleted tax and form-step evidence out of overview readiness", () => {
		expect(SalesOverviewInclude.taxes.where).toEqual({
			deletedAt: null,
		});
		expect(SalesOverviewInclude.items.select.formSteps.where).toEqual({
			deletedAt: null,
		});
	});

	it("maps overview items for quote and order overviews", () => {
		const items = [
			{
				id: 10,
				description: "DOOR 3PNL SHAKER",
				dykeDescription: "Legacy door",
				qty: 2,
				swing: "LH",
				total: 300,
				formSteps: [{ title: "Door", value: "Garage Door" }],
			},
			{
				id: 11,
				description: null,
				dykeDescription: "FLAT BOARD",
				qty: null,
				swing: null,
				total: null,
				formSteps: [],
			},
			{
				id: 12,
				description: "SERVICE LINE",
				dykeDescription: null,
				qty: 1,
				swing: null,
				total: 75,
				formSteps: [{ value: null, step: { title: "Services" } }],
			},
		];

		expect(
			salesOverviewDto(makeSale({ items }), "quote").overviewItems,
		).toEqual([
			{
				configurationSteps: [{ label: "Door", value: "Garage Door" }],
				doors: [],
				id: 10,
				swing: "LH",
				title: "DOOR 3PNL SHAKER",
				subtitle: "Garage Door | LH",
				qty: 2,
				total: 300,
			},
			{
				configurationSteps: [],
				doors: [],
				id: 11,
				swing: null,
				title: "FLAT BOARD",
				subtitle: "",
				qty: 0,
				total: 0,
			},
			{
				configurationSteps: [{ label: "Services", value: null }],
				doors: [],
				id: 12,
				swing: null,
				title: "SERVICE LINE",
				subtitle: "Services",
				qty: 1,
				total: 75,
			},
		]);
		expect(
			salesOverviewDto(makeSale({ type: "order", items }), "order")
				.overviewItems,
		).toHaveLength(3);
		expect(salesQuoteDto(makeSale({ items })).overviewItems[0]).toEqual({
			id: 10,
			title: "DOOR 3PNL SHAKER",
			subtitle: "Garage Door | LH",
			qty: 2,
			total: 300,
		});
	});

	it("exposes manager preflight profile, tax, and door configuration data", () => {
		const dto = salesOverviewDto(
			makeSale({
				type: "order",
				salesProfile: {
					id: 7,
					title: "Builder",
				},
				shippingAddress: {
					address1: "123 Main St",
					address2: null,
				},
				taxes: [
					{
						tax: 6,
						taxCode: "FL-6",
						taxConfig: { title: "Florida Sales Tax" },
					},
				],
				items: [
					{
						id: 10,
						description: "Interior pre-hung door",
						qty: 2,
						swing: "LH",
						total: 490,
						meta: {
							workflowDoorRouteConfig: {
								noHandle: true,
							},
						},
						formSteps: [{ value: "Satin nickel", step: { title: "Hinge" } }],
						salesDoors: [
							{
								dimension: "2-8 x 8-0",
								swing: "LH",
								lhQty: 2,
								rhQty: 0,
								totalQty: 2,
								meta: {},
							},
						],
					},
				],
			}),
			"order",
		);

		expect(dto.customerProfile).toEqual({ id: 7, title: "Builder" });
		expect(dto.taxSummary).toEqual({
			configured: true,
			codes: ["FL-6", "Florida Sales Tax"],
		});
		expect(dto.overviewItems[0]).toMatchObject({
			configurationSteps: [{ label: "Hinge", value: "Satin nickel" }],
			doors: [
				{
					dimension: "2-8 x 8-0",
					swing: "LH",
					noHandle: true,
				},
			],
		});
		expect(dto.shippingAddressConfigured).toBe(true);
	});

	it("does not treat a billing-only address as delivery readiness", () => {
		const dto = salesOverviewDto(
			makeSale({
				type: "order",
				billingAddress: {
					address1: "123 Billing St",
					address2: null,
				},
				shippingAddress: null,
			}),
			"order",
		);

		expect(dto.shippingAddressConfigured).toBe(false);
	});

	it("exposes editable billing and shipping addresses for quote overviews", () => {
		const dto = salesOverviewDto(
			makeSale({
				customer: {
					id: 42,
					name: "Test Customer",
				},
				billingAddress: {
					id: 7,
					address1: "123 Billing St",
					address2: null,
					meta: { zip_code: "33901" },
				},
				shippingAddress: {
					id: 8,
					address1: "456 Shipping Ave",
					address2: null,
					meta: { zip_code: "33902" },
				},
			}),
			"quote",
		);

		expect(dto.addressData.billing).toMatchObject({
			id: 7,
			title: "Billing Address",
		});
		expect(dto.addressData.shipping).toMatchObject({
			id: 8,
			title: "Shipping Address",
		});
	});

	it("displays billing as the shipping fallback without editing the billing row", () => {
		const dto = salesOrderDto(
			makeSale({
				type: "order",
				customer: {
					id: 42,
					name: "Test Customer",
				},
				billingAddress: {
					id: 7,
					address1: "123 Billing St",
					address2: null,
					meta: { zip_code: "33901" },
				},
				shippingAddress: null,
			}),
		);

		expect(dto.addressData.shipping).toMatchObject({
			id: null,
			title: "Shipping Address",
		});
		expect(dto.addressData.shipping.lines).toEqual(
			dto.addressData.billing.lines,
		);
	});

	it("falls back to the new-form P.O. metadata while root metadata remains canonical", () => {
		expect(
			salesQuoteDto(
				makeSale({
					meta: {
						newSalesForm: {
							form: {
								po: "PO-NESTED",
							},
						},
					},
				}),
			).poNo,
		).toBe("PO-NESTED");
		expect(
			salesQuoteDto(
				makeSale({
					meta: {
						po: "PO-ROOT",
						newSalesForm: {
							form: {
								po: "PO-NESTED",
							},
						},
					},
				}),
			).poNo,
		).toBe("PO-ROOT");
	});

	it("exposes the current fulfillment date without an eager detail request", () => {
		const dueDate = new Date("2026-09-04T12:00:00.000Z");
		const dto = salesOrderDto(
			makeSale({
				type: "order",
				deliveries: [
					{
						id: 42,
						deliveryMode: "pickup",
						dueDate,
						status: "pending",
					},
				],
			}),
		);

		expect(dto.deliverySummary).toEqual({
			id: 42,
			mode: "pickup",
			fulfillmentDate: dueDate,
		});
	});

	it("includes repaired credit card fee before invoice total", () => {
		const dto = salesQuoteDto(
			makeSale({
				grandTotal: 110,
				amountDue: 110,
				meta: {
					ccc: 3.85,
					ccc_percentage: 3.5,
					payment_option: "Credit Card",
				},
			}),
		);

		expect(dto.costLines).toEqual([
			{ label: "Sub total", amount: 100 },
			{ label: "Tax", amount: 10 },
			{ label: "Credit Card Fee (3.5%)", amount: 3.85 },
			{ label: "Total Invoice", amount: 110 },
			{ label: "Paid", amount: 0 },
			{ label: "Due Amount", amount: 110 },
		]);
		expect(dto.invoice).toMatchObject({
			baseTotal: 110,
			displayCcc: 3.85,
			displayPending: 113.85,
			displayTotal: 113.85,
			pending: 110,
			total: 110,
		});
	});

	it("omits credit card fee line when no fee is persisted", () => {
		const dto = salesQuoteDto(makeSale());

		expect(dto.costLines.map((line) => line.label)).toEqual([
			"Sub total",
			"Tax",
			"Total Invoice",
			"Paid",
			"Due Amount",
		]);
	});

	it("splits unpaid selected-card due from calculated ccc total", () => {
		const dto = salesOrderDto(
			makeSale({
				type: "order",
				grandTotal: 1621.05,
				amountDue: 1621.05,
				subTotal: 1515,
				taxes: [{ tax: 106.05, taxConfig: { title: "Tax" } }],
				meta: {
					newSalesForm: {
						form: {
							paymentMethod: "Credit Card",
						},
					},
					ccc_percentage: 3,
					ccc: 1,
				},
				payments: [],
			}),
		);

		expect(dto.costLines).toEqual([
			{ label: "Sub total", amount: 1515 },
			{ label: "Tax", amount: 106.05 },
			{ label: "Order Due Amount", amount: 1621.05 },
			{ label: "C.C.C", amount: 48.63 },
			{ label: "Total Due With C.C.C", amount: 1669.68 },
		]);
		expect(dto.invoice).toMatchObject({
			displayCcc: 48.63,
			displayPending: 1669.68,
			displayTotal: 1669.68,
			pending: 1621.05,
			total: 1621.05,
		});
	});

	it("labels full card payment total as charged to card", () => {
		const dto = salesOrderDto(
			makeSale({
				type: "order",
				grandTotal: 846.67,
				amountDue: 0,
				subTotal: 825,
				taxes: [{ tax: 55.39, taxConfig: { title: "County & State Tax" } }],
				extraCosts: [{ label: "Discount", totalAmount: -33.72 }],
				meta: {
					payment_option: "Credit Card",
					ccc_percentage: 3,
				},
				payments: [
					{
						amount: 846.67,
						status: "success",
						deletedAt: null,
						createdAt: new Date("2026-06-24T12:00:00.000Z"),
						meta: {
							salesAmount: 846.67,
							feeAmount: 25.4,
							customerChargeAmount: 872.07,
							paymentCharges: [
								{
									type: "ccc",
									label: "C.C.C",
									baseAmount: 846.67,
									percentage: 3,
									amount: 25.4,
								},
							],
						},
						transaction: { meta: null, paymentMethod: "credit-card" },
						squarePayments: null,
					},
				],
			}),
		);

		expect(dto.costLines).toEqual([
			{ label: "Sub total", amount: 825 },
			{ label: "Discount", amount: -33.72 },
			{ label: "County & State Tax", amount: 55.39 },
			{ label: "Order Total", amount: 846.67 },
			{ label: "Paid Toward Order", amount: 846.67 },
			{ label: "Card Payment", amount: 846.67, paymentMethod: "card" },
			{
				label: "C.C.C. on Card Payment",
				amount: 25.4,
				paymentMethod: "card",
			},
			{
				label: "Charged to Card",
				amount: 872.07,
				paymentMethod: "card",
			},
			{ label: "Balance Due", amount: 0 },
		]);
		expect(dto.invoice).toMatchObject({
			displayPaid: 872.07,
			displayPending: 0,
			displayTotal: 872.07,
			paid: 846.67,
			pending: 0,
		});
	});

	it("separates recorded card ccc in partial mixed overview lines", () => {
		const dto = salesOrderDto(
			makeSale({
				type: "order",
				grandTotal: 5000,
				amountDue: 1500,
				subTotal: 5000,
				taxes: [],
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
			}),
		);

		expect(dto.costLines).toEqual([
			{ label: "Sub total", amount: 5000 },
			{ label: "Order Total", amount: 5000 },
			{ label: "Paid Toward Order", amount: 3500 },
			{ label: "Card Payment", amount: 2500, paymentMethod: "card" },
			{
				label: "C.C.C. on Card Payment",
				amount: 87.5,
				paymentMethod: "card",
			},
			{
				label: "Charged to Card",
				amount: 2587.5,
				paymentMethod: "card",
			},
			{ label: "Cash Payment", amount: 1000, paymentMethod: "cash" },
			{ label: "Balance Due", amount: 1500 },
		]);
		expect(dto.invoice.displayPaid).toBe(3587.5);
		expect(dto.financialBreakdown.pendingCardEstimate).toEqual({
			principalCents: 150_000,
			cccCents: 5_250,
			totalCents: 155_250,
		});
	});

	it("groups repeated card payments into one invoice summary", () => {
		const dto = salesOrderDto(
			makeSale({
				type: "order",
				grandTotal: 2459.35,
				amountDue: 0,
				subTotal: 2298.46,
				taxes: [{ tax: 160.89, taxConfig: { title: "County & State Tax" } }],
				payments: [
					{
						id: 9158,
						transactionId: 11935,
						amount: 2277.13,
						status: "success",
						deletedAt: null,
						createdAt: new Date("2026-08-20T20:00:00.000Z"),
						meta: {
							salesAmount: 2277.13,
							feeAmount: 68.31,
							customerChargeAmount: 2345.44,
						},
						transaction: { paymentMethod: "credit-card" },
						squarePayments: null,
					},
					{
						id: 9159,
						transactionId: 11936,
						amount: 182.22,
						status: "success",
						deletedAt: null,
						createdAt: new Date("2026-08-20T21:00:00.000Z"),
						meta: {
							salesAmount: 182.22,
							feeAmount: 5.47,
							customerChargeAmount: 187.69,
						},
						transaction: { paymentMethod: "terminal" },
						squarePayments: null,
					},
				],
			}),
		);

		expect(dto.paymentSummary).toMatchObject({
			paymentCount: 2,
			principalCents: 245935,
			cccCents: 7378,
			customerChargedCents: 253313,
			methodLabel: "Credit Card",
			groups: [
				{
					method: "card",
					paymentCount: 2,
					principalCents: 245935,
					cccCents: 7378,
				},
			],
		});
		expect(dto.costLines).toEqual([
			{ label: "Sub total", amount: 2298.46 },
			{ label: "County & State Tax", amount: 160.89 },
			{ label: "Order Total", amount: 2459.35 },
			{ label: "Paid Toward Order", amount: 2459.35 },
			{
				label: "Card Payment",
				amount: 2459.35,
				paymentMethod: "card",
			},
			{
				label: "C.C.C. on Card Payment",
				amount: 73.78,
				paymentMethod: "card",
			},
			{
				label: "Charged to Card",
				amount: 2533.13,
				paymentMethod: "card",
			},
			{
				label: "Card Payments Made",
				amount: 2,
				paymentMethod: "card",
				format: "count",
			},
			{ label: "Balance Due", amount: 0 },
		]);
		expect(dto.invoice.displayPaid).toBe(2533.13);
		expect(dto.financialBreakdown).toEqual({
			documentType: "order",
			invoice: {
				subtotalCents: 229846,
				adjustments: [],
				taxes: [
					{
						key: "tax-0",
						label: "County & State Tax",
						amountCents: 16089,
					},
				],
				totalCents: 245935,
				paidCents: 245935,
				refundedCents: 0,
				balanceCents: 0,
			},
			paymentGroups: [
				{
					method: "card",
					label: "Card",
					paymentCount: 2,
					principalCents: 245935,
					cccCents: 7378,
					tipCents: 0,
					customerChargedCents: 253313,
					cccEvidence: "recorded",
				},
			],
			pendingCardEstimate: null,
		});
	});

	it("reconciles gross payment groups with canonical net paid after a refund", () => {
		const dto = salesOrderDto(
			makeSale({
				type: "order",
				grandTotal: 1000,
				amountDue: 500,
				subTotal: 1000,
				taxes: [],
				payments: [
					{
						id: 1,
						amount: 1000,
						status: "success",
						deletedAt: null,
						createdAt: new Date("2026-08-20T20:00:00.000Z"),
						meta: {},
						transaction: { paymentMethod: "credit-card" },
						squarePayments: null,
					},
					{
						id: 2,
						amount: -500,
						status: "success",
						deletedAt: null,
						createdAt: new Date("2026-08-21T12:00:00.000Z"),
						meta: { kind: "refund" },
						transaction: { paymentMethod: "credit-card" },
						squarePayments: null,
					},
				],
			}),
		);

		expect(dto.financialBreakdown.invoice).toMatchObject({
			paidCents: 50_000,
			refundedCents: 50_000,
			balanceCents: 50_000,
		});
		expect(dto.financialBreakdown.paymentGroups[0]).toMatchObject({
			method: "card",
			principalCents: 100_000,
		});
	});

	it("does not infer unrecorded partial card ccc", () => {
		const dto = salesOrderDto(
			makeSale({
				type: "order",
				grandTotal: 5000,
				amountDue: 2500,
				subTotal: 5000,
				taxes: [],
				meta: {
					payment_option: "Credit Card",
					ccc_percentage: 3.5,
					ccc: 175,
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
			}),
		);

		expect(dto.costLines).toEqual([
			{ label: "Sub total", amount: 5000 },
			{ label: "Order Total", amount: 5000 },
			{ label: "Paid Toward Order", amount: 2500 },
			{ label: "Card Payment", amount: 2500, paymentMethod: "card" },
			{ label: "Balance Due", amount: 2500 },
		]);
	});
});

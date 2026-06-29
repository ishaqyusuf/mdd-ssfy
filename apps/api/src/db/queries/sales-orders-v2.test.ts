import { describe, expect, it } from "bun:test";
import { getOrdersSchema, normalizeOrderRow } from "./sales-orders-v2";

function makeOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: 1,
		orderId: "12345AB",
		slug: "12345ab",
		type: "order",
		status: "Draft",
		prodStatus: null,
		priority: null,
		createdAt: new Date("2026-06-25T00:00:00.000Z"),
		updatedAt: new Date("2026-06-25T00:00:00.000Z"),
		meta: {},
		productionGate: null,
		grandTotal: 1000,
		amountDue: 1000,
		subTotal: 1000,
		extraCosts: [],
		taxes: [],
		stat: [],
		deliveries: [],
		customer: null,
		billingAddress: null,
		shippingAddress: null,
		salesRep: null,
		isDyke: false,
		paymentTerm: null,
		paymentDueDate: null,
		deliveryOption: null,
		shippingAddressId: null,
		inventoryStatus: null,
		dealerAuthId: null,
		_count: { notes: 0 },
		...overrides,
	} as any;
}

describe("sales orders default query contract", () => {
	it("accepts the promoted v2 filter aliases on the default schema", () => {
		expect(
			getOrdersSchema.parse({
				q: "08499",
				customerName: "Acme",
				invoiceStatus: "outstanding",
				priority: "HIGH",
				orderNo: "08499PC",
				bin: true,
				sort: ["invoiceTotal", "desc"],
			}),
		).toEqual({
			q: "08499",
			customerName: "Acme",
			invoiceStatus: "outstanding",
			priority: "HIGH",
			orderNo: "08499PC",
			bin: true,
			sort: ["invoiceTotal", "desc"],
		});
	});

	it("calculates fallback ccc for credit-card invoice display", () => {
		const row = normalizeOrderRow(
			makeOrder({
				meta: {
					payment_option: "Credit Card",
					ccc_percentage: 3.5,
				},
			}),
		);

		expect(row.baseInvoiceTotal).toBe(1000);
		expect(row.displayCcc).toBe(35);
		expect(row.invoiceTotal).toBe(1035);
		expect(row.amountDue).toBe(1000);
		expect(row.amountPaid).toBe(0);
		expect(row.displayAmountDue).toBe(1035);
	});

	it("repairs stale stored ccc when present", () => {
		const row = normalizeOrderRow(
			makeOrder({
				meta: {
					payment_option: "Credit Card",
					ccc_percentage: 3.5,
					ccc: 12.34,
				},
			}),
		);

		expect(row.displayCcc).toBe(35);
		expect(row.invoiceTotal).toBe(1035);
	});

	it("uses matching stored ccc when present", () => {
		const row = normalizeOrderRow(
			makeOrder({
				meta: {
					payment_option: "Credit Card",
					ccc_percentage: 3.5,
					ccc: 35,
				},
			}),
		);

		expect(row.displayCcc).toBe(35);
		expect(row.invoiceTotal).toBe(1035);
	});

	it("keeps non-card invoice display base-only", () => {
		const row = normalizeOrderRow(
			makeOrder({
				meta: {
					payment_option: "Check",
					ccc_percentage: 3.5,
					ccc: 35,
				},
			}),
		);

		expect(row.displayCcc).toBe(0);
		expect(row.invoiceTotal).toBe(1000);
	});

	it("exposes flat paid and display paid amounts for mobile adapters", () => {
		const row = normalizeOrderRow(
			makeOrder({
				grandTotal: 1000,
				amountDue: 250,
				meta: {
					payment_option: "Credit Card",
					ccc_percentage: 3.5,
				},
			}),
		);

		expect(row.amountPaid).toBe(750);
		expect(row.amountDue).toBe(250);
		expect(row.displayAmountPaid).toBe(750);
		expect(row.displayAmountDue).toBe(258.75);
	});
});

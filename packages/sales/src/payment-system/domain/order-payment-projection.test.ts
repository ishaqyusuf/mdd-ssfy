import { describe, expect, it } from "bun:test";
import {
	buildLegacyOrderPaymentProjection,
	buildOrderPaymentProjection,
} from "./order-payment-projection";

describe("payment-system order projection", () => {
	it("builds a projection from canonical allocations", () => {
		const projection = buildOrderPaymentProjection({
			salesOrderId: 42,
			grandTotal: 500,
			ledgerEntries: [
				{
					entryType: "manual_payment_recorded",
					status: "posted",
					amount: 300,
				},
			],
			allocations: [
				{
					salesOrderId: 42,
					amount: 300,
					allocationType: "payment",
				},
			],
		});

		expect(projection.totalRecorded).toBe(300);
		expect(projection.totalAllocated).toBe(300);
		expect(projection.amountDue).toBe(200);
		expect(projection.overpaidAmount).toBe(0);
	});

	it("tracks refunds and overpayments separately", () => {
		const projection = buildOrderPaymentProjection({
			grandTotal: 100,
			allocations: [
				{
					salesOrderId: 42,
					amount: 150,
					allocationType: "payment",
				},
			],
			refundedAmount: 20,
		});

		expect(projection.amountDue).toBe(0);
		expect(projection.overpaidAmount).toBe(30);
	});

	it("derives a projection from legacy successful payments only", () => {
		const projection = buildLegacyOrderPaymentProjection({
			salesOrderId: 7,
			grandTotal: 250,
			payments: [
				{ amount: 100, status: "success" },
				{ amount: 100, status: "pending" },
				{ amount: 50, status: "success" },
			],
		});

		expect(projection.totalAllocated).toBe(150);
		expect(projection.amountDue).toBe(100);
	});
});

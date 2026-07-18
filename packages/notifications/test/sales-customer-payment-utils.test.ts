import { describe, expect, it } from "bun:test";
import { buildSalesCustomerPaymentReceivedPayload } from "../src/types/sales-customer-payment-utils";

function createDb(
	orders: Array<{
		id: number;
		orderId: string;
		amountDue?: number;
		customer?: {
			email?: string | null;
			name?: string | null;
			businessName?: string | null;
		} | null;
		billingAddress?: {
			email?: string | null;
			name?: string | null;
		} | null;
	}>,
) {
	return {
		salesOrders: {
			findMany: async () => orders,
		},
	};
}

const payment = {
	sales: [
		{
			salesId: 1,
			amountApplied: 100,
			remainingDue: 0,
		},
	],
	paymentMethod: "cash",
	totalAmount: 100,
};

describe("buildSalesCustomerPaymentReceivedPayload", () => {
	it("prefers the billing email and includes the invoice attachment", async () => {
		const attachment = {
			filename: "Invoice.pdf",
			content: "cGRm",
			contentType: "application/pdf" as const,
		};
		const payload = await buildSalesCustomerPaymentReceivedPayload(
			createDb([
				{
					id: 1,
					orderId: "ORD-1",
					customer: {
						email: "account@example.com",
						name: "Account Customer",
					},
					billingAddress: {
						email: "billing@example.com",
						name: "Billing Customer",
					},
				},
			]) as never,
			payment,
			{
				buildInvoiceAttachment: async () => attachment,
			},
		);

		expect(payload.customerEmail).toBe("billing@example.com");
		expect(payload.customerName).toBe("Billing Customer");
		expect(payload.invoicePdfAttachment).toEqual(attachment);
	});

	it("falls back from a blank billing email to the customer email", async () => {
		const payload = await buildSalesCustomerPaymentReceivedPayload(
			createDb([
				{
					id: 1,
					orderId: "ORD-1",
					customer: {
						email: "customer@example.com",
						name: "Customer",
					},
					billingAddress: {
						email: " ",
						name: "Billing Customer",
					},
				},
			]) as never,
			payment,
			{
				buildInvoiceAttachment: async () => null,
			},
		);

		expect(payload.customerEmail).toBe("customer@example.com");
	});

	it("keeps the receipt queueable when invoice rendering fails", async () => {
		const payload = await buildSalesCustomerPaymentReceivedPayload(
			createDb([
				{
					id: 1,
					orderId: "ORD-1",
					customer: {
						email: "customer@example.com",
						name: "Customer",
					},
				},
			]) as never,
			payment,
			{
				buildInvoiceAttachment: async () => {
					throw new Error("pdf render unavailable");
				},
			},
		);

		expect(payload.customerEmail).toBe("customer@example.com");
		expect(payload.invoicePdfAttachment).toBeNull();
	});

	it("accepts name differences when every order resolves to the same email", async () => {
		const payload = await buildSalesCustomerPaymentReceivedPayload(
			createDb([
				{
					id: 1,
					orderId: "ORD-1",
					customer: {
						email: "CUSTOMER@example.com",
						name: "Jane",
					},
				},
				{
					id: 2,
					orderId: "ORD-2",
					customer: {
						email: "customer@example.com",
						name: "Jane Doe",
					},
				},
			]) as never,
			{
				...payment,
				sales: [
					...payment.sales,
					{ salesId: 2, amountApplied: 50, remainingDue: 0 },
				],
			},
			{
				buildInvoiceAttachment: async () => null,
			},
		);

		expect(payload.customerEmail).toBe("CUSTOMER@example.com");
		expect(payload.sales).toHaveLength(2);
	});

	it("rejects missing and genuinely mixed recipients", async () => {
		await expect(
			buildSalesCustomerPaymentReceivedPayload(
				createDb([
					{
						id: 1,
						orderId: "ORD-1",
						customer: { email: null, name: "Customer" },
					},
				]) as never,
				payment,
				{ buildInvoiceAttachment: async () => null },
			),
		).rejects.toThrow("No eligible sales");

		await expect(
			buildSalesCustomerPaymentReceivedPayload(
				createDb([
					{
						id: 1,
						orderId: "ORD-1",
						customer: {
							email: "one@example.com",
							name: "Customer",
						},
					},
					{
						id: 2,
						orderId: "ORD-2",
						customer: {
							email: "two@example.com",
							name: "Customer",
						},
					},
				]) as never,
				{
					...payment,
					sales: [
						...payment.sales,
						{ salesId: 2, amountApplied: 50, remainingDue: 0 },
					],
				},
				{ buildInvoiceAttachment: async () => null },
			),
		).rejects.toThrow("one recipient");
	});
});

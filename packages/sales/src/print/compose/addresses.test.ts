import { describe, expect, it } from "bun:test";
import type { PrintSalesData } from "../query";
import { buildInvoicePrintAddressesFromSnapshot } from "../snapshot-sections";
import { composeAddresses } from "./addresses";

const shippingAddress = {
	name: "Example Customer",
	address1: "111 Example Ave",
	address2: "GATE CODE 0821",
	city: "Pembroke Pines",
	state: "FL",
	meta: { zip_code: "00000" },
};

describe("sales print address composition", () => {
	it("bills the dealer on internal copies and the private customer on customer copies", () => {
		const sale = {
			dealerAuthId: 1,
			dealerAuth: {
				companyName: "MVP QA Workshop Co",
				name: "Dealer Owner",
				phoneNo: "305-555-0199",
				email: "owner@example.test",
				meta: { invoiceEmail: "invoice@example.test" },
				primaryBillingAddress: {
					address1: "42 Sample Lane",
					city: "Miami",
					state: "FL",
					meta: { zip_code: "33186" },
				},
			},
			customer: { name: "Private Customer", businessName: "Sample Home" },
			billingAddress: { name: "Private Customer" },
			shippingAddress,
		} as unknown as PrintSalesData;
		const internal = composeAddresses(sale, "invoice");
		const customer = composeAddresses(
			{ ...sale, dealerCustomerPayment: { paidAmount: 0 } } as PrintSalesData,
			"invoice",
		);

		expect(internal.billing?.lines).toContain("MVP QA WORKSHOP CO");
		expect(internal.billing?.lines).toContain("invoice@example.test");
		expect(internal.billing?.lines).not.toContain("SAMPLE HOME");
		expect(internal.shipping?.lines).toContain("EXAMPLE CUSTOMER");
		expect(customer.billing?.lines).toContain("SAMPLE HOME");
		expect(
			composeAddresses(
				{ ...sale, dealerCustomerPayment: null } as PrintSalesData,
				"quote",
			).billing?.lines,
		).toContain("MVP QA WORKSHOP CO");
	});

	it("preserves address line 2 in current sales previews and PDFs", () => {
		const result = composeAddresses(
			{
				customer: { name: "Example Customer" },
				billingAddress: null,
				shippingAddress,
			} as unknown as PrintSalesData,
			"invoice",
		);

		expect(result.shipping?.lines).toEqual([
			"EXAMPLE CUSTOMER",
			"111 Example Ave",
			"GATE CODE 0821",
			"Pembroke Pines FL 00000",
		]);
	});

	it("preserves address line 2 in immutable sales document snapshots", () => {
		const result = buildInvoicePrintAddressesFromSnapshot({
			customer: { name: "Example Customer" },
			billingAddress: null,
			shippingAddress,
		});

		expect(result.shipping.lines).toEqual([
			"EXAMPLE CUSTOMER",
			"111 Example Ave",
			"GATE CODE 0821",
			"Pembroke Pines FL 00000",
		]);
	});
});

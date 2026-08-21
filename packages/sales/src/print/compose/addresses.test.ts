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

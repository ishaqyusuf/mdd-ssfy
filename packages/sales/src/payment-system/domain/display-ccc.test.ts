import { describe, expect, it } from "bun:test";
import {
	repairSalesInvoiceCccDisplay,
	resolveSalesDisplayCcc,
} from "./display-ccc";

describe("sales display ccc", () => {
	it("uses stored ccc when it matches calculated ccc", () => {
		expect(
			resolveSalesDisplayCcc({
				baseTotal: 1000,
				meta: {
					ccc: 35,
					ccc_percentage: 3.5,
					payment_option: "Credit Card",
				},
			}),
		).toMatchObject({
			baseTotal: 1000,
			ccc: 35,
			totalWithCcc: 1035,
			cccMismatch: false,
		});
	});

	it("calculates fallback ccc for credit card when stored ccc is missing", () => {
		expect(
			resolveSalesDisplayCcc({
				baseTotal: 1000,
				meta: {
					ccc_percentage: 3.5,
					payment_option: "Credit Card",
				},
			}),
		).toMatchObject({
			baseTotal: 1000,
			ccc: 35,
			totalWithCcc: 1035,
			cccMismatch: false,
		});
	});

	it("repairs stale stored ccc for credit card display", () => {
		expect(
			repairSalesInvoiceCccDisplay({
				baseTotal: 1000,
				meta: {
					ccc: 12.34,
					ccc_percentage: 3.5,
					payment_option: "Credit Card",
				},
			}),
		).toMatchObject({
			baseTotal: 1000,
			ccc: 35,
			expectedCcc: 35,
			storedCcc: 12.34,
			totalWithCcc: 1035,
			cccMismatch: true,
		});
	});

	it("accepts stored ccc after rounding", () => {
		expect(
			repairSalesInvoiceCccDisplay({
				baseTotal: 1000,
				meta: {
					ccc: 35.004,
					ccc_percentage: 3.5,
					payment_option: "Credit Card",
				},
			}),
		).toMatchObject({
			ccc: 35,
			storedCcc: 35,
			cccMismatch: false,
		});
	});

	it("reads nested new sales form payment method before legacy root metadata", () => {
		expect(
			repairSalesInvoiceCccDisplay({
				baseTotal: 1000,
				meta: {
					ccc: 0,
					ccc_percentage: 3.5,
					payment_option: "Cash",
					newSalesForm: {
						form: {
							paymentMethod: "Credit Card",
						},
					},
				},
			}).ccc,
		).toBe(35);
	});

	it("returns zero ccc for non-card methods even when stored ccc is stale", () => {
		expect(
			repairSalesInvoiceCccDisplay({
				baseTotal: 1000,
				meta: {
					ccc: 35,
					ccc_percentage: 3.5,
					payment_option: "Check",
				},
			}),
		).toMatchObject({
			ccc: 0,
			expectedCcc: 0,
			storedCcc: 35,
			totalWithCcc: 1000,
			cccMismatch: true,
		});
	});
});

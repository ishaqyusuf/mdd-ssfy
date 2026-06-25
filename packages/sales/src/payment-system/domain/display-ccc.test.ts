import { describe, expect, it } from "bun:test";
import { resolveSalesDisplayCcc } from "./display-ccc";

describe("sales display ccc", () => {
	it("uses stored ccc when present", () => {
		expect(
			resolveSalesDisplayCcc({
				baseTotal: 1000,
				meta: {
					ccc: 12.34,
					ccc_percentage: 3.5,
					payment_option: "Credit Card",
				},
			}),
		).toMatchObject({
			baseTotal: 1000,
			ccc: 12.34,
			totalWithCcc: 1012.34,
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
		});
	});

	it("reads nested new sales form payment method before legacy root metadata", () => {
		expect(
			resolveSalesDisplayCcc({
				baseTotal: 1000,
				meta: {
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

	it("returns zero ccc for non-card methods", () => {
		expect(
			resolveSalesDisplayCcc({
				baseTotal: 1000,
				meta: {
					ccc_percentage: 3.5,
					payment_option: "Check",
				},
			}).ccc,
		).toBe(0);
	});
});

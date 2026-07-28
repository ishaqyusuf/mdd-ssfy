import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./sales-payment-processor.tsx", import.meta.url),
	"utf8",
);

describe("sales payment processor customer notification contract", () => {
	it("disables and clears customer notification when listed orders lack email", () => {
		expect(source.includes("canNotifyPaymentCustomer(listedSales)")).toBe(true);
		expect(source.includes("disabled={!canNotifyCustomer}")).toBe(true);
		expect(source.includes('form.setValue("notifyCustomer", false)')).toBe(true);
		expect(
			/notifyCustomer:\s+canNotifyCustomer &&\s+formData\.notifyCustomer === true/.test(
				source,
			),
		).toBe(true);
	});

	it("explains the disabled option and warns when receipt queueing fails", () => {
		expect(source.includes("Customer have no email")).toBe(true);
		expect(source.includes('customerReceiptQueueStatus === "failed"')).toBe(
			true,
		);
		expect(source.includes("Receipt email could not be queued")).toBe(true);
	});
});

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./invoice-overview-panel.tsx", import.meta.url),
	"utf8",
);

describe("invoice overview fulfillment confirmation", () => {
	it("uses the atomic Delivery-option action instead of a metadata-only patch", () => {
		expect(source).toContain("countSalesFormDeliveryCosts");
		expect(source).toContain("setDeliveryOption(value)");
		expect(source).not.toContain(
			"onDeliveryOptionChange={(value) => setMeta({ deliveryOption: value })}",
		);
	});

	it("keeps Delivery selected until Pickup removal is confirmed", () => {
		expect(source).toContain('setPendingDeliveryOption("pickup")');
		expect(source).toContain("Change fulfillment to Pickup?");
		expect(source).toContain("Keep Delivery");
		expect(source).toContain('variant="destructive"');
		expect(source).toContain("removeDeliveryCosts: true");
		expect(source).toContain("Change to Pickup");
	});

	it("explains that every Delivery additional cost will be removed", () => {
		expect(source).toContain("deliveryCostCount === 1");
		expect(source).toContain("Delivery additional cost");
		expect(source).toContain("Delivery additional costs");
		expect(source).toContain("from this sale.");
	});

	it("mirrors every order due-date change into the delivery planning date", () => {
		expect(source).toContain("paymentDueDate: dueDate");
		expect(source).toContain("deliveryDueDate: dueDate");
		expect(source).not.toContain("onDeliveryDueDateChange=");
	});

	it("recalculates both fulfillment dates when the order creation date changes", () => {
		expect(source).toContain("previousCreatedAtRef");
		expect(source).toContain("if (previousCreatedAtRef.current === createdAt)");
		expect(source).toContain("calculateLegacyPaymentDueDate(");
		expect(source).toContain("deliveryDueDate: dueDate");
	});
});

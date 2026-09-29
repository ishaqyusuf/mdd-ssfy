import { describe, expect, it } from "bun:test";
import {
	getDealerOfficePaymentState,
	getDealerOrderNextStep,
	getDealerOrderStatusLabel,
	getDealerRequestNextStep,
} from "./dealer-next-step";

describe("getDealerRequestNextStep", () => {
	it("guides a draft quote toward an order request", () => {
		expect(getDealerRequestNextStep({ status: null })).toMatchObject({
			phase: "request_order",
			title: "Review and request the order",
		});
	});

	it("explains that a pending request is under GND review", () => {
		expect(getDealerRequestNextStep({ status: "pending" })).toMatchObject({
			phase: "office_review",
			title: "GND is reviewing your request",
		});
	});

	it("directs a rejected request back to GND without implying it is editable", () => {
		const guidance = getDealerRequestNextStep({ status: "rejected" });

		expect(guidance).toMatchObject({
			phase: "changes_requested",
			title: "Contact GND about the requested changes",
		});
		expect(guidance.description).toContain("quote stays locked");
	});

	it("moves an approved request to payment and fulfillment", () => {
		expect(getDealerRequestNextStep({ status: "approved" })).toMatchObject({
			phase: "order_approved",
			title: "Your order is approved",
		});
	});
});

describe("getDealerOrderNextStep", () => {
	it("uses the same payment and fulfillment status label in list and detail", () => {
		expect(
			getDealerOrderStatusLabel(
				getDealerOrderNextStep({
					officeAmountDue: 760,
					customerAmountDue: 950,
				}),
			),
		).toBe("GND payment due");
		expect(
			getDealerOrderStatusLabel(
				getDealerOrderNextStep({ officeAmountDue: 0, customerAmountDue: 0 }),
			),
		).toBe("Preparing");
		expect(
			getDealerOrderStatusLabel(
				getDealerOrderNextStep({
					officeAmountDue: 0,
					fulfillmentStatus: "ready",
				}),
			),
		).toBe("Ready");
	});
	it("uses the GND ledger—not the customer ledger—to gate dealer payment", () => {
		expect(
			getDealerOrderNextStep({
				officeAmountDue: 120,
				customerAmountDue: 0,
				deliveryOption: "pickup",
			}),
		).toMatchObject({
			phase: "gnd_payment_due",
			title: "Pay GND to move the order forward",
		});
	});

	it("requires review when the GND payable is unknown", () => {
		expect(
			getDealerOrderNextStep({
				officeAmountDue: null,
				customerAmountDue: 0,
				deliveryOption: "pickup",
				fulfillmentStatus: "completed",
			}),
		).toMatchObject({
			phase: "gnd_payment_review",
			title: "Review the GND balance",
		});
	});

	it("does not block fulfillment on the dealer's customer balance", () => {
		const guidance = getDealerOrderNextStep({
			officeAmountDue: 0,
			customerAmountDue: 250,
			deliveryOption: "pickup",
			fulfillmentStatus: "preparing",
		});

		expect(guidance).toMatchObject({
			phase: "preparing_fulfillment",
			title: "GND is preparing your pickup",
		});
		expect(guidance.description).toContain("customer balance");
	});

	it("keeps the established pickup default when old orders have no option", () => {
		expect(
			getDealerOrderNextStep({
				officeAmountDue: 0,
				customerAmountDue: 0,
				deliveryOption: null,
			}),
		).toMatchObject({
			phase: "preparing_fulfillment",
			title: "GND is preparing your pickup",
		});
	});

	it("uses explicit readiness for pickup guidance", () => {
		expect(
			getDealerOrderNextStep({
				officeAmountDue: 0,
				customerAmountDue: 0,
				deliveryOption: "pickup",
				fulfillmentStatus: "ready",
			}),
		).toMatchObject({
			phase: "ready_for_fulfillment",
			title: "Your order is ready for pickup",
		});
	});

	it("uses shipment wording when a ship order is ready", () => {
		expect(
			getDealerOrderNextStep({
				officeAmountDue: 0,
				customerAmountDue: 0,
				deliveryOption: "ship",
				fulfillmentStatus: "ready",
			}),
		).toMatchObject({
			phase: "ready_for_fulfillment",
			title: "Your order is ready for shipment",
		});
	});

	it("surfaces an open dispatch exception to the dealer", () => {
		const guidance = getDealerOrderNextStep({
			officeAmountDue: 0,
			customerAmountDue: 65,
			deliveryOption: "ship",
			fulfillmentStatus: "exception",
		});
		expect(guidance).toMatchObject({
			phase: "fulfillment_exception",
			title: "GND is reviewing a fulfillment issue",
		});
		expect(getDealerOrderStatusLabel(guidance)).toBe("Needs GND review");
	});

	it("distinguishes partial fulfillment and transit from readiness", () => {
		const partial = getDealerOrderNextStep({
			officeAmountDue: 0,
			deliveryOption: "ship",
			fulfillmentStatus: "partial",
		});
		expect(partial.phase).toBe("partially_fulfilled");
		expect(getDealerOrderStatusLabel(partial)).toBe("Partially fulfilled");

		const transit = getDealerOrderNextStep({
			officeAmountDue: 0,
			deliveryOption: "ship",
			fulfillmentStatus: "in_transit",
		});
		expect(transit.phase).toBe("in_transit");
		expect(getDealerOrderStatusLabel(transit)).toBe("In transit");
	});

	it("recognizes completed pickup and delivery states", () => {
		expect(
			getDealerOrderNextStep({
				officeAmountDue: 0,
				customerAmountDue: 0,
				deliveryOption: "pickup",
				fulfillmentStatus: "completed",
			}),
		).toMatchObject({
			phase: "fulfilled",
			title: "Pickup complete",
		});
		expect(
			getDealerOrderNextStep({
				officeAmountDue: 0,
				customerAmountDue: 0,
				deliveryOption: "delivery",
				fulfillmentStatus: "completed",
			}),
		).toMatchObject({
			phase: "fulfilled",
			title: "Delivery complete",
		});
		expect(
			getDealerOrderNextStep({
				officeAmountDue: 0,
				deliveryOption: "ship",
				fulfillmentStatus: "completed",
			}),
		).toMatchObject({ title: "Shipment complete" });
	});

	it("keeps order cancellation separate from fulfillment state", () => {
		expect(
			getDealerOrderNextStep({
				officeAmountDue: 0,
				customerAmountDue: 0,
				deliveryOption: "delivery",
				status: "New",
				fulfillmentStatus: "preparing",
			}).phase,
		).toBe("preparing_fulfillment");
		expect(
			getDealerOrderNextStep({
				officeAmountDue: 0,
				customerAmountDue: 0,
				deliveryOption: "delivery",
				status: "cancelled",
				fulfillmentStatus: "preparing",
			}).phase,
		).toBe("cancelled");
	});
});

describe("getDealerOfficePaymentState", () => {
	it("keeps an unavailable GND balance out of the paid state", () => {
		expect(getDealerOfficePaymentState(null)).toEqual({
			state: "review",
			amount: null,
		});
		expect(getDealerOfficePaymentState(Number.NaN)).toEqual({
			state: "review",
			amount: null,
		});
	});

	it("distinguishes a payable balance from a settled balance", () => {
		expect(getDealerOfficePaymentState(405.38)).toEqual({
			state: "due",
			amount: 405.38,
		});
		expect(getDealerOfficePaymentState(0)).toEqual({
			state: "paid",
			amount: 0,
		});
	});
});

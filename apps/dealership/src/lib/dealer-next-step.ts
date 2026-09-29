export type DealerNextStepTone =
	| "neutral"
	| "attention"
	| "positive"
	| "complete";

export type DealerNextStepGuidance = {
	phase:
		| "request_order"
		| "office_review"
		| "changes_requested"
		| "order_approved"
		| "gnd_payment_review"
		| "gnd_payment_due"
		| "preparing_fulfillment"
		| "ready_for_fulfillment"
		| "in_transit"
		| "partially_fulfilled"
		| "fulfillment_exception"
		| "fulfilled"
		| "cancelled";
	title: string;
	description: string;
	tone: DealerNextStepTone;
};

export function getDealerOrderStatusLabel(guidance: DealerNextStepGuidance) {
	switch (guidance.phase) {
		case "cancelled":
			return "Cancelled";
		case "gnd_payment_review":
			return "Review with GND";
		case "fulfillment_exception":
			return "Needs GND review";
		case "in_transit":
			return "In transit";
		case "partially_fulfilled":
			return "Partially fulfilled";
		case "gnd_payment_due":
			return "GND payment due";
		case "fulfilled":
			return "Completed";
		case "ready_for_fulfillment":
			return "Ready";
		default:
			return "Preparing";
	}
}

type DealerRequestNextStepInput = {
	status?: string | null;
};

type DealerOrderNextStepInput = {
	officeAmountDue?: number | null;
	customerAmountDue?: number | null;
	deliveryOption?: string | null;
	status?: string | null;
	fulfillmentStatus?:
		| "preparing"
		| "ready"
		| "completed"
		| "exception"
		| "in_transit"
		| "partial"
		| null;
};

function normalized(value?: string | null) {
	return String(value || "")
		.trim()
		.toLowerCase();
}

export function getDealerRequestNextStep({
	status,
}: DealerRequestNextStepInput): DealerNextStepGuidance {
	switch (normalized(status)) {
		case "pending":
			return {
				phase: "office_review",
				title: "GND is reviewing your request",
				description:
					"GND is checking pricing and fulfillment details. The quote stays locked while the review is open.",
				tone: "attention",
			};
		case "rejected":
			return {
				phase: "changes_requested",
				title: "Contact GND about the requested changes",
				description:
					"Review the decision note with your GND sales team. This quote stays locked until GND opens a revision.",
				tone: "attention",
			};
		case "approved":
			return {
				phase: "order_approved",
				title: "Your order is approved",
				description:
					"Open the order to review the GND balance, customer balance, and fulfillment plan.",
				tone: "positive",
			};
		default:
			return {
				phase: "request_order",
				title: "Review and request the order",
				description:
					"Confirm the quote and fulfillment details, then send it to GND for approval.",
				tone: "neutral",
			};
	}
}

function isPickup(deliveryOption?: string | null) {
	const option = normalized(deliveryOption);
	return option === "" || option === "pickup";
}

function fulfillmentNoun(deliveryOption?: string | null) {
	if (isPickup(deliveryOption)) return "pickup";
	return normalized(deliveryOption) === "ship" ? "shipment" : "delivery";
}

function finiteAmount(value?: number | null) {
	if (value == null) return null;
	const amount = Number(value);
	return Number.isFinite(amount) ? amount : null;
}

export function getDealerOfficePaymentState(value?: number | null) {
	const amount = finiteAmount(value);
	if (amount == null) {
		return { state: "review", amount: null } as const;
	}
	if (amount > 0) {
		return { state: "due", amount } as const;
	}
	return { state: "paid", amount } as const;
}

export function getDealerOrderNextStep({
	officeAmountDue,
	customerAmountDue,
	deliveryOption,
	status,
	fulfillmentStatus,
}: DealerOrderNextStepInput): DealerNextStepGuidance {
	const orderStatus = normalized(status);
	const officePayment = getDealerOfficePaymentState(officeAmountDue);
	const fulfillment = fulfillmentNoun(deliveryOption);
	const customerBalanceNote =
		Number(customerAmountDue || 0) > 0
			? " A customer balance remains and can be updated from the Payment tab."
			: "";

	if (/(cancel|refund)/.test(orderStatus)) {
		return {
			phase: "cancelled",
			title: "Contact GND about this order",
			description:
				"This order is cancelled or under refund review. Contact your GND sales team before taking another action.",
			tone: "attention",
		};
	}

	if (fulfillmentStatus === "exception") {
		return {
			phase: "fulfillment_exception",
			title: "GND is reviewing a fulfillment issue",
			description:
				"Contact your GND sales team for the latest pickup, delivery, or shipment plan.",
			tone: "attention",
		};
	}

	if (officePayment.state === "review") {
		return {
			phase: "gnd_payment_review",
			title: "Review the GND balance",
			description:
				"The current GND balance is unavailable. Open the order or contact your GND sales team before treating it as paid.",
			tone: "attention",
		};
	}

	if (officePayment.state === "due") {
		return {
			phase: "gnd_payment_due",
			title: "Pay GND to move the order forward",
			description:
				"The order is approved. Pay the GND balance from this order; the customer balance is tracked separately.",
			tone: "attention",
		};
	}

	if (fulfillmentStatus === "completed") {
		return {
			phase: "fulfilled",
			title: isPickup(deliveryOption)
				? "Pickup complete"
				: normalized(deliveryOption) === "ship"
					? "Shipment complete"
					: "Delivery complete",
			description: `GND payment and ${fulfillment} are complete.${customerBalanceNote}`,
			tone: "complete",
		};
	}

	if (fulfillmentStatus === "partial") {
		return {
			phase: "partially_fulfilled",
			title: "Part of this order is complete",
			description: `GND is still working on the remaining ${fulfillment}. Contact your GND sales team for details.${customerBalanceNote}`,
			tone: "attention",
		};
	}

	if (fulfillmentStatus === "in_transit") {
		return {
			phase: "in_transit",
			title: "Your order is in transit",
			description: `Watch this order for completion updates or contact your GND sales team.${customerBalanceNote}`,
			tone: "positive",
		};
	}

	if (fulfillmentStatus === "ready") {
		return {
			phase: "ready_for_fulfillment",
			title: `Your order is ready for ${fulfillment}`,
			description: isPickup(deliveryOption)
				? `GND payment is complete. Coordinate pickup with your GND sales team.${customerBalanceNote}`
				: `GND payment is complete. Watch this order for delivery scheduling and updates.${customerBalanceNote}`,
			tone: "positive",
		};
	}

	return {
		phase: "preparing_fulfillment",
		title: `GND is preparing your ${fulfillment}`,
		description: `GND payment is complete. Watch this order for a ready-for-${fulfillment} update.${customerBalanceNote}`,
		tone: "neutral",
	};
}

import type { SalesPaymentMethods } from "../../constants";
import { roundMoney } from "./money";

export interface PaymentChannelCharge {
	type: "ccc";
	label: "C.C.C";
	applies: boolean;
	paymentMethod: SalesPaymentMethods | string | null | undefined;
	baseAmount: number;
	percentage: number;
	amount: number;
	chargeAmount: number;
}

const CCC_PAYMENT_METHODS = new Set(["credit-card", "link", "terminal"]);

function normalizePaymentMethod(value: string | null | undefined) {
	return String(value || "")
		.trim()
		.toLowerCase()
		.replaceAll("_", "-")
		.replaceAll(" ", "-");
}

export function appliesPaymentChannelCharge(
	paymentMethod: SalesPaymentMethods | string | null | undefined,
) {
	return CCC_PAYMENT_METHODS.has(normalizePaymentMethod(paymentMethod));
}

export function calculatePaymentChannelCharge(input: {
	paymentMethod: SalesPaymentMethods | string | null | undefined;
	paymentAmount: number | string | null | undefined;
	cccPercentage?: number | string | null;
}): PaymentChannelCharge {
	const baseAmount = roundMoney(Number(input.paymentAmount || 0));
	const percentage = Math.max(0, roundMoney(Number(input.cccPercentage ?? 3.5)));
	const applies = appliesPaymentChannelCharge(input.paymentMethod);
	const amount = applies ? roundMoney((baseAmount * percentage) / 100) : 0;

	return {
		type: "ccc",
		label: "C.C.C",
		applies,
		paymentMethod: input.paymentMethod,
		baseAmount,
		percentage,
		amount,
		chargeAmount: roundMoney(baseAmount + amount),
	};
}

export function buildPaymentChannelChargeMeta(charge: PaymentChannelCharge) {
	return {
		salesAmount: charge.baseAmount,
		feeAmount: charge.amount,
		customerChargeAmount: charge.chargeAmount,
		paymentCharges: charge.applies
			? [
					{
						type: charge.type,
						label: charge.label,
						baseAmount: charge.baseAmount,
						percentage: charge.percentage,
						amount: charge.amount,
						source: "payment_method",
					},
				]
			: [],
	};
}

import { calculatePaymentChannelCharge } from "./payment-channel-charge";
import { roundMoney } from "./money";

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function finiteNumber(value: unknown): number | null {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
}

function stringValue(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function resolveSalesDisplayPaymentMethod(input: {
	paymentMethod?: string | null;
	meta?: unknown;
}) {
	const meta = asRecord(input.meta);
	const newSalesForm = asRecord(meta?.newSalesForm);
	const form = asRecord(newSalesForm?.form);
	return (
		stringValue(input.paymentMethod) ||
		stringValue(form?.paymentMethod) ||
		stringValue(meta?.payment_option) ||
		stringValue(meta?.paymentOption)
	);
}

export function resolveSalesDisplayCcc(input: {
	baseTotal?: number | string | null;
	paymentMethod?: string | null;
	cccPercentage?: number | string | null;
	meta?: unknown;
}) {
	const meta = asRecord(input.meta);
	const baseTotal = roundMoney(Number(input.baseTotal || 0));
	const storedCcc = finiteNumber(meta?.ccc);
	const cccPercentage =
		finiteNumber(input.cccPercentage) ?? finiteNumber(meta?.ccc_percentage);
	const paymentMethod = resolveSalesDisplayPaymentMethod({
		paymentMethod: input.paymentMethod,
		meta,
	});
	const calculatedCharge = calculatePaymentChannelCharge({
		paymentMethod,
		paymentAmount: baseTotal,
		cccPercentage,
	});
	const ccc = roundMoney(
		storedCcc && storedCcc > 0 ? storedCcc : calculatedCharge.amount,
	);

	return {
		baseTotal,
		ccc,
		totalWithCcc: roundMoney(baseTotal + ccc),
		paymentMethod,
		cccPercentage: calculatedCharge.percentage,
	};
}

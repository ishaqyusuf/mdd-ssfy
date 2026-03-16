import type { SalesResolutionConflictType } from "../../constants";
import type {
	ResolveOrderPaymentConflictInput,
	ResolveOrderPaymentConflictResult,
} from "../contracts";

function roundMoney(value: number | null | undefined) {
	const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
	return Math.round(amount * 100) / 100;
}

export function classifyOrderPaymentConflict(
	input: ResolveOrderPaymentConflictInput,
): ResolveOrderPaymentConflictResult {
	const due = roundMoney(input.storedAmountDue);
	const calculatedDue = roundMoney(input.calculatedAmountDue);
	const normalizedAmounts = (input.paymentAmounts || []).map(roundMoney);
	const hasDuplicatePayments =
		normalizedAmounts.length !== new Set(normalizedAmounts).size;

	let status: SalesResolutionConflictType | "" = "";
	if (due < 0) {
		status = "overpayment";
	} else if (hasDuplicatePayments) {
		status = "duplicate payments";
	} else if (due !== calculatedDue) {
		status = "payment not up to date";
	}

	return {
		status,
		hasDuplicatePayments,
	};
}

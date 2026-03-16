import type {
	OrderPaymentProjection,
	PaymentAllocationRecord,
	PaymentLedgerEntryRecord,
} from "../contracts";
import { roundMoney, sumMoney } from "./money";

export interface BuildOrderPaymentProjectionInput {
	salesOrderId?: number | null;
	grandTotal: number | null | undefined;
	ledgerEntries?: PaymentLedgerEntryRecord[] | null;
	allocations?: PaymentAllocationRecord[] | null;
	refundedAmount?: number | null | undefined;
	voidedAmount?: number | null | undefined;
}

export function buildOrderPaymentProjection(
	input: BuildOrderPaymentProjectionInput,
): OrderPaymentProjection {
	const ledgerEntries = input.ledgerEntries || [];
	const allocations = input.allocations || [];
	const totalRecorded = sumMoney(
		ledgerEntries
			.filter((entry) => entry.status === "posted")
			.map((entry) => entry.amount),
	);
	const totalAllocated = sumMoney(
		allocations
			.filter((allocation) => allocation.allocationType === "payment")
			.map((allocation) => allocation.amount),
	);
	const totalRefunded = roundMoney(input.refundedAmount);
	const totalVoided = roundMoney(input.voidedAmount);
	const grandTotal = roundMoney(input.grandTotal);
	const netSettled = roundMoney(totalAllocated - totalRefunded - totalVoided);
	const amountDue = roundMoney(Math.max(grandTotal - netSettled, 0));
	const overpaidAmount = roundMoney(Math.max(netSettled - grandTotal, 0));

	return {
		salesOrderId: input.salesOrderId || null,
		grandTotal,
		totalRecorded,
		totalAllocated,
		totalRefunded,
		totalVoided,
		amountDue,
		overpaidAmount,
	};
}

export interface LegacyPaymentRecord {
	amount: number | null | undefined;
	status?: string | null;
}

export function buildLegacyOrderPaymentProjection(input: {
	salesOrderId?: number | null;
	grandTotal: number | null | undefined;
	payments?: LegacyPaymentRecord[] | null;
}) {
	const successfulPayments = (input.payments || []).filter(
		(payment) => String(payment.status || "").toLowerCase() === "success",
	);

	return buildOrderPaymentProjection({
		salesOrderId: input.salesOrderId,
		grandTotal: input.grandTotal,
		allocations: successfulPayments.map((payment) => ({
			salesOrderId: input.salesOrderId || 0,
			amount: payment.amount,
			allocationType: "payment",
		})),
	});
}

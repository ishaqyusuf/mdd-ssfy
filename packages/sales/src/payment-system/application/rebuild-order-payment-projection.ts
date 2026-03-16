import type {
	OrderPaymentProjection,
	PaymentAllocationRecord,
	PaymentLedgerEntryRecord,
} from "../contracts";
import { buildOrderPaymentProjection } from "../domain";

export interface RebuildOrderPaymentProjectionInput {
	salesOrderId?: number | null;
	grandTotal: number | null | undefined;
	ledgerEntries?: PaymentLedgerEntryRecord[] | null;
	allocations?: PaymentAllocationRecord[] | null;
	refundedAmount?: number | null | undefined;
	voidedAmount?: number | null | undefined;
}

export function rebuildOrderPaymentProjection(
	input: RebuildOrderPaymentProjectionInput,
): OrderPaymentProjection {
	return buildOrderPaymentProjection(input);
}

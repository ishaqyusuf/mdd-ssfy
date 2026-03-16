import type { SalesResolutionConflictType } from "../../constants";

export interface ResolveOrderPaymentConflictInput {
	paidAmount: number | null | undefined;
	storedAmountDue: number | null | undefined;
	calculatedAmountDue: number | null | undefined;
	paymentAmounts?: Array<number | null | undefined> | null;
}

export interface ResolveOrderPaymentConflictResult {
	status: SalesResolutionConflictType | "";
	hasDuplicatePayments: boolean;
}

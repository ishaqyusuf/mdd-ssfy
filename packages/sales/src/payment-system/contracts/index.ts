export type PaymentLedgerEntryType =
	| "manual_payment_recorded"
	| "wallet_payment_applied"
	| "checkout_completed"
	| "refund_recorded"
	| "void_recorded"
	| "adjustment_recorded";

export type PaymentLedgerEntryStatus =
	| "draft"
	| "pending"
	| "posted"
	| "voided"
	| "failed";

export type PaymentAllocationType =
	| "payment"
	| "refund"
	| "void"
	| "adjustment";

export interface PaymentLedgerEntryRecord {
	id?: string | null;
	entryType: PaymentLedgerEntryType;
	status: PaymentLedgerEntryStatus;
	amount: number | null | undefined;
	salesOrderId?: number | null;
	occurredAt?: Date | string | null;
	idempotencyKey?: string | null;
}

export interface PaymentAllocationRecord {
	id?: string | null;
	ledgerEntryId?: string | null;
	salesOrderId: number;
	amount: number | null | undefined;
	allocationType: PaymentAllocationType;
}

export interface OrderPaymentProjection {
	salesOrderId?: number | null;
	grandTotal: number;
	totalRecorded: number;
	totalAllocated: number;
	totalRefunded: number;
	totalVoided: number;
	amountDue: number;
	overpaidAmount: number;
}

export * from "./checkout";
export * from "./payment-processor";
export * from "./payment-events";

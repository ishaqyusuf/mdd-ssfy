import type { SalesFinanceTransaction } from "./projection";

export const SALES_FINANCE_RECONCILIATION_ACTIONS = [
	"opened",
	"resolved",
] as const;
export type SalesFinanceReconciliationAction =
	(typeof SALES_FINANCE_RECONCILIATION_ACTIONS)[number];

export const SALES_FINANCE_RECONCILIATION_RESOLUTIONS = [
	"verified",
	"corrected_source",
	"accepted_legacy",
	"duplicate_record",
] as const;
export type SalesFinanceReconciliationResolution =
	(typeof SALES_FINANCE_RECONCILIATION_RESOLUTIONS)[number];

export type SalesFinanceReconciliationStatus =
	| "clean"
	| "unreviewed"
	| "in_progress"
	| "resolved"
	| "stale";

export type SalesFinanceReconciliationEvent = {
	id: number;
	userId?: number | null;
	createdAt?: Date | string | null;
	data: {
		action?: string | null;
		fingerprint?: string | null;
		note?: string | null;
		resolution?: string | null;
	};
};

export type SalesFinanceReconciledTransaction = SalesFinanceTransaction & {
	rawNeedsReview: boolean;
	reconciliationStatus: SalesFinanceReconciliationStatus;
	reconciliationEventId: number | null;
	reconciliationNote: string | null;
	reconciliationResolution: SalesFinanceReconciliationResolution | null;
	reconciledAt: Date | string | null;
	reconciledById: number | null;
};

export function buildSalesFinanceReconciliationEvidence(
	transaction: SalesFinanceTransaction,
) {
	return {
		transactionId: transaction.id,
		paymentNo: transaction.paymentNo,
		status: transaction.status.trim().toLowerCase(),
		paymentMethod: transaction.paymentMethod,
		reference: transaction.reference || null,
		customerId: transaction.customerId,
		customerName: transaction.customerName || null,
		receivedAmount: transaction.receivedAmount,
		principalAmount: transaction.principalAmount,
		refundedAmount: transaction.refundedAmount,
		appliedAmount: transaction.appliedAmount,
		unappliedAmount: transaction.unappliedAmount,
		overappliedAmount: transaction.overappliedAmount,
		orderNos: [...transaction.orderNos].sort(),
		exceptionCodes: [...transaction.exceptionCodes].sort(),
	};
}

export function buildSalesFinanceReconciliationFingerprint(
	transaction: SalesFinanceTransaction,
) {
	return JSON.stringify(buildSalesFinanceReconciliationEvidence(transaction));
}

function isResolution(
	value?: string | null,
): value is SalesFinanceReconciliationResolution {
	return SALES_FINANCE_RECONCILIATION_RESOLUTIONS.includes(
		value as SalesFinanceReconciliationResolution,
	);
}

export function applySalesFinanceReconciliation(
	transaction: SalesFinanceTransaction,
	events: SalesFinanceReconciliationEvent[],
): SalesFinanceReconciledTransaction {
	const rawNeedsReview = transaction.needsReview;

	if (!rawNeedsReview) {
		return {
			...transaction,
			rawNeedsReview,
			reconciliationStatus: "clean",
			reconciliationEventId: null,
			reconciliationNote: null,
			reconciliationResolution: null,
			reconciledAt: null,
			reconciledById: null,
		};
	}

	const fingerprint = buildSalesFinanceReconciliationFingerprint(transaction);
	const orderedEvents = [...events].sort((left, right) => {
		const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
		const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
		return leftTime === rightTime ? left.id - right.id : leftTime - rightTime;
	});
	const latest = orderedEvents.at(-1);

	if (!latest) {
		return {
			...transaction,
			rawNeedsReview,
			reconciliationStatus: "unreviewed",
			reconciliationEventId: null,
			reconciliationNote: null,
			reconciliationResolution: null,
			reconciledAt: null,
			reconciledById: null,
		};
	}

	const currentEvidence = latest.data.fingerprint === fingerprint;
	const action = latest.data.action;
	const resolved = currentEvidence && action === "resolved";
	const inProgress = currentEvidence && action === "opened";

	return {
		...transaction,
		needsReview: !resolved,
		rawNeedsReview,
		reconciliationStatus: resolved
			? "resolved"
			: inProgress
				? "in_progress"
				: "stale",
		reconciliationEventId: latest.id,
		reconciliationNote: latest.data.note?.trim() || null,
		reconciliationResolution: isResolution(latest.data.resolution)
			? latest.data.resolution
			: null,
		reconciledAt: resolved ? latest.createdAt || null : null,
		reconciledById: resolved ? latest.userId || null : null,
	};
}

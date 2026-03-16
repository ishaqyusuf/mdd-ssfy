export interface PaymentReconciliationRow {
	salesId: number;
	orderId: string;
	legacyGrandTotal: number;
	legacyAmountDue: number;
	legacyPaidAmount: number;
	canonicalAmountDue: number | null;
	canonicalAllocated: number | null;
	canonicalRefunded: number | null;
	canonicalVoided: number | null;
	canonicalVersion: number | null;
}

export interface PaymentReconciliationFinding {
	salesId: number;
	orderId: string;
	findingType:
		| "missing_canonical_projection"
		| "amount_due_mismatch"
		| "allocation_mismatch";
	legacyAmountDue: number;
	legacyPaidAmount: number;
	canonicalAmountDue: number | null;
	canonicalAllocated: number | null;
}

export interface PaymentReconciliationReport {
	totalOrders: number;
	matchedOrders: number;
	mismatchedOrders: number;
	missingCanonicalProjection: number;
	amountDueMismatch: number;
	allocationMismatch: number;
	findings: PaymentReconciliationFinding[];
}

function roundMoney(value: number | null | undefined) {
	const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
	return Math.round(amount * 100) / 100;
}

export function buildPaymentReconciliationReport(
	rows: PaymentReconciliationRow[],
): PaymentReconciliationReport {
	const findings: PaymentReconciliationFinding[] = [];

	for (const row of rows) {
		if (row.canonicalAmountDue == null) {
			findings.push({
				salesId: row.salesId,
				orderId: row.orderId,
				findingType: "missing_canonical_projection",
				legacyAmountDue: roundMoney(row.legacyAmountDue),
				legacyPaidAmount: roundMoney(row.legacyPaidAmount),
				canonicalAmountDue: null,
				canonicalAllocated: row.canonicalAllocated,
			});
			continue;
		}

		const legacyAmountDue = roundMoney(row.legacyAmountDue);
		const legacyPaidAmount = roundMoney(row.legacyPaidAmount);
		const canonicalAmountDue = roundMoney(row.canonicalAmountDue);
		const canonicalAllocated = roundMoney(row.canonicalAllocated);

		if (legacyAmountDue !== canonicalAmountDue) {
			findings.push({
				salesId: row.salesId,
				orderId: row.orderId,
				findingType: "amount_due_mismatch",
				legacyAmountDue,
				legacyPaidAmount,
				canonicalAmountDue,
				canonicalAllocated,
			});
			continue;
		}

		if (legacyPaidAmount !== canonicalAllocated) {
			findings.push({
				salesId: row.salesId,
				orderId: row.orderId,
				findingType: "allocation_mismatch",
				legacyAmountDue,
				legacyPaidAmount,
				canonicalAmountDue,
				canonicalAllocated,
			});
		}
	}

	return {
		totalOrders: rows.length,
		matchedOrders: rows.length - findings.length,
		mismatchedOrders: findings.length,
		missingCanonicalProjection: findings.filter(
			(item) => item.findingType === "missing_canonical_projection",
		).length,
		amountDueMismatch: findings.filter(
			(item) => item.findingType === "amount_due_mismatch",
		).length,
		allocationMismatch: findings.filter(
			(item) => item.findingType === "allocation_mismatch",
		).length,
		findings,
	};
}

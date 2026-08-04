import {
	addMoney,
	roundMoney,
	subtractMoney,
} from "../../payment-system/domain/money";

export type SalesAdjustmentDirection =
	| "NONE"
	| "INCREASE"
	| "REDUCTION"
	| "MIXED";

export type SalesAdjustmentCommitmentKind =
	| "PAYMENT"
	| "INBOUND"
	| "INVENTORY"
	| "PRODUCTION"
	| "FULFILLMENT";

export type SalesAdjustmentLineInput = {
	uid: string;
	id?: number | null;
	title?: string | null;
	description?: string | null;
	qty?: number | null;
	lineTotal?: number | null;
};

export type SalesAdjustmentSnapshotInput = {
	lineItems: SalesAdjustmentLineInput[];
	summary: { grandTotal?: number | null };
};

export type SalesAdjustmentCommitments = {
	paymentTotal?: number | null;
	inboundQty?: number | null;
	allocatedQty?: number | null;
	productionQty?: number | null;
	fulfilledQty?: number | null;
};

export type SalesAdjustmentLineChange = {
	uid: string;
	id: number | null;
	title: string;
	beforeQty: number;
	afterQty: number;
	quantityDelta: number;
	beforeLineTotal: number;
	afterLineTotal: number;
	lineTotalDelta: number;
};

function finite(value: number | null | undefined) {
	return Number.isFinite(value) ? Number(value) : 0;
}

function lineTitle(
	before: SalesAdjustmentLineInput | undefined,
	after: SalesAdjustmentLineInput | undefined,
) {
	return (
		after?.title ||
		before?.title ||
		after?.description ||
		before?.description ||
		after?.uid ||
		before?.uid ||
		"Line item"
	);
}

function resolveDirection(changes: SalesAdjustmentLineChange[]) {
	const hasIncrease = changes.some((line) => line.quantityDelta > 0);
	const hasReduction = changes.some((line) => line.quantityDelta < 0);
	if (hasIncrease && hasReduction) return "MIXED" as const;
	if (hasIncrease) return "INCREASE" as const;
	if (hasReduction) return "REDUCTION" as const;
	return "NONE" as const;
}

export function getSalesAdjustmentCommitmentKinds(
	commitments: SalesAdjustmentCommitments,
): SalesAdjustmentCommitmentKind[] {
	const kinds: SalesAdjustmentCommitmentKind[] = [];
	if (finite(commitments.paymentTotal) > 0) kinds.push("PAYMENT");
	if (finite(commitments.inboundQty) > 0) kinds.push("INBOUND");
	if (finite(commitments.allocatedQty) > 0) kinds.push("INVENTORY");
	if (finite(commitments.productionQty) > 0) kinds.push("PRODUCTION");
	if (finite(commitments.fulfilledQty) > 0) kinds.push("FULFILLMENT");
	return kinds;
}

export function analyzeSalesFormChange(input: {
	before: SalesAdjustmentSnapshotInput;
	after: SalesAdjustmentSnapshotInput;
	commitments: SalesAdjustmentCommitments;
}) {
	const beforeByUid = new Map(
		input.before.lineItems.map((line) => [line.uid, line]),
	);
	const afterByUid = new Map(
		input.after.lineItems.map((line) => [line.uid, line]),
	);
	const uids = new Set([...beforeByUid.keys(), ...afterByUid.keys()]);
	const lines: SalesAdjustmentLineChange[] = [];

	for (const uid of uids) {
		const before = beforeByUid.get(uid);
		const after = afterByUid.get(uid);
		const beforeQty = finite(before?.qty);
		const afterQty = finite(after?.qty);
		if (beforeQty === afterQty) continue;
		const beforeLineTotal = roundMoney(before?.lineTotal);
		const afterLineTotal = roundMoney(after?.lineTotal);
		lines.push({
			uid,
			id: after?.id ?? before?.id ?? null,
			title: lineTitle(before, after),
			beforeQty,
			afterQty,
			quantityDelta: afterQty - beforeQty,
			beforeLineTotal,
			afterLineTotal,
			lineTotalDelta: subtractMoney(afterLineTotal, beforeLineTotal),
		});
	}

	const direction = resolveDirection(lines);
	const commitmentKinds = getSalesAdjustmentCommitmentKinds(input.commitments);
	const beforeGrandTotal = roundMoney(input.before.summary.grandTotal);
	const afterGrandTotal = roundMoney(input.after.summary.grandTotal);

	return {
		direction,
		lines,
		commitmentKinds,
		hasCommitments: commitmentKinds.length > 0,
		requiresApproval: direction !== "NONE" && commitmentKinds.length > 0,
		beforeGrandTotal,
		afterGrandTotal,
		totalDelta: subtractMoney(afterGrandTotal, beforeGrandTotal),
	};
}

export function calculateSalesAdjustmentSettlement(input: {
	beforeGrandTotal: number;
	afterGrandTotal: number;
	paymentTotal: number;
}) {
	const afterGrandTotal = roundMoney(input.afterGrandTotal);
	const paymentTotal = roundMoney(input.paymentTotal);
	const paymentAppliedAfter = Math.min(paymentTotal, afterGrandTotal);

	return {
		amountDelta: subtractMoney(afterGrandTotal, input.beforeGrandTotal),
		amountDue: Math.max(0, subtractMoney(afterGrandTotal, paymentTotal)),
		walletCredit: Math.max(0, subtractMoney(paymentTotal, afterGrandTotal)),
		paymentAppliedAfter: addMoney(paymentAppliedAfter),
	};
}

export function resolveSalesAdjustmentApplyClaim(input: {
	claimCount: number;
	currentStatus?: string | null;
}) {
	if (input.claimCount > 0) return "ACQUIRED" as const;
	if (
		input.currentStatus === "APPLIED" ||
		input.currentStatus === "APPLIED_WITH_REVIEW"
	) {
		return "ALREADY_APPLIED" as const;
	}
	return "NOT_READY" as const;
}

export function resolveSalesAdjustmentStaleReason(input: {
	sourceVersion: string | null | undefined;
	liveVersion: string;
	approvedPaymentTotal: number;
	livePaymentTotal: number;
	quantityFloorChanged: boolean;
}) {
	if (input.quantityFloorChanged)
		return "IRREVERSIBLE_QUANTITY_CHANGED" as const;
	if (
		roundMoney(input.approvedPaymentTotal) !==
		roundMoney(input.livePaymentTotal)
	) {
		return "PAYMENT_PROJECTION_CHANGED" as const;
	}
	if (input.sourceVersion && input.sourceVersion !== input.liveVersion) {
		return "SOURCE_VERSION_CHANGED" as const;
	}
	return null;
}

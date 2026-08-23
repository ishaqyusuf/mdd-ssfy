import { isFinalizedProductionSubmission } from "../production-submission-review/policy";

export type ProductionHandoffSubmission = {
	id: number;
	qty?: number | null;
	lhQty?: number | null;
	rhQty?: number | null;
	deletedAt?: Date | string | null;
	materialReview?: { status: string } | null;
};

export type ProductionHandoffAssignment = {
	id: number;
	salesItemId: number;
	controlUid: string | null;
	assignedToId?: number | null;
	qtyAssigned?: number | null;
	lhQty?: number | null;
	rhQty?: number | null;
	completedAt?: Date | string | null;
	deletedAt?: Date | string | null;
	submissions?: ProductionHandoffSubmission[] | null;
};

export type ProductionHandoffItem = {
	salesItemId: number;
	controlUid: string;
	productionCapable: boolean;
	requiredQty?: number | null;
	lhQty?: number | null;
	rhQty?: number | null;
	deletedAt?: Date | string | null;
	assignments?: ProductionHandoffAssignment[] | null;
};

export type ProductionHandoffProjectionReason =
	| "ACTION_REQUIRED"
	| "PAYMENT_NOT_QUALIFIED"
	| "ORDER_INACTIVE"
	| "NO_PRODUCTION_REQUIRED"
	| "FULLY_COVERED";

export type ProductionHandoffProjection = {
	actionable: boolean;
	uncoveredQty: number;
	productionItemCount: number;
	reason: ProductionHandoffProjectionReason;
	evidenceRevision: string;
	orderRevision: string;
	targetSalesItemId: number | null;
	targetControlUid: string | null;
	targetAssignmentId: number | null;
};

function normalizedQty(input: {
	qty?: number | null;
	lhQty?: number | null;
	rhQty?: number | null;
}) {
	const qty = Number(input.qty || 0);
	const hands = Number(input.lhQty || 0) + Number(input.rhQty || 0);
	const value = qty > 0 ? qty : hands;
	return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function stableEvidenceRevision(value: unknown) {
	const text = JSON.stringify(value);
	let hash = 2_166_136_261;
	for (let index = 0; index < text.length; index += 1) {
		hash ^= text.charCodeAt(index);
		hash = Math.imul(hash, 16_777_619);
	}
	return `production-v1-${(hash >>> 0).toString(36)}`;
}

function assignmentApplies(
	assignment: ProductionHandoffAssignment,
	item: ProductionHandoffItem,
) {
	if (assignment.deletedAt) return false;
	if (
		assignment.salesItemId !== item.salesItemId ||
		assignment.controlUid !== item.controlUid
	) {
		return false;
	}
	return true;
}

function finalizedSubmissionQty(
	assignment: ProductionHandoffAssignment,
	item: ProductionHandoffItem,
) {
	const submissions = new Map(
		(assignment.submissions || []).map((submission) => [
			submission.id,
			submission,
		]),
	);
	let total = 0;
	for (const submission of submissions.values()) {
		if (!isFinalizedProductionSubmission(submission)) continue;
		total += normalizedQty({
			qty: submission.qty,
			lhQty: submission.lhQty,
			rhQty: submission.rhQty,
		});
	}
	return total;
}

function assignmentCoverage(
	assignment: ProductionHandoffAssignment,
	item: ProductionHandoffItem,
) {
	if (!assignmentApplies(assignment, item)) return 0;
	const completedEvidence = finalizedSubmissionQty(assignment, item);
	const ownedAssignment = assignment.assignedToId != null;
	const assignedQty = normalizedQty({
		qty: assignment.qtyAssigned,
		lhQty: assignment.lhQty,
		rhQty: assignment.rhQty,
	});
	const ownedCoverage = ownedAssignment ? assignedQty : 0;
	return Math.max(ownedCoverage, completedEvidence);
}

export function projectProductionSalesHandoff(input: {
	paymentQualified: boolean;
	lifecycleActive: boolean;
	orderRevision: string;
	items: ProductionHandoffItem[];
}): ProductionHandoffProjection {
	const items = input.items
		.filter((item) => item.productionCapable && !item.deletedAt)
		.sort(
			(left, right) =>
				left.salesItemId - right.salesItemId ||
				left.controlUid.localeCompare(right.controlUid),
		);
	const itemEvidence = items.map((item) => {
		const requiredQty = normalizedQty({
			qty: item.requiredQty,
			lhQty: item.lhQty,
			rhQty: item.rhQty,
		});
		const assignments = Array.from(
			new Map<number, ProductionHandoffAssignment>(
				(item.assignments || []).map((assignment) => [
					assignment.id,
					assignment,
				]),
			).values(),
		)
			.filter((assignment) => assignmentApplies(assignment, item))
			.sort((left, right) => left.id - right.id);
		const coveredQty = Math.min(
			requiredQty,
			assignments.reduce(
				(total, assignment) => total + assignmentCoverage(assignment, item),
				0,
			),
		);
		const uncoveredQty = Math.max(0, requiredQty - coveredQty);
		const targetAssignmentId =
			assignments.find(
				(assignment) =>
					assignment.assignedToId == null &&
					assignmentCoverage(assignment, item) === 0,
			)?.id ?? null;
		return {
			salesItemId: item.salesItemId,
			controlUid: item.controlUid,
			requiredQty,
			coveredQty,
			uncoveredQty,
			targetAssignmentId,
			assignments: assignments.map((assignment) => ({
				id: assignment.id,
				assignedToId: assignment.assignedToId ?? null,
				assignedQty: normalizedQty({
					qty: assignment.qtyAssigned,
					lhQty: assignment.lhQty,
					rhQty: assignment.rhQty,
				}),
				completed: Boolean(assignment.completedAt),
				completedQty: finalizedSubmissionQty(assignment, item),
			})),
		};
	});
	const evidenceRevision = stableEvidenceRevision({
		orderRevision: input.orderRevision,
		items: itemEvidence,
	});
	const base = {
		evidenceRevision,
		orderRevision: input.orderRevision,
		productionItemCount: itemEvidence.filter((item) => item.requiredQty > 0)
			.length,
		targetSalesItemId: null,
		targetControlUid: null,
		targetAssignmentId: null,
	};
	if (!input.lifecycleActive) {
		return {
			...base,
			actionable: false,
			uncoveredQty: 0,
			reason: "ORDER_INACTIVE",
		};
	}
	if (!input.paymentQualified) {
		return {
			...base,
			actionable: false,
			uncoveredQty: 0,
			reason: "PAYMENT_NOT_QUALIFIED",
		};
	}
	const requiredItems = itemEvidence.filter((item) => item.requiredQty > 0);
	if (!requiredItems.length) {
		return {
			...base,
			actionable: false,
			uncoveredQty: 0,
			reason: "NO_PRODUCTION_REQUIRED",
		};
	}
	const uncoveredQty =
		Math.round(
			requiredItems.reduce((total, item) => total + item.uncoveredQty, 0) *
				10_000,
		) / 10_000;
	const target = requiredItems.find((item) => item.uncoveredQty > 0) ?? null;
	return {
		...base,
		actionable: uncoveredQty > 0,
		uncoveredQty,
		reason: uncoveredQty > 0 ? "ACTION_REQUIRED" : "FULLY_COVERED",
		targetSalesItemId: target?.salesItemId ?? null,
		targetControlUid: target?.controlUid ?? null,
		targetAssignmentId: target?.targetAssignmentId ?? null,
	};
}

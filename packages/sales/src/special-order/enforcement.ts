import type { Db, TransactionClient } from "@gnd/db";

import {
	type SpecialOrderEnforcementMode,
	type SpecialOrderOperationCategory,
	evaluateSpecialOrderOperation,
	getSpecialOrderStatusLabel,
} from "./domain";

type EnforcementDb = Db | TransactionClient;

const DISPATCH_PROGRESSION_RANK = {
	queue: 0,
	"packing queue": 0,
	"missing items": 0,
	packed: 1,
	"in progress": 2,
	completed: 3,
	cancelled: -1,
} as const;

export type SpecialOrderDispatchStatus = keyof typeof DISPATCH_PROGRESSION_RANK;

/**
 * Special Order enforcement protects forward fulfillment commitments. It must
 * never prevent cancellation, rollback, recovery, or correction transitions.
 */
export function isDispatchProgressionTransition(
	currentStatus: SpecialOrderDispatchStatus,
	nextStatus: SpecialOrderDispatchStatus,
) {
	if (nextStatus === "cancelled") return false;
	return (
		DISPATCH_PROGRESSION_RANK[nextStatus] >
		DISPATCH_PROGRESSION_RANK[currentStatus]
	);
}

export type SpecialOrderOperationalDecision = ReturnType<
	typeof evaluateSpecialOrderOperation
> & {
	salesOrderId: number;
	orderNo: string | null;
	statusLabel: string;
	enforcementMode: SpecialOrderEnforcementMode;
	operation: SpecialOrderOperationCategory;
	orderRevision: string | null;
};

export class SpecialOrderApprovalRequiredError extends Error {
	readonly code = "SPECIAL_ORDER_APPROVAL_REQUIRED";
	readonly decision: SpecialOrderOperationalDecision;

	constructor(decision: SpecialOrderOperationalDecision) {
		super(
			`Special Order approval is required before ${decision.operation.toLowerCase()} can continue for order ${decision.orderNo || decision.salesOrderId}. Request customer approval from Sales.`,
		);
		this.name = "SpecialOrderApprovalRequiredError";
		this.decision = decision;
	}
}

function readRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function readEnforcementMode(value: unknown): SpecialOrderEnforcementMode {
	return value === "BLOCK_PURCHASING_AND_PRODUCTION" ||
		value === "BLOCK_ALL_OPERATIONS"
		? value
		: "WARNING_ONLY";
}

export async function evaluateCurrentSpecialOrderOperation(
	db: EnforcementDb,
	input: {
		salesOrderId: number;
		operation: SpecialOrderOperationCategory;
	},
): Promise<SpecialOrderOperationalDecision> {
	const [order, setting] = await Promise.all([
		db.salesOrders.findFirst({
			where: { id: input.salesOrderId, deletedAt: null },
			select: {
				id: true,
				orderId: true,
				specialOrderDeclaration: true,
				specialOrderStatus: true,
				specialOrderRevision: true,
				currentSpecialOrderApprovalId: true,
			},
		}),
		db.settings.findFirst({
			where: { type: "sales-settings" },
			select: { meta: true },
		}),
	]);
	if (!order)
		throw new Error(`Sales order ${input.salesOrderId} was not found.`);

	const specialOrderSettings = readRecord(
		readRecord(setting?.meta).specialOrder,
	);
	const enforcementMode = readEnforcementMode(
		specialOrderSettings.enforcementMode,
	);
	let currentApproval = false;
	if (
		order.specialOrderDeclaration === "YES" &&
		order.specialOrderStatus === "CUSTOMER_APPROVED" &&
		order.currentSpecialOrderApprovalId &&
		order.specialOrderRevision
	) {
		currentApproval = Boolean(
			await db.specialOrderApprovalEvidence.findFirst({
				where: {
					id: order.currentSpecialOrderApprovalId,
					salesOrderId: order.id,
					orderRevision: order.specialOrderRevision,
					outcome: "APPROVED",
					supersededAt: null,
				},
				select: { id: true },
			}),
		);
	}
	const effectiveStatus = currentApproval
		? "CUSTOMER_APPROVED"
		: order.specialOrderDeclaration === "YES"
			? order.specialOrderStatus === "CUSTOMER_DECLINED"
				? "CUSTOMER_DECLINED"
				: order.specialOrderStatus === "REAPPROVAL_REQUIRED"
					? "REAPPROVAL_REQUIRED"
					: "SIGNATURE_PENDING"
			: order.specialOrderStatus;
	const base = evaluateSpecialOrderOperation({
		declaration: order.specialOrderDeclaration,
		status: effectiveStatus,
		enforcementMode,
		operation: input.operation,
	});
	return {
		...base,
		salesOrderId: order.id,
		orderNo: order.orderId || null,
		statusLabel: getSpecialOrderStatusLabel({
			declaration: order.specialOrderDeclaration,
			status: effectiveStatus,
		}),
		enforcementMode,
		operation: input.operation,
		orderRevision: order.specialOrderRevision,
	};
}

async function recordSpecialOrderOperationEvent(
	db: EnforcementDb,
	decision: SpecialOrderOperationalDecision,
	input: {
		actorUserId?: number | null;
		source?: string | null;
	},
) {
	if (!decision.approvalRequired) return;
	const result = decision.blocked ? "BLOCKED" : "WARNING";
	const bucket = Math.floor(Date.now() / (15 * 60 * 1000));
	const eventKey = [
		decision.salesOrderId,
		decision.orderRevision || "none",
		decision.operation,
		decision.enforcementMode,
		result,
		bucket,
	].join(":");
	await db.specialOrderOperationEvent.upsert({
		where: { eventKey },
		create: {
			eventKey,
			salesOrderId: decision.salesOrderId,
			orderRevision: decision.orderRevision,
			operation: decision.operation,
			enforcementMode: decision.enforcementMode,
			result,
			source: input.source ?? null,
			actorUserId: input.actorUserId ?? null,
			meta: {
				orderNo: decision.orderNo,
				status: decision.statusLabel,
			},
		},
		update: {},
	});
}

export async function assertSpecialOrderOperationAllowed(
	db: EnforcementDb,
	input: {
		salesOrderId: number;
		operation: SpecialOrderOperationCategory;
		authorName?: string | null;
		actorUserId?: number | null;
		source?: string | null;
	},
	observabilityDb: EnforcementDb = db,
) {
	const decision = await evaluateCurrentSpecialOrderOperation(db, input);
	await recordSpecialOrderOperationEvent(observabilityDb, decision, input);
	if (decision.blocked) throw new SpecialOrderApprovalRequiredError(decision);
	if (decision.warning) {
		const name = `Special Order ${input.operation.toLowerCase()} warning`;
		const recent = await db.salesHistory.findFirst({
			where: {
				salesId: input.salesOrderId,
				name,
				deletedAt: null,
				createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
			},
			select: { id: true },
		});
		if (!recent) {
			await db.salesHistory.create({
				data: {
					salesId: input.salesOrderId,
					name,
					authorName: input.authorName || "System",
					data: {
						event: "special_order_operation_warning",
						operation: input.operation,
						enforcementMode: decision.enforcementMode,
						status: decision.statusLabel,
						actorUserId: input.actorUserId ?? null,
						source: input.source ?? null,
					},
				},
			});
		}
	}
	return decision;
}

import type { Database } from "@gnd/db";
import type { SalesHandoffInitialExposureMilestone } from "./escalation";

export const SALES_HANDOFF_RECONCILIATION_SCOPE =
	"sales_handoff_reconciliation";
export const SALES_HANDOFF_POLICY_RECONCILIATION_SCOPE =
	"sales_handoff_policy_reconciliation";
export const SALES_HANDOFF_LIFECYCLE_REVIEW_SCOPE =
	"sales_handoff_lifecycle_review";

type RepairDatabase = Pick<Database, "resolutionCase">;

const TERMINAL_ORDER_STATUSES = new Set([
	"cancelled",
	"canceled",
	"completed",
	"complete",
	"delivered",
	"fulfilled",
]);

export function requiresSalesHandoffLifecycleReview(input: {
	createdAt: Date | null;
	status: string | null;
	deletedAt: Date | null;
	deliveredAt: Date | null;
	cutoffYear?: number;
}) {
	const status = String(input.status ?? "")
		.trim()
		.toLowerCase();
	return Boolean(
		!input.deletedAt &&
			!input.deliveredAt &&
			!status &&
			input.createdAt &&
			input.createdAt.getUTCFullYear() < (input.cutoffYear ?? 2026),
	);
}

export function isTerminalSalesHandoffLifecycle(input: {
	status: string | null;
	deletedAt: Date | null;
	deliveredAt: Date | null;
}) {
	return Boolean(
		input.deletedAt ||
			input.deliveredAt ||
			TERMINAL_ORDER_STATUSES.has(
				String(input.status ?? "")
					.trim()
					.toLowerCase(),
			),
	);
}

export async function recordSalesHandoffLifecycleReview(
	db: RepairDatabase,
	input: {
		salesOrderId: number;
		actorUserId: number;
		source: string;
		orderCreatedAt?: Date | null;
		orderStatus?: string | null;
		reason: string;
		sourceSnapshot?: Record<string, unknown>;
	},
) {
	if (!Number.isInteger(input.salesOrderId) || input.salesOrderId <= 0) {
		throw new Error(
			"Sales Handoff lifecycle review requires a positive order id.",
		);
	}
	const scopeId = String(input.salesOrderId);
	const data = {
		status: "open",
		summary: `Sales Handoff lifecycle review is required for order ${input.salesOrderId}.`,
		meta: {
			salesOrderId: input.salesOrderId,
			actorUserId: input.actorUserId,
			source: input.source,
			reason: input.reason,
			orderCreatedAt: input.orderCreatedAt?.toISOString() ?? null,
			orderStatus: input.orderStatus ?? null,
			sourceSnapshot: input.sourceSnapshot ?? null,
			lastReviewedAt: new Date().toISOString(),
		},
	};
	return db.resolutionCase.upsert({
		where: { id: `sales-handoff-lifecycle-review:${scopeId}` },
		update: data,
		create: {
			id: `sales-handoff-lifecycle-review:${scopeId}`,
			...data,
			scopeType: SALES_HANDOFF_LIFECYCLE_REVIEW_SCOPE,
			scopeId,
		},
	});
}

export async function getOpenSalesHandoffLifecycleReviewOrderIds(
	db: RepairDatabase,
	salesOrderIds: number[],
) {
	const scopeIds = exactSalesOrderIds(salesOrderIds).map(String);
	if (!scopeIds.length) return new Set<number>();
	const rows = await db.resolutionCase.findMany({
		where: {
			scopeType: SALES_HANDOFF_LIFECYCLE_REVIEW_SCOPE,
			scopeId: { in: scopeIds },
			status: { in: ["open", "releasing"] },
			deletedAt: null,
		},
		select: { scopeId: true },
	});
	return new Set(
		rows
			.map((row) => Number(row.scopeId))
			.filter((id) => Number.isInteger(id) && id > 0),
	);
}

export async function isSalesHandoffLifecycleReviewOpen(
	db: RepairDatabase,
	salesOrderId: number,
) {
	return (
		await getOpenSalesHandoffLifecycleReviewOrderIds(db, [salesOrderId])
	).has(salesOrderId);
}

export type SalesHandoffReconciliationRepairInput = {
	salesOrderIds: number[];
	actorUserId: number;
	source: string;
	reason: string;
	initialExposureMilestone?: SalesHandoffInitialExposureMilestone | null;
	initialExposurePolicyRevision?: number | null;
	initialExposurePolicyChangedAt?: string | null;
};

function exactSalesOrderIds(values: number[]) {
	return Array.from(
		new Set(values.filter((value) => Number.isInteger(value) && value > 0)),
	);
}

export async function recordSalesHandoffReconciliationRepair(
	db: RepairDatabase,
	input: SalesHandoffReconciliationRepairInput,
) {
	const salesOrderIds = exactSalesOrderIds(input.salesOrderIds);
	for (const salesOrderId of salesOrderIds) {
		const scopeId = String(salesOrderId);
		const data = {
			status: "open",
			summary: `Sales Handoff reconciliation requires repair for order ${salesOrderId}.`,
			meta: {
				salesOrderId,
				actorUserId: input.actorUserId,
				source: input.source,
				reason: input.reason,
				lastFailedAt: new Date().toISOString(),
				...(input.initialExposureMilestone
					? {
							initialExposureMilestone: input.initialExposureMilestone,
							initialExposurePolicyRevision:
								input.initialExposurePolicyRevision ?? null,
							initialExposurePolicyChangedAt:
								input.initialExposurePolicyChangedAt ?? null,
						}
					: {}),
			},
		};
		await db.resolutionCase.upsert({
			where: { id: `sales-handoff-repair:${salesOrderId}` },
			update: data,
			create: {
				id: `sales-handoff-repair:${salesOrderId}`,
				...data,
				scopeType: SALES_HANDOFF_RECONCILIATION_SCOPE,
				scopeId,
			},
		});
	}
	return { recorded: true, salesOrderIds } as const;
}

export async function recordSalesHandoffPolicyReconciliationRepair(
	db: RepairDatabase,
	input: {
		policyRevision: number;
		policyChangedAt?: string | null;
		actorUserId: number;
		source: string;
		reason: string;
	},
) {
	const scopeId = String(input.policyRevision);
	const data = {
		status: "open",
		summary: `Sales Handoff policy revision ${scopeId} requires reconciliation repair.`,
		meta: {
			policyRevision: input.policyRevision,
			policyChangedAt: input.policyChangedAt ?? null,
			actorUserId: input.actorUserId,
			source: input.source,
			reason: input.reason,
			lastFailedAt: new Date().toISOString(),
		},
	};
	await db.resolutionCase.upsert({
		where: { id: `sales-handoff-policy-repair:${scopeId}` },
		update: data,
		create: {
			id: `sales-handoff-policy-repair:${scopeId}`,
			...data,
			scopeType: SALES_HANDOFF_POLICY_RECONCILIATION_SCOPE,
			scopeId,
		},
	});
	return { recorded: true, policyRevision: input.policyRevision } as const;
}

export async function resolveSalesHandoffReconciliationRepairs(
	db: RepairDatabase,
	salesOrderIds: number[],
) {
	const scopeIds = exactSalesOrderIds(salesOrderIds).map(String);
	if (!scopeIds.length) return { count: 0 };
	return db.resolutionCase.updateMany({
		where: {
			scopeType: SALES_HANDOFF_RECONCILIATION_SCOPE,
			scopeId: { in: scopeIds },
			status: "open",
			deletedAt: null,
		},
		data: { status: "resolved" },
	});
}

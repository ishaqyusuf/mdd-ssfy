import type { Database } from "@gnd/db";
import type { SalesHandoffInitialExposureMilestone } from "./escalation";

export const SALES_HANDOFF_RECONCILIATION_SCOPE =
	"sales_handoff_reconciliation";
export const SALES_HANDOFF_POLICY_RECONCILIATION_SCOPE =
	"sales_handoff_policy_reconciliation";

type RepairDatabase = Pick<Database, "resolutionCase">;

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

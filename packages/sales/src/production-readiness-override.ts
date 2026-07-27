import type { Db, TransactionClient } from "@gnd/db";
import { getSalesOrderLifecycleStatusInfo } from "./order-status";
import {
	buildProductionReadinessRevision,
	isProductionReadinessOverrideActive,
	normalizeProductionReadinessNumber,
} from "./production-readiness-evidence";
import {
	type ProductionReadinessBlocker,
	evaluateProductionReadinessGate,
} from "./production-readiness-gate";
import {
	type SalesProductionPlan,
	getSalesProductionPlan,
} from "./sales-fulfillment-plan";
import { syncSalesInventoryLineItems } from "./sync-sales-inventory-line-items";

export type ProductionReadinessOverrideStatus = "ACTIVE" | "REVOKED";

export type ProductionReadinessOverrideEvidence = {
	status: ProductionReadinessOverrideStatus;
	revision: string;
	confirmedAt: Date | string | null;
	confirmedBy: {
		id: number;
		name: string | null;
	} | null;
};

export type ProductionReadinessProjectionState =
	| "ready"
	| "blocked"
	| "overridden"
	| "not_configured"
	| "read_only";

export type ProductionReadinessProjection = {
	state: ProductionReadinessProjectionState;
	revision: string | null;
	canOverride: boolean;
	summary: {
		lineCount: number;
		componentCount: number;
		readyLineCount: number;
		blockedLineCount: number;
		blockedComponentCount: number;
		pendingQty: number;
		openInboundQty: number;
	};
	blockers: ProductionReadinessBlocker[];
	override: ProductionReadinessOverrideEvidence | null;
};

type DbLike = Db | TransactionClient;

export function buildProductionReadinessProjection(input: {
	plan: SalesProductionPlan;
	overrideEvidencePlan?: SalesProductionPlan;
	override: ProductionReadinessOverrideEvidence | null;
	readOnly: boolean;
}): ProductionReadinessProjection {
	const gate = evaluateProductionReadinessGate(input.plan);
	const revision = buildProductionReadinessRevision(
		input.overrideEvidencePlan ?? input.plan,
	);
	const summary = {
		lineCount: input.plan.summary.lineCount,
		componentCount: input.plan.summary.componentCount,
		readyLineCount: input.plan.summary.readyLineCount,
		blockedLineCount: input.plan.summary.blockedLineCount,
		blockedComponentCount: gate.blockers.length,
		pendingQty: normalizeProductionReadinessNumber(
			input.plan.summary.backorderedQty + input.plan.summary.pendingReviewQty,
		),
		openInboundQty: normalizeProductionReadinessNumber(
			Math.max(
				0,
				input.plan.summary.inboundQty - input.plan.summary.receivedQty,
			),
		),
	};
	const activeOverride = isProductionReadinessOverrideActive(
		input.override,
		revision,
	)
		? input.override
		: null;

	if (!revision) {
		return {
			state: "not_configured",
			revision: null,
			canOverride: false,
			summary,
			blockers: gate.blockers,
			override: null,
		};
	}

	if (input.readOnly) {
		return {
			state: "read_only",
			revision,
			canOverride: false,
			summary,
			blockers: gate.blockers,
			override: null,
		};
	}

	if (gate.allowed) {
		return {
			state: "ready",
			revision,
			canOverride: false,
			summary,
			blockers: [],
			override: null,
		};
	}

	if (activeOverride) {
		return {
			state: "overridden",
			revision,
			canOverride: false,
			summary,
			blockers: gate.blockers,
			override: activeOverride,
		};
	}

	return {
		state: "blocked",
		revision,
		canOverride: true,
		summary,
		blockers: gate.blockers,
		override: null,
	};
}

async function loadProductionReadiness(
	db: DbLike,
	input: {
		salesOrderId: number;
		lineItemUids?: string[] | null;
	},
) {
	const [order, plan, override, overrideEvidencePlan] = await Promise.all([
		db.salesOrders.findFirst({
			where: {
				id: input.salesOrderId,
				deletedAt: null,
			},
			select: {
				id: true,
				orderId: true,
				status: true,
				prodStatus: true,
			},
		}),
		getSalesProductionPlan(db as Db, {
			...input,
			completeOrder: true,
		}),
		db.salesProductionReadinessOverride.findUnique({
			where: {
				salesOrderId: input.salesOrderId,
			},
			select: {
				status: true,
				revision: true,
				confirmedAt: true,
				confirmedBy: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		}),
		input.lineItemUids?.length
			? getSalesProductionPlan(db as Db, {
					salesOrderId: input.salesOrderId,
					completeOrder: true,
				})
			: null,
	]);

	if (!order) {
		throw new Error("Sales order not found.");
	}

	const lifecycle = getSalesOrderLifecycleStatusInfo({
		orderStatus: order.status,
		legacyProductionStatus: order.prodStatus,
	});

	return {
		order,
		plan,
		projection: buildProductionReadinessProjection({
			plan,
			overrideEvidencePlan: overrideEvidencePlan ?? plan,
			override:
				override?.status === "ACTIVE" || override?.status === "REVOKED"
					? {
							...override,
							status: override.status,
						}
					: null,
			readOnly:
				lifecycle.status === "fulfilled" || lifecycle.status === "cancelled",
		}),
	};
}

export async function getProductionReadiness(
	db: DbLike,
	input: {
		salesOrderId: number;
		lineItemUids?: string[] | null;
	},
) {
	return (await loadProductionReadiness(db, input)).projection;
}

export type SetProductionReadinessOverrideInput = {
	salesOrderId: number;
	expectedRevision: string;
	action: "confirm" | "revoke";
	actor: {
		id: number;
		name: string | null;
	};
};

function jsonSnapshot(value: unknown) {
	return JSON.parse(JSON.stringify(value));
}

export async function persistProductionReadinessOverride(
	tx: TransactionClient,
	input: SetProductionReadinessOverrideInput,
	current: Awaited<ReturnType<typeof loadProductionReadiness>>,
) {
	if (current.projection.revision !== input.expectedRevision) {
		return {
			outcome: "stale" as const,
			readiness: current.projection,
		};
	}

	if (input.action === "confirm") {
		if (current.projection.state === "ready") {
			return {
				outcome: "already_ready" as const,
				readiness: current.projection,
			};
		}
		if (
			current.projection.state !== "blocked" ||
			!current.projection.canOverride ||
			!current.projection.revision
		) {
			throw new Error(
				"Production readiness cannot be overridden for this order.",
			);
		}

		const snapshot = jsonSnapshot({
			revision: current.projection.revision,
			summary: current.projection.summary,
			blockers: current.projection.blockers,
		});
		const confirmedAt = new Date();
		await tx.salesProductionReadinessOverride.upsert({
			where: {
				salesOrderId: input.salesOrderId,
			},
			create: {
				salesOrderId: input.salesOrderId,
				status: "ACTIVE",
				revision: current.projection.revision,
				snapshot,
				confirmedByUserId: input.actor.id,
				confirmedAt,
			},
			update: {
				status: "ACTIVE",
				revision: current.projection.revision,
				snapshot,
				confirmedByUserId: input.actor.id,
				confirmedAt,
				revokedByUserId: null,
				revokedAt: null,
			},
		});
		await tx.salesHistory.create({
			data: {
				salesId: input.salesOrderId,
				name: "Production inventory readiness override confirmed",
				authorName: input.actor.name,
				data: jsonSnapshot({
					event: "production_readiness_override_confirmed",
					actorUserId: input.actor.id,
					...snapshot,
				}),
			},
		});

		return {
			outcome: "confirmed" as const,
			readiness: buildProductionReadinessProjection({
				plan: current.plan,
				override: {
					status: "ACTIVE",
					revision: current.projection.revision,
					confirmedAt,
					confirmedBy: input.actor,
				},
				readOnly: false,
			}),
		};
	}

	const existing = await tx.salesProductionReadinessOverride.findUnique({
		where: {
			salesOrderId: input.salesOrderId,
		},
		select: {
			status: true,
			revision: true,
		},
	});
	if (!existing || existing.status !== "ACTIVE") {
		return {
			outcome: "already_revoked" as const,
			readiness: current.projection,
		};
	}

	await tx.salesProductionReadinessOverride.update({
		where: {
			salesOrderId: input.salesOrderId,
		},
		data: {
			status: "REVOKED",
			revokedByUserId: input.actor.id,
			revokedAt: new Date(),
		},
	});
	await tx.salesHistory.create({
		data: {
			salesId: input.salesOrderId,
			name: "Production inventory readiness override revoked",
			authorName: input.actor.name,
			data: jsonSnapshot({
				event: "production_readiness_override_revoked",
				actorUserId: input.actor.id,
				revision: existing.revision,
			}),
		},
	});

	return {
		outcome: "revoked" as const,
		readiness: {
			...current.projection,
			state: "blocked" as const,
			canOverride: true,
			override: null,
		},
	};
}

export async function setProductionReadinessOverride(
	db: Db,
	input: SetProductionReadinessOverrideInput,
) {
	await syncSalesInventoryLineItems(db, {
		salesOrderId: input.salesOrderId,
		source: "repair",
		triggeredByUserId: input.actor.id,
	});

	return db.$transaction(async (tx) => {
		const current = await loadProductionReadiness(tx, {
			salesOrderId: input.salesOrderId,
		});
		return persistProductionReadinessOverride(tx, input, current);
	});
}

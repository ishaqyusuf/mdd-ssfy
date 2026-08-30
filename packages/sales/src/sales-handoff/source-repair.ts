import type { Db } from "@gnd/db";
import {
	projectCanonicalLegacySalesPaymentSource,
	syncCanonicalPaymentProjection,
} from "../payment-system/infrastructure/canonical-mirror";
import { runSalesInventoryProjectionSync } from "../run-sales-inventory-projection-sync";
import {
	SALES_HANDOFF_RECONCILIATION_SCOPE,
	isTerminalSalesHandoffLifecycle,
	recordSalesHandoffLifecycleReview,
	recordSalesHandoffReconciliationRepair,
	resolveSalesHandoffReconciliationRepairs,
} from "./repair";
import { reconcileMaterialSalesHandoffOrder } from "./service";

export const SALES_HANDOFF_SOURCE_REPAIR_DEFAULT_LIMIT = 50;
export const SALES_HANDOFF_SOURCE_REPAIR_MAX_LIMIT = 200;
export const SALES_HANDOFF_HISTORICAL_CUTOFF_YEAR = 2026;

export type SalesHandoffSourceRepairCategory =
	| "PAYMENT"
	| "INVENTORY"
	| "UNKNOWN";

type RepairMarker = {
	id: string;
	scopeId: string;
	meta: unknown;
	createdAt: Date | null;
};

type RepairOrder = {
	id: number;
	orderId: string;
	type: string | null;
	status: string | null;
	prodStatus: string | null;
	createdAt: Date | null;
	deliveredAt: Date | null;
	deletedAt: Date | null;
	grandTotal: number | null;
	amountDue: number | null;
	paymentTerm: string | null;
	payments: Array<{
		status: string | null;
		amount: number | null;
		deletedAt: Date | null;
	}>;
	inventoryProjection: {
		status: string;
		needCount: number;
		lastError: string | null;
		source: string | null;
		completedAt: Date | null;
	} | null;
	paymentProjection: {
		totalRecorded: number;
		totalAllocated: number;
		totalRefunded: number;
		totalVoided: number;
		amountDue: number;
	} | null;
};

export type SalesHandoffSourceRepairCandidate = {
	markerId: string;
	salesOrderId: number;
	category: SalesHandoffSourceRepairCategory;
	reason: string;
	order: RepairOrder | null;
	terminal: boolean;
	lifecycleReviewRequired: boolean;
};

export type SalesHandoffSourceRepairResult = {
	markerId: string;
	salesOrderId: number;
	category: SalesHandoffSourceRepairCategory;
	status: "PLANNED" | "REPAIRED" | "QUARANTINED" | "UNRESOLVED" | "FAILED";
	reason: string | null;
	lifecycleReviewRequired: boolean;
	beforeEvidence?: Record<string, unknown> | null;
	afterEvidence?: Record<string, unknown> | null;
};

export type SalesHandoffSourceRepairReport = {
	mode: "dry-run" | "apply";
	scanned: number;
	planned: number;
	repaired: number;
	quarantined: number;
	unresolved: number;
	failed: number;
	haltReason: string | null;
	nextCursor: string | null;
	mappingReview: Array<{
		salesOrderId: number;
		markerId: string;
		reason: string;
	}>;
	results: SalesHandoffSourceRepairResult[];
};

type RepairDependencies = {
	syncPaymentProjection: typeof syncCanonicalPaymentProjection;
	syncInventoryProjection: typeof runSalesInventoryProjectionSync;
	reconcileOrder: typeof reconcileMaterialSalesHandoffOrder;
	recordLifecycleReview: typeof recordSalesHandoffLifecycleReview;
	recordRepair?: typeof recordSalesHandoffReconciliationRepair;
};

type LifecycleReleaseDependencies = {
	reconcileOrder: typeof reconcileMaterialSalesHandoffOrder;
};

const defaultDependencies: RepairDependencies = {
	syncPaymentProjection: syncCanonicalPaymentProjection,
	syncInventoryProjection: runSalesInventoryProjectionSync,
	reconcileOrder: reconcileMaterialSalesHandoffOrder,
	recordLifecycleReview: recordSalesHandoffLifecycleReview,
	recordRepair: recordSalesHandoffReconciliationRepair,
};

const defaultLifecycleReleaseDependencies: LifecycleReleaseDependencies = {
	reconcileOrder: reconcileMaterialSalesHandoffOrder,
};

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function normalize(value: string | null | undefined) {
	return String(value || "")
		.trim()
		.toLowerCase();
}

function categoryFromReason(reason: string): SalesHandoffSourceRepairCategory {
	if (reason.includes("payment projection is unavailable")) return "PAYMENT";
	if (reason.includes("inventory projection is unavailable"))
		return "INVENTORY";
	return "UNKNOWN";
}

function isTerminalOrder(order: RepairOrder) {
	if (order.deletedAt || order.deliveredAt) return true;
	return [
		"cancelled",
		"canceled",
		"completed",
		"complete",
		"delivered",
		"fulfilled",
	].includes(normalize(order.status));
}

export function classifySalesHandoffSourceRepairCandidate(input: {
	marker: RepairMarker;
	order: RepairOrder | null;
	historicalCutoffYear?: number;
}): SalesHandoffSourceRepairCandidate {
	const meta = asRecord(input.marker.meta);
	const reason = String(meta.reason || "");
	const salesOrderId = Number(input.marker.scopeId);
	const cutoffYear =
		input.historicalCutoffYear ?? SALES_HANDOFF_HISTORICAL_CUTOFF_YEAR;
	const terminal = input.order ? isTerminalOrder(input.order) : true;
	const lifecycleReviewRequired = Boolean(
		input.order &&
			!terminal &&
			!normalize(input.order.status) &&
			input.order.createdAt &&
			input.order.createdAt.getUTCFullYear() < cutoffYear,
	);
	return {
		markerId: input.marker.id,
		salesOrderId,
		category: categoryFromReason(reason),
		reason,
		order: input.order,
		terminal,
		lifecycleReviewRequired,
	};
}

function exactLimit(value: number | undefined) {
	const limit = value ?? SALES_HANDOFF_SOURCE_REPAIR_DEFAULT_LIMIT;
	if (
		!Number.isInteger(limit) ||
		limit < 1 ||
		limit > SALES_HANDOFF_SOURCE_REPAIR_MAX_LIMIT
	) {
		throw new Error(
			`Sales Handoff source repair limit must be an integer from 1 to ${SALES_HANDOFF_SOURCE_REPAIR_MAX_LIMIT}.`,
		);
	}
	return limit;
}

function exactSalesOrderIds(values: number[] | undefined) {
	if (!values) return null;
	const ids = Array.from(
		new Set(values.filter((value) => Number.isInteger(value) && value > 0)),
	);
	if (!ids.length || ids.length > SALES_HANDOFF_SOURCE_REPAIR_MAX_LIMIT) {
		throw new Error(
			`Sales Handoff source repair requires 1-${SALES_HANDOFF_SOURCE_REPAIR_MAX_LIMIT} positive integer order ids.`,
		);
	}
	return ids;
}

async function loadCandidates(
	database: Db,
	input: {
		cursor?: string | null;
		limit: number;
		salesOrderIds: number[] | null;
		historicalCutoffYear?: number;
		category?: "ALL" | "PAYMENT" | "INVENTORY";
	},
) {
	const markers = (await database.resolutionCase.findMany({
		where: {
			scopeType: SALES_HANDOFF_RECONCILIATION_SCOPE,
			status: "open",
			deletedAt: null,
			...(input.salesOrderIds
				? { scopeId: { in: input.salesOrderIds.map(String) } }
				: {}),
		},
		select: { id: true, scopeId: true, meta: true, createdAt: true },
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		...(input.cursor && !input.salesOrderIds
			? { cursor: { id: input.cursor }, skip: 1 }
			: {}),
		take: input.salesOrderIds?.length ?? input.limit,
	})) as RepairMarker[];
	const orderIds = markers
		.map((marker) => Number(marker.scopeId))
		.filter((id) => Number.isInteger(id) && id > 0);
	const rawOrders = orderIds.length
		? await database.salesOrders.findMany({
				where: { id: { in: orderIds } },
				select: {
					id: true,
					orderId: true,
					type: true,
					status: true,
					prodStatus: true,
					createdAt: true,
					deliveredAt: true,
					deletedAt: true,
					grandTotal: true,
					amountDue: true,
					paymentTerm: true,
					payments: {
						where: { deletedAt: null },
						select: { status: true, amount: true, deletedAt: true },
					},
					inventoryProjection: {
						select: {
							status: true,
							needCount: true,
							lastError: true,
							source: true,
							completedAt: true,
						},
					},
				},
			})
		: [];
	const paymentProjections = orderIds.length
		? await database.paymentProjection.findMany({
				where: { salesOrderId: { in: orderIds } },
				select: {
					salesOrderId: true,
					totalRecorded: true,
					totalAllocated: true,
					totalRefunded: true,
					totalVoided: true,
					amountDue: true,
				},
			})
		: [];
	const paymentProjectionByOrderId = new Map(
		paymentProjections.map((projection) => [
			projection.salesOrderId,
			projection,
		]),
	);
	const orders = rawOrders.map((order) => ({
		...order,
		paymentProjection: paymentProjectionByOrderId.get(order.id) ?? null,
	})) as RepairOrder[];
	const orderById = new Map(orders.map((order) => [order.id, order]));
	const candidates = markers
		.map((marker) =>
			classifySalesHandoffSourceRepairCandidate({
				marker,
				order: orderById.get(Number(marker.scopeId)) ?? null,
				historicalCutoffYear: input.historicalCutoffYear,
			}),
		)
		.filter(
			(candidate) =>
				!input.category ||
				input.category === "ALL" ||
				candidate.category === input.category,
		);
	return {
		candidates,
		nextCursor:
			!input.salesOrderIds && markers.length === input.limit
				? (markers.at(-1)?.id ?? null)
				: null,
	};
}

function projectionMatches(
	actual: Record<string, unknown>,
	expected: ReturnType<typeof projectCanonicalLegacySalesPaymentSource>,
) {
	return (
		Math.abs(Number(actual.totalRecorded) - expected.totalRecorded) < 0.0001 &&
		Math.abs(Number(actual.totalAllocated) - expected.totalAllocated) <
			0.0001 &&
		Math.abs(Number(actual.totalRefunded) - expected.totalRefunded) < 0.0001 &&
		Math.abs(Number(actual.totalVoided) - expected.totalVoided) < 0.0001 &&
		Math.abs(Number(actual.amountDue) - expected.amountDue) < 0.0001
	);
}

async function resolveRepair(database: Db, salesOrderId: number) {
	await resolveSalesHandoffReconciliationRepairs(database, [salesOrderId]);
}

function sourceEvidence(candidate: SalesHandoffSourceRepairCandidate) {
	if (!candidate.order) return { order: null, markerReason: candidate.reason };
	return {
		markerReason: candidate.reason,
		order: {
			id: candidate.order.id,
			orderId: candidate.order.orderId,
			status: candidate.order.status,
			createdAt: candidate.order.createdAt?.toISOString() ?? null,
			deletedAt: candidate.order.deletedAt?.toISOString() ?? null,
			deliveredAt: candidate.order.deliveredAt?.toISOString() ?? null,
			amountDue: candidate.order.amountDue,
		},
		legacyPaymentEvidence: projectCanonicalLegacySalesPaymentSource({
			grandTotal: candidate.order.grandTotal,
			payments: candidate.order.payments,
		}),
		paymentProjection: candidate.order.paymentProjection,
		inventoryProjection: candidate.order.inventoryProjection,
	};
}

function isDeterministicMappingFailure(result: SalesHandoffSourceRepairResult) {
	if (result.category !== "INVENTORY") return false;
	const reason = normalize(
		`${result.reason ?? ""} ${JSON.stringify(result.beforeEvidence ?? {})} ${JSON.stringify(result.afterEvidence ?? {})}`,
	);
	return reason.includes("mapping") || reason.includes("inventory variant");
}

export async function runSalesHandoffSourceRepair(
	database: Db,
	input: {
		apply?: boolean;
		confirmReview?: boolean;
		actorUserId: number;
		cursor?: string | null;
		limit?: number;
		salesOrderIds?: number[];
		category?: "ALL" | "PAYMENT" | "INVENTORY";
		historicalCutoffYear?: number;
		now?: Date;
	},
	dependencies: RepairDependencies = defaultDependencies,
): Promise<SalesHandoffSourceRepairReport> {
	if (input.apply && !input.confirmReview) {
		throw new Error(
			"Sales Handoff source repair --apply requires --confirm-review.",
		);
	}
	const limit = exactLimit(input.limit);
	const salesOrderIds = exactSalesOrderIds(input.salesOrderIds);
	const { candidates, nextCursor } = await loadCandidates(database, {
		cursor: input.cursor,
		limit,
		salesOrderIds,
		historicalCutoffYear: input.historicalCutoffYear,
		category: input.category,
	});
	const results: SalesHandoffSourceRepairResult[] = [];
	let haltReason: string | null = null;
	for (const candidate of candidates) {
		const beforeEvidence = sourceEvidence(candidate);
		let afterEvidence: Record<string, unknown> | null = null;
		if (!input.apply) {
			results.push({
				markerId: candidate.markerId,
				salesOrderId: candidate.salesOrderId,
				category: candidate.category,
				status: "PLANNED",
				reason: candidate.reason || null,
				lifecycleReviewRequired: candidate.lifecycleReviewRequired,
				beforeEvidence,
				afterEvidence,
			});
			continue;
		}
		try {
			if (!candidate.order || candidate.terminal) {
				await dependencies.reconcileOrder(database, {
					salesOrderId: candidate.salesOrderId,
					actorUserId: input.actorUserId,
					now: input.now,
				});
				await resolveRepair(database, candidate.salesOrderId);
				results.push({
					markerId: candidate.markerId,
					salesOrderId: candidate.salesOrderId,
					category: candidate.category,
					status: "REPAIRED",
					reason: null,
					lifecycleReviewRequired: false,
					beforeEvidence,
					afterEvidence: beforeEvidence,
				});
				continue;
			}
			if (candidate.category === "PAYMENT") {
				let projection = await database.paymentProjection.findUnique({
					where: { salesOrderId: candidate.salesOrderId },
					select: {
						salesOrderId: true,
						totalRecorded: true,
						totalAllocated: true,
						totalRefunded: true,
						totalVoided: true,
						amountDue: true,
					},
				});
				if (!projection) {
					await dependencies.syncPaymentProjection(database, {
						salesId: candidate.salesOrderId,
					});
					projection = await database.paymentProjection.findUnique({
						where: { salesOrderId: candidate.salesOrderId },
						select: {
							salesOrderId: true,
							totalRecorded: true,
							totalAllocated: true,
							totalRefunded: true,
							totalVoided: true,
							amountDue: true,
						},
					});
				}
				const expected = projectCanonicalLegacySalesPaymentSource({
					grandTotal: candidate.order.grandTotal,
					payments: candidate.order.payments,
				});
				if (!projection || !projectionMatches(projection, expected)) {
					throw new Error(
						"canonical payment projection did not match legacy source evidence",
					);
				}
				afterEvidence = { paymentProjection: projection };
			} else if (candidate.category === "INVENTORY") {
				const synced = await dependencies.syncInventoryProjection(database, {
					salesOrderId: candidate.salesOrderId,
					source: "repair",
					triggeredByUserId: input.actorUserId,
				});
				if (
					synced.projection.status !== "ready" ||
					Boolean(synced.warnings?.length)
				) {
					afterEvidence = {
						inventoryProjection: synced.projection,
						warnings: synced.warnings ?? [],
					};
					throw new Error(
						synced.warnings?.join("\n") ||
							"inventory projection remained failed",
					);
				}
				afterEvidence = {
					inventoryProjection: synced.projection,
					warnings: synced.warnings ?? [],
				};
			} else {
				results.push({
					markerId: candidate.markerId,
					salesOrderId: candidate.salesOrderId,
					category: candidate.category,
					status: "UNRESOLVED",
					reason: candidate.reason || "unknown source-projection failure",
					lifecycleReviewRequired: candidate.lifecycleReviewRequired,
					beforeEvidence,
					afterEvidence,
				});
				haltReason = `Unknown source-repair category for order ${candidate.salesOrderId}.`;
				break;
			}

			if (candidate.lifecycleReviewRequired) {
				await dependencies.recordLifecycleReview(database, {
					salesOrderId: candidate.salesOrderId,
					actorUserId: input.actorUserId,
					source: "sales-handoff-source-repair",
					orderCreatedAt: candidate.order.createdAt,
					orderStatus: candidate.order.status,
					reason: "Pre-2026 order has blank lifecycle status.",
					sourceSnapshot: {
						orderId: candidate.order.orderId,
						type: candidate.order.type,
						status: candidate.order.status,
						prodStatus: candidate.order.prodStatus,
						createdAt: candidate.order.createdAt?.toISOString() ?? null,
						deliveredAt: candidate.order.deliveredAt?.toISOString() ?? null,
						deletedAt: candidate.order.deletedAt?.toISOString() ?? null,
					},
				});
				await resolveRepair(database, candidate.salesOrderId);
				results.push({
					markerId: candidate.markerId,
					salesOrderId: candidate.salesOrderId,
					category: candidate.category,
					status: "QUARANTINED",
					reason: "Lifecycle review required before handoff reconciliation.",
					lifecycleReviewRequired: true,
					beforeEvidence,
					afterEvidence,
				});
				continue;
			}

			await dependencies.reconcileOrder(database, {
				salesOrderId: candidate.salesOrderId,
				actorUserId: input.actorUserId,
				now: input.now,
			});
			await resolveRepair(database, candidate.salesOrderId);
			results.push({
				markerId: candidate.markerId,
				salesOrderId: candidate.salesOrderId,
				category: candidate.category,
				status: "REPAIRED",
				reason: null,
				lifecycleReviewRequired: false,
				beforeEvidence,
				afterEvidence,
			});
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			const discoveredCategory = categoryFromReason(reason);
			if (discoveredCategory !== "UNKNOWN" && dependencies.recordRepair) {
				await dependencies.recordRepair(database, {
					salesOrderIds: [candidate.salesOrderId],
					actorUserId: input.actorUserId,
					source: "sales-handoff-source-repair",
					reason,
				});
				results.push({
					markerId: candidate.markerId,
					salesOrderId: candidate.salesOrderId,
					category: discoveredCategory,
					status: "UNRESOLVED",
					reason,
					lifecycleReviewRequired: candidate.lifecycleReviewRequired,
					beforeEvidence,
					afterEvidence,
				});
				continue;
			}
			results.push({
				markerId: candidate.markerId,
				salesOrderId: candidate.salesOrderId,
				category: candidate.category,
				status: "FAILED",
				reason,
				lifecycleReviewRequired: candidate.lifecycleReviewRequired,
				beforeEvidence,
				afterEvidence,
			});
			if (reason.includes("projection did not match")) {
				haltReason = `Projection mismatch for order ${candidate.salesOrderId}: ${reason}`;
				break;
			}
		}
	}
	const mappingReview = results
		.filter(isDeterministicMappingFailure)
		.map((result) => ({
			salesOrderId: result.salesOrderId,
			markerId: result.markerId,
			reason: result.reason ?? "deterministic inventory mapping unavailable",
		}));
	return {
		mode: input.apply ? "apply" : "dry-run",
		scanned: results.length,
		planned: input.apply ? 0 : candidates.length,
		repaired: results.filter((result) => result.status === "REPAIRED").length,
		quarantined: results.filter((result) => result.status === "QUARANTINED")
			.length,
		unresolved: results.filter((result) => result.status === "UNRESOLVED")
			.length,
		failed: results.filter((result) => result.status === "FAILED").length,
		haltReason,
		nextCursor,
		mappingReview,
		results,
	};
}

export type SalesHandoffLifecycleReviewDecision =
	| "ACTIVE_ORDER_APPROVED"
	| "CANONICAL_STATUS_CORRECTED";

export async function releaseSalesHandoffLifecycleReviews(
	database: Db,
	input: {
		apply?: boolean;
		confirmReview?: boolean;
		actorUserId: number;
		salesOrderIds: number[];
		decision: SalesHandoffLifecycleReviewDecision;
		reason: string;
		now?: Date;
	},
	dependencies: LifecycleReleaseDependencies = defaultLifecycleReleaseDependencies,
) {
	if (input.apply && !input.confirmReview) {
		throw new Error(
			"Sales Handoff lifecycle review release --apply requires --confirm-review.",
		);
	}
	const salesOrderIds = exactSalesOrderIds(input.salesOrderIds);
	if (!salesOrderIds) {
		throw new Error(
			"Lifecycle review release requires explicit sales order ids.",
		);
	}
	if (!input.reason.trim()) {
		throw new Error("Lifecycle review release requires an audit reason.");
	}
	const cases = await database.resolutionCase.findMany({
		where: {
			scopeType: "sales_handoff_lifecycle_review",
			scopeId: { in: salesOrderIds.map(String) },
			status: "open",
			deletedAt: null,
		},
		select: { id: true, scopeId: true, meta: true },
	});
	const orders = await database.salesOrders.findMany({
		where: { id: { in: salesOrderIds } },
		select: {
			id: true,
			orderId: true,
			status: true,
			createdAt: true,
			deletedAt: true,
			deliveredAt: true,
		},
	});
	const orderById = new Map(orders.map((order) => [order.id, order]));
	const results: Array<{
		salesOrderId: number;
		status: "PLANNED" | "RELEASED" | "FAILED";
		reason: string | null;
	}> = [];
	for (const reviewCase of cases) {
		const salesOrderId = Number(reviewCase.scopeId);
		const order = orderById.get(salesOrderId);
		const correctedStatus = normalize(order?.status);
		if (!order) {
			results.push({
				salesOrderId,
				status: "FAILED",
				reason: "Canonical sales order was not found.",
			});
			continue;
		}
		if (
			input.decision === "CANONICAL_STATUS_CORRECTED" &&
			!correctedStatus &&
			!order.deletedAt &&
			!order.deliveredAt
		) {
			results.push({
				salesOrderId,
				status: "FAILED",
				reason: "Canonical lifecycle status is still blank.",
			});
			continue;
		}
		if (
			input.decision === "ACTIVE_ORDER_APPROVED" &&
			isTerminalSalesHandoffLifecycle(order)
		) {
			results.push({
				salesOrderId,
				status: "FAILED",
				reason: "Active-order approval cannot release a terminal order.",
			});
			continue;
		}
		if (!input.apply) {
			results.push({ salesOrderId, status: "PLANNED", reason: null });
			continue;
		}
		const actionId = `sales-handoff-lifecycle-release:${salesOrderId}:${crypto.randomUUID()}`;
		let actionCreated = false;
		try {
			const claimed = await database.resolutionCase.updateMany({
				where: { id: reviewCase.id, status: "open", deletedAt: null },
				data: { status: "releasing" },
			});
			if (claimed.count !== 1) {
				results.push({
					salesOrderId,
					status: "FAILED",
					reason: "Lifecycle review was already claimed or resolved.",
				});
				continue;
			}
			await database.resolutionAction.create({
				data: {
					id: actionId,
					resolutionCaseId: reviewCase.id,
					actionType: "sales_handoff_lifecycle_release",
					status: "pending",
					actorId: input.actorUserId,
					beforeState: reviewCase.meta ?? undefined,
					afterState: {
						decision: input.decision,
						canonicalStatus: order.status,
					},
					meta: { reason: input.reason },
				},
			});
			actionCreated = true;
			await dependencies.reconcileOrder(database, {
				salesOrderId,
				actorUserId: input.actorUserId,
				now: input.now,
				lifecycleReviewRelease: true,
			});
			await database.resolutionCase.updateMany({
				where: {
					id: reviewCase.id,
					status: "releasing",
					deletedAt: null,
				},
				data: { status: "resolved" },
			});
			await database.resolutionAction.update({
				where: { id: actionId },
				data: { status: "completed" },
			});
			results.push({ salesOrderId, status: "RELEASED", reason: null });
		} catch (error) {
			if (actionCreated) {
				await database.resolutionAction.updateMany({
					where: { id: actionId, status: "pending", deletedAt: null },
					data: { status: "failed" },
				});
			}
			await database.resolutionCase.updateMany({
				where: { id: reviewCase.id, deletedAt: null },
				data: { status: "open" },
			});
			results.push({
				salesOrderId,
				status: "FAILED",
				reason: error instanceof Error ? error.message : String(error),
			});
		}
	}
	return {
		mode: input.apply ? ("apply" as const) : ("dry-run" as const),
		scanned: cases.length,
		planned: results.filter((result) => result.status === "PLANNED").length,
		released: results.filter((result) => result.status === "RELEASED").length,
		failed: results.filter((result) => result.status === "FAILED").length,
		results,
	};
}

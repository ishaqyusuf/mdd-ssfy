import type { Database, Prisma } from "@gnd/db";
import { getSalesHandoffTriggerSettings } from "@gnd/settings";
import { getSalesOrderLifecycleStatus } from "../order-status";
import { qualifySalesHandoff } from "../sales-handoff-qualification";
import { resolveSalesInventoryApplicability } from "../sales-inventory-applicability";
import {
	getSalesHandoffActorScope,
	resolveSalesHandoffOrganizationScope,
} from "./access";
import {
	type SalesHandoffInitialExposureMilestone,
	deriveSalesHandoffOpenedAt,
	nextSalesHandoffBusinessDay,
} from "./escalation";
import {
	type MaterialHandoffProjection,
	projectMaterialSalesHandoff,
} from "./material";
import {
	type ProductionHandoffProjection,
	projectProductionSalesHandoff,
} from "./production";
import {
	recordSalesHandoffPolicyReconciliationRepair,
	recordSalesHandoffReconciliationRepair,
	resolveSalesHandoffReconciliationRepairs,
} from "./repair";

const MATERIAL_ACTION = "MATERIAL";
const PRODUCTION_ACTION = "PRODUCTION";
const HANDOFF_ACTION_TYPES = [MATERIAL_ACTION, PRODUCTION_ACTION] as const;
type SalesHandoffActionType = (typeof HANDOFF_ACTION_TYPES)[number];
const MAX_RECONCILE_ORDERS = 200;
const MAX_TRANSACTION_ATTEMPTS = 3;
const TERMINAL_ORDER_STATUSES = [
	"cancelled",
	"canceled",
	"completed",
	"complete",
	"delivered",
	"fulfilled",
] as const;

const productionAssignmentSelect = {
	id: true,
	itemId: true,
	salesItemControlUid: true,
	salesDoorId: true,
	shelfItemId: true,
	assignedToId: true,
	qtyAssigned: true,
	lhQty: true,
	rhQty: true,
	completedAt: true,
	deletedAt: true,
	submissions: {
		select: {
			id: true,
			qty: true,
			lhQty: true,
			rhQty: true,
			deletedAt: true,
			materialReview: { select: { status: true } },
		},
	},
} as const;

const salesHandoffOrderSelect = {
	id: true,
	orgId: true,
	orderId: true,
	updatedAt: true,
	type: true,
	status: true,
	prodStatus: true,
	deliveredAt: true,
	deletedAt: true,
	paymentTerm: true,
	grandTotal: true,
	salesRepId: true,
	assignments: { select: productionAssignmentSelect },
	inventoryProjection: {
		select: { status: true, needCount: true, completedAt: true },
	},
	lineItems: {
		where: { deletedAt: null },
		select: {
			components: {
				select: {
					id: true,
					required: true,
					qty: true,
					qtyAllocated: true,
					qtyReceived: true,
					status: true,
					inventoryId: true,
					inventoryVariantId: true,
					inventory: {
						select: { id: true, productKind: true, stockMode: true },
					},
					inventoryVariant: { select: { id: true } },
					inventoryCategory: {
						select: { productKind: true, stockMode: true },
					},
					subComponent: {
						select: {
							defaultInventory: {
								select: { productKind: true, stockMode: true },
							},
							inventoryCategory: {
								select: { productKind: true, stockMode: true },
							},
						},
					},
					inboundDemands: {
						select: {
							id: true,
							qty: true,
							qtyReceived: true,
							status: true,
							deletedAt: true,
							inboundShipmentItemId: true,
							inboundShipmentItem: {
								select: {
									id: true,
									deletedAt: true,
									inbound: {
										select: { id: true, status: true, deletedAt: true },
									},
								},
							},
						},
					},
				},
			},
		},
	},
	itemControls: {
		where: { deletedAt: null },
		select: {
			uid: true,
			orderItemId: true,
			produceable: true,
			deletedAt: true,
			qtyControls: {
				where: { deletedAt: null },
				select: {
					type: true,
					qty: true,
					lh: true,
					rh: true,
					total: true,
					itemTotal: true,
					deletedAt: true,
				},
			},
			assignments: { select: productionAssignmentSelect },
		},
	},
} as const;

type EpochRow = {
	id: string;
	salesOrderId: number;
	orderId: string;
	actionType: string;
	epoch: number;
	openKey: string | null;
	responsibleRepId: number;
	organizationId: number | null;
	policyRevision: number;
	evidenceRevision: string;
	uncoveredQty: number;
	qualifiedAt: Date | null;
	openedAt: Date;
	resolvedAt: Date | null;
	targetSalesItemId: number | null;
	targetControlUid: string | null;
	targetAssignmentId: number | null;
	escalationDueAt: Date | null;
	escalatedAt: Date | null;
};

type EpochRepository = {
	findFirst(args: unknown): Promise<EpochRow | null>;
	findMany(args: unknown): Promise<EpochRow[]>;
	count(args: unknown): Promise<number>;
	create(args: unknown): Promise<EpochRow>;
	update(args: unknown): Promise<EpochRow>;
};

function epochs(db: unknown) {
	return (db as { salesHandoffActionEpoch: EpochRepository })
		.salesHandoffActionEpoch;
}

function openKey(actionType: SalesHandoffActionType, salesOrderId: number) {
	return `${actionType}:${salesOrderId}`;
}

function chunks<T>(values: T[], size = MAX_RECONCILE_ORDERS) {
	const result: T[][] = [];
	for (let index = 0; index < values.length; index += size) {
		result.push(values.slice(index, index + size));
	}
	return result;
}

function exactSalesOrderIds(values: number[]) {
	return Array.from(
		new Set(values.filter((value) => Number.isInteger(value) && value > 0)),
	);
}

function errorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}

function isRetryableEpochConflict(error: unknown) {
	const code =
		error && typeof error === "object" && "code" in error
			? String((error as { code?: unknown }).code || "")
			: "";
	return code === "P2002" || code === "P2028" || code === "P2034";
}

async function reconcileSalesHandoffEpoch(
	db: Database,
	input: {
		actionType: SalesHandoffActionType;
		salesOrderId: number;
		orderId: string;
		responsibleRepId: number | null;
		organizationId?: number | null;
		policyRevision: number;
		policyChangedAt?: string | null;
		qualifiedAt: string | null;
		projection: MaterialHandoffProjection | ProductionHandoffProjection;
		reconciledByUserId?: number | null;
		targetSalesItemId?: number | null;
		targetControlUid?: string | null;
		targetAssignmentId?: number | null;
		initialExposureMilestone?: SalesHandoffInitialExposureMilestone | null;
		now?: Date;
	},
) {
	const now = input.now ?? new Date();
	for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
		try {
			return await db.$transaction(
				async (tx) => {
					const repository = epochs(tx);
					const current = await repository.findFirst({
						where: { openKey: openKey(input.actionType, input.salesOrderId) },
					});
					const shouldOpen =
						input.projection.actionable && input.responsibleRepId != null;

					if (!shouldOpen) {
						if (!current)
							return { transition: "unchanged" as const, epoch: null };
						const epoch = await repository.update({
							where: { id: current.id },
							data: {
								openKey: null,
								resolvedAt: now,
								resolvedByUserId: input.reconciledByUserId ?? null,
								resolutionReason: input.projection.reason,
								lastReconciledAt: now,
								lastReconciledByUserId: input.reconciledByUserId ?? null,
							},
						});
						return { transition: "resolved" as const, epoch };
					}

					const qualifiedAt = input.qualifiedAt
						? new Date(input.qualifiedAt)
						: null;
					if (current) {
						if (current.responsibleRepId !== input.responsibleRepId) {
							const epoch = await repository.update({
								where: { id: current.id },
								data: {
									orderId: input.orderId,
									responsibleRepId: input.responsibleRepId,
									organizationId: input.organizationId ?? null,
									policyRevision: input.policyRevision,
									evidenceRevision: input.projection.evidenceRevision,
									uncoveredQty: input.projection.uncoveredQty,
									qualifiedAt,
									targetSalesItemId: input.targetSalesItemId ?? null,
									targetControlUid: input.targetControlUid ?? null,
									targetAssignmentId: input.targetAssignmentId ?? null,
									escalatedAt: null,
									lastReconciledAt: now,
									lastReconciledByUserId: input.reconciledByUserId ?? null,
								},
							});
							return { transition: "transferred" as const, epoch };
						}
						const epoch = await repository.update({
							where: { id: current.id },
							data: {
								orderId: input.orderId,
								responsibleRepId: input.responsibleRepId,
								organizationId: input.organizationId ?? null,
								policyRevision: input.policyRevision,
								evidenceRevision: input.projection.evidenceRevision,
								uncoveredQty: input.projection.uncoveredQty,
								qualifiedAt,
								targetSalesItemId: input.targetSalesItemId ?? null,
								targetControlUid: input.targetControlUid ?? null,
								targetAssignmentId: input.targetAssignmentId ?? null,
								lastReconciledAt: now,
								lastReconciledByUserId: input.reconciledByUserId ?? null,
							},
						});
						return { transition: "updated" as const, epoch };
					}

					const previous = await repository.findFirst({
						where: {
							salesOrderId: input.salesOrderId,
							actionType: input.actionType,
						},
						orderBy: { epoch: "desc" },
					});
					const openedAt = deriveSalesHandoffOpenedAt({
						now,
						qualifiedAt,
						policyChangedAt: input.policyChangedAt,
						hasPreviousEpoch: Boolean(previous),
						initialExposureMilestone: input.initialExposureMilestone,
					});
					const epoch = await repository.create({
						data: {
							salesOrderId: input.salesOrderId,
							orderId: input.orderId,
							actionType: input.actionType,
							epoch: (previous?.epoch ?? 0) + 1,
							openKey: openKey(input.actionType, input.salesOrderId),
							responsibleRepId: input.responsibleRepId,
							organizationId: input.organizationId ?? null,
							policyRevision: input.policyRevision,
							evidenceRevision: input.projection.evidenceRevision,
							uncoveredQty: input.projection.uncoveredQty,
							qualifiedAt,
							openedAt,
							openedByUserId: input.reconciledByUserId ?? null,
							targetSalesItemId: input.targetSalesItemId ?? null,
							targetControlUid: input.targetControlUid ?? null,
							targetAssignmentId: input.targetAssignmentId ?? null,
							escalationDueAt: nextSalesHandoffBusinessDay(openedAt),
							escalatedAt: null,
							resolvedAt: null,
							resolvedByUserId: null,
							reopenedFromEpochId: previous?.id ?? null,
							lastReconciledAt: now,
							lastReconciledByUserId: input.reconciledByUserId ?? null,
							source: "projection",
						},
					});
					return {
						transition: previous ? ("reopened" as const) : ("opened" as const),
						epoch,
					};
				},
				{ isolationLevel: "Serializable" },
			);
		} catch (error) {
			if (
				!isRetryableEpochConflict(error) ||
				attempt === MAX_TRANSACTION_ATTEMPTS
			)
				throw error;
		}
	}
	throw new Error(
		`${input.actionType} handoff reconciliation exhausted retries.`,
	);
}

export function reconcileMaterialSalesHandoffEpoch(
	db: Database,
	input: Omit<
		Parameters<typeof reconcileSalesHandoffEpoch>[1],
		"actionType"
	> & {
		projection: MaterialHandoffProjection;
	},
) {
	return reconcileSalesHandoffEpoch(db, {
		...input,
		actionType: MATERIAL_ACTION,
	});
}

export function reconcileProductionSalesHandoffEpoch(
	db: Database,
	input: Omit<
		Parameters<typeof reconcileSalesHandoffEpoch>[1],
		"actionType"
	> & {
		projection: ProductionHandoffProjection;
	},
) {
	return reconcileSalesHandoffEpoch(db, {
		...input,
		actionType: PRODUCTION_ACTION,
	});
}

function lifecycleForOrder(order: {
	deletedAt: Date | null;
	status: string | null;
	prodStatus: string | null;
	deliveredAt: Date | null;
}) {
	if (order.deletedAt) return "TERMINAL" as const;
	const lifecycle = getSalesOrderLifecycleStatus({
		orderStatus: order.status,
		productionStatus: order.prodStatus,
		fulfillmentStatus: order.deliveredAt ? "fulfilled" : null,
	});
	if (lifecycle === "cancelled") return "CANCELLED" as const;
	if (lifecycle === "fulfilled") return "TERMINAL" as const;
	return "ACTIVE" as const;
}

function materialComponents(order: {
	lineItems: Array<{ components: unknown[] }>;
}) {
	return order.lineItems.flatMap((lineItem) => lineItem.components);
}

function productionItems(order: {
	updatedAt?: Date | null;
	itemControls?: Array<{
		uid: string;
		orderItemId: number | null;
		produceable: boolean | null;
		deletedAt: Date | null;
		qtyControls: Array<{
			type: string;
			qty: number | null;
			lh: number | null;
			rh: number | null;
			total: number;
			itemTotal: number | null;
			deletedAt: Date | null;
		}>;
		assignments: Array<{
			id: number;
			itemId: number;
			salesItemControlUid: string | null;
			salesDoorId?: number | null;
			shelfItemId?: number | null;
			assignedToId: number | null;
			qtyAssigned: number | null;
			lhQty: number | null;
			rhQty: number | null;
			completedAt: Date | null;
			deletedAt: Date | null;
			submissions: Array<{
				id: number;
				qty: number;
				lhQty: number | null;
				rhQty: number | null;
				deletedAt: Date | null;
				materialReview: { status: string } | null;
			}>;
		}>;
	}>;
	assignments?: Array<{
		id: number;
		itemId: number;
		salesItemControlUid: string | null;
		salesDoorId?: number | null;
		shelfItemId?: number | null;
		assignedToId: number | null;
		qtyAssigned: number | null;
		lhQty: number | null;
		rhQty: number | null;
		completedAt: Date | null;
		deletedAt: Date | null;
		submissions: Array<{
			id: number;
			qty: number;
			lhQty: number | null;
			rhQty: number | null;
			deletedAt: Date | null;
			materialReview: { status: string } | null;
		}>;
	}>;
}) {
	const controls = order.itemControls || [];
	const orderAssignments = order.assignments || [];
	return controls.map((control) => {
		const required = control.qtyControls.find((qty) => qty.type === "qty");
		const salesItemId =
			control.orderItemId ?? control.assignments.at(0)?.itemId ?? -1;
		const controlsForItem = controls.filter(
			(candidate) => candidate.orderItemId === salesItemId,
		);
		const fallbackAssignments = orderAssignments.filter((assignment) => {
			if (assignment.salesItemControlUid) {
				return assignment.salesItemControlUid === control.uid;
			}
			if (assignment.salesDoorId) {
				return control.uid.startsWith(`door-${assignment.salesDoorId}-`);
			}
			if (assignment.shelfItemId) {
				return control.uid === `shelf-${assignment.shelfItemId}`;
			}
			return assignment.itemId === salesItemId && controlsForItem.length === 1;
		});
		const assignments = Array.from(
			new Map(
				[...control.assignments, ...fallbackAssignments].map((assignment) => [
					assignment.id,
					assignment,
				]),
			).values(),
		);
		return {
			salesItemId,
			controlUid: control.uid,
			productionCapable: control.produceable === true,
			requiredQty: required?.qty ?? required?.total ?? required?.itemTotal ?? 0,
			lhQty: required?.lh ?? 0,
			rhQty: required?.rh ?? 0,
			deletedAt: control.deletedAt,
			assignments: assignments.map((assignment) => ({
				id: assignment.id,
				salesItemId: assignment.itemId,
				controlUid: assignment.salesItemControlUid ?? control.uid,
				assignedToId: assignment.assignedToId,
				qtyAssigned: assignment.qtyAssigned,
				lhQty: assignment.lhQty,
				rhQty: assignment.rhQty,
				completedAt: assignment.completedAt,
				deletedAt: assignment.deletedAt,
				submissions: assignment.submissions,
			})),
		};
	});
}

async function paymentTimelines(db: Database, salesOrderIds: number[]) {
	const allocations = (
		await Promise.all(
			chunks(salesOrderIds).map((salesOrderIdChunk) =>
				db.paymentAllocation.findMany({
					where: {
						salesOrderId: { in: salesOrderIdChunk },
						deletedAt: null,
						allocationType: {
							in: ["payment", "refund", "void", "square_refund"],
						},
					},
					select: {
						id: true,
						ledgerEntryId: true,
						salesOrderId: true,
						amount: true,
						allocationType: true,
						createdAt: true,
					},
				}),
			),
		)
	).flat();
	const ledgerIds = Array.from(
		new Set(allocations.map((allocation) => allocation.ledgerEntryId)),
	);
	const ledgerEntries = ledgerIds.length
		? (
				await Promise.all(
					chunks(ledgerIds).map((ledgerIdChunk) =>
						db.paymentLedgerEntry.findMany({
							where: {
								id: { in: ledgerIdChunk },
								deletedAt: null,
								status: "posted",
							},
							select: { id: true, occurredAt: true },
						}),
					),
				)
			).flat()
		: [];
	const occurredAt = new Map(
		ledgerEntries.map((entry) => [entry.id, entry.occurredAt]),
	);
	const result = new Map<
		number,
		Array<{ id: string; netSettledAmount: number; occurredAt: Date }>
	>();
	for (const salesOrderId of salesOrderIds) {
		result.set(
			salesOrderId,
			buildSalesHandoffSettlementTimeline({
				salesOrderId,
				allocations,
				occurredAtByLedgerId: occurredAt,
			}),
		);
	}
	return result;
}

export function buildSalesHandoffSettlementTimeline(input: {
	salesOrderId: number;
	allocations: Array<{
		id: string;
		ledgerEntryId: string;
		salesOrderId: number;
		amount: number | string | null;
		allocationType: string;
	}>;
	occurredAtByLedgerId: Map<string, Date>;
}) {
	const buckets = new Map<
		number,
		{ ids: string[]; delta: number; occurredAt: Date }
	>();
	for (const allocation of input.allocations) {
		if (allocation.salesOrderId !== input.salesOrderId) continue;
		const occurredAt = input.occurredAtByLedgerId.get(allocation.ledgerEntryId);
		if (!occurredAt) continue;
		const timestamp = occurredAt.getTime();
		const bucket = buckets.get(timestamp) ?? {
			ids: [],
			delta: 0,
			occurredAt,
		};
		bucket.ids.push(allocation.id);
		bucket.delta += normalizePaymentAllocationDelta({
			allocationType: allocation.allocationType,
			amount: Number(allocation.amount || 0),
		});
		buckets.set(timestamp, bucket);
	}

	let total = 0;
	return Array.from(buckets.entries())
		.sort(([left], [right]) => left - right)
		.map(([, bucket]) => {
			total = Math.max(0, total + bucket.delta);
			return {
				id: bucket.ids
					.sort((left, right) => left.localeCompare(right))
					.join(","),
				netSettledAmount: total,
				occurredAt: bucket.occurredAt,
			};
		});
}

export function normalizePaymentAllocationDelta(input: {
	allocationType: string;
	amount: number;
}) {
	const amount = Math.abs(Number.isFinite(input.amount) ? input.amount : 0);
	return input.allocationType === "payment" ? amount : -amount;
}

function lastFullyPaidAt(
	points: Array<{ netSettledAmount: number; occurredAt: Date }>,
	grandTotal: number,
) {
	let crossedAt: Date | null = null;
	let below = true;
	for (const point of points) {
		const currentBelow = point.netSettledAmount < grandTotal;
		if (below && !currentBelow) crossedAt = point.occurredAt;
		if (currentBelow) crossedAt = null;
		below = currentBelow;
	}
	return crossedAt;
}

type SalesHandoffOrder = Prisma.SalesOrdersGetPayload<{
	select: typeof salesHandoffOrderSelect;
}>;

type PaymentProjectionRow = {
	salesOrderId: number;
	totalAllocated: number;
	totalRefunded: number;
	totalVoided: number;
	amountDue: number;
	version: number;
};

export class SalesHandoffSourceProjectionUnavailableError extends Error {
	constructor(
		readonly salesOrderId: number,
		readonly source: "PAYMENT" | "INVENTORY",
		detail: string,
	) {
		super(
			`Sales Handoff ${source.toLowerCase()} projection is unavailable for order ${salesOrderId}: ${detail}`,
		);
		this.name = "SalesHandoffSourceProjectionUnavailableError";
	}
}

async function projectAndReconcileSalesHandoffOrder(
	db: Database,
	input: {
		order: SalesHandoffOrder;
		policy: Awaited<ReturnType<typeof getSalesHandoffTriggerSettings>>;
		paymentProjection: PaymentProjectionRow | null | undefined;
		timeline: Array<{
			id: string;
			netSettledAmount: number;
			occurredAt: Date;
		}>;
		actorUserId: number;
		now?: Date;
		openActionKeys?: Set<string>;
		initialExposureMilestone?: SalesHandoffInitialExposureMilestone | null;
		initialExposurePolicyRevision?: number | null;
		initialExposurePolicyChangedAt?: string | null;
	},
) {
	const { order, paymentProjection } = input;
	const lifecycle = lifecycleForOrder(order);
	const components = materialComponents(order);
	const requiresPaymentProjection =
		lifecycle === "ACTIVE" &&
		order.type === "order" &&
		Number(order.grandTotal || 0) > 0 &&
		String(order.paymentTerm || "")
			.trim()
			.toLowerCase() !== "cod";
	if (requiresPaymentProjection && !paymentProjection) {
		throw new SalesHandoffSourceProjectionUnavailableError(
			order.id,
			"PAYMENT",
			"canonical PaymentProjection row was not found",
		);
	}
	const applicability = resolveSalesInventoryApplicability({
		lifecycleStatus:
			lifecycle === "CANCELLED"
				? "cancelled"
				: lifecycle === "TERMINAL"
					? "fulfilled"
					: getSalesOrderLifecycleStatus({
							orderStatus: order.status,
							productionStatus: order.prodStatus,
						}),
		projection: order.inventoryProjection,
		existingInventoryNeedCount: components.length,
	});
	const qualification = paymentProjection
		? qualifySalesHandoff({
				policy: input.policy,
				payment: {
					orderType: order.type || "order",
					lifecycle,
					paymentTerm: order.paymentTerm,
					projection: {
						salesOrderId: order.id,
						grandTotal: Number(order.grandTotal || 0),
						totalAllocated: paymentProjection.totalAllocated,
						totalRefunded: paymentProjection.totalRefunded,
						totalVoided: paymentProjection.totalVoided,
						amountDue: paymentProjection.amountDue,
					},
					settlementTimeline: input.timeline,
					fullyPaidAt: lastFullyPaidAt(
						input.timeline,
						Number(order.grandTotal || 0),
					),
				},
			})
		: null;
	const materialProjection = projectMaterialSalesHandoff({
		paymentQualified: Boolean(qualification?.qualified),
		inventoryApplicable: applicability.state === "applicable",
		components: components as Parameters<
			typeof projectMaterialSalesHandoff
		>[0]["components"],
	});
	const productionProjection = projectProductionSalesHandoff({
		paymentQualified: Boolean(qualification?.qualified),
		lifecycleActive: lifecycle === "ACTIVE",
		orderRevision: order.updatedAt?.toISOString() ?? "legacy",
		items: productionItems(order),
	});
	const inventoryProjectionUnavailable =
		qualification?.qualified === true &&
		["not_synced", "syncing", "failed"].includes(applicability.state);
	if (
		inventoryProjectionUnavailable &&
		!productionProjection.actionable &&
		!input.openActionKeys?.has(openKey(MATERIAL_ACTION, order.id))
	) {
		throw new SalesHandoffSourceProjectionUnavailableError(
			order.id,
			"INVENTORY",
			`inventory applicability is ${applicability.state}`,
		);
	}
	const organization = await resolveSalesHandoffOrganizationScope(db, {
		orderOrganizationId: order.orgId,
		responsibleRepId: order.salesRepId,
	});
	if (organization.organizationId == null) {
		console.error("Sales handoff organization scope could not be resolved", {
			salesOrderId: order.id,
			responsibleRepId: order.salesRepId,
			reason: organization.source,
		});
	}
	const durablePolicyChangedAt =
		input.initialExposureMilestone === "POLICY_CHANGE" &&
		input.initialExposurePolicyRevision != null &&
		input.initialExposurePolicyRevision > 0 &&
		input.initialExposurePolicyRevision <= input.policy.revision &&
		input.initialExposurePolicyChangedAt &&
		!Number.isNaN(new Date(input.initialExposurePolicyChangedAt).getTime())
			? input.initialExposurePolicyChangedAt
			: null;
	const common = {
		salesOrderId: order.id,
		orderId: order.orderId,
		responsibleRepId: order.salesRepId,
		organizationId: organization.organizationId,
		policyRevision: input.policy.revision,
		policyChangedAt: durablePolicyChangedAt ?? input.policy.changedAt,
		qualifiedAt: qualification?.qualifiedAt ?? null,
		initialExposureMilestone: input.initialExposureMilestone,
		reconciledByUserId: input.actorUserId,
		now: input.now,
	};
	const shouldReconcile = (
		actionType: SalesHandoffActionType,
		actionable: boolean,
	) =>
		!input.openActionKeys ||
		actionable ||
		input.openActionKeys.has(openKey(actionType, order.id));
	const reconciliations: Promise<unknown>[] = [];
	if (
		!inventoryProjectionUnavailable &&
		shouldReconcile(MATERIAL_ACTION, materialProjection.actionable)
	) {
		reconciliations.push(
			reconcileMaterialSalesHandoffEpoch(db, {
				...common,
				projection: {
					...materialProjection,
					evidenceRevision: `${materialProjection.evidenceRevision}-p${paymentProjection?.version ?? 0}`,
				},
			}),
		);
	}
	if (shouldReconcile(PRODUCTION_ACTION, productionProjection.actionable)) {
		reconciliations.push(
			reconcileProductionSalesHandoffEpoch(db, {
				...common,
				targetSalesItemId: productionProjection.targetSalesItemId,
				targetControlUid: productionProjection.targetControlUid,
				targetAssignmentId: productionProjection.targetAssignmentId,
				projection: {
					...productionProjection,
					evidenceRevision: `${productionProjection.evidenceRevision}-p${paymentProjection?.version ?? 0}`,
				},
			}),
		);
	}
	const transitions = await Promise.all(reconciliations);
	return {
		transitions,
		productionTarget: {
			targetSalesItemId: productionProjection.targetSalesItemId,
			targetControlUid: productionProjection.targetControlUid,
			targetAssignmentId: productionProjection.targetAssignmentId,
			orderRevision: productionProjection.orderRevision,
		},
	};
}

export async function getSalesHandoffActions(
	db: Database,
	input: { actorUserId: number; limit?: number; now?: Date },
) {
	const limit = Math.min(50, Math.max(1, Math.trunc(input.limit ?? 50)));
	const repository = epochs(db);
	const actorScope = await getSalesHandoffActorScope(db, input.actorUserId);
	const actorEpochWhere =
		actorScope.kind === "SUPER_ADMIN"
			? { organizationId: { in: actorScope.organizationIds } }
			: { responsibleRepId: input.actorUserId };
	const currentlyOpen = await repository.findMany({
		where: {
			actionType: { in: [...HANDOFF_ACTION_TYPES] },
			...actorEpochWhere,
			resolvedAt: null,
		},
		select: { salesOrderId: true, actionType: true },
		orderBy: [
			{ openedAt: "asc" },
			{ orderId: "asc" },
			{ actionType: "asc" },
			{ id: "asc" },
		],
		take: MAX_RECONCILE_ORDERS,
	});
	const openOrderIds = Array.from(
		new Set(currentlyOpen.map((epoch) => epoch.salesOrderId)),
	);
	const openActionKeys = new Set(
		currentlyOpen.map((epoch) =>
			openKey(epoch.actionType as SalesHandoffActionType, epoch.salesOrderId),
		),
	);
	const recentCandidates = await db.salesOrders.findMany({
		where: {
			type: "order",
			...(actorScope.kind === "SUPER_ADMIN"
				? { orgId: { in: actorScope.organizationIds } }
				: { salesRepId: input.actorUserId }),
			deletedAt: null,
			deliveredAt: null,
			...(openOrderIds.length ? { id: { notIn: openOrderIds } } : {}),
			OR: [
				{ status: null },
				{ status: { notIn: [...TERMINAL_ORDER_STATUSES] } },
			],
		},
		select: salesHandoffOrderSelect,
		orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
		take: MAX_RECONCILE_ORDERS,
	});
	const openOrderGroups = await Promise.all(
		chunks(openOrderIds).map((salesOrderIdChunk) =>
			db.salesOrders.findMany({
				where: { id: { in: salesOrderIdChunk } },
				select: salesHandoffOrderSelect,
			}),
		),
	);
	const orders = Array.from(
		new Map(
			[...openOrderGroups.flat(), ...recentCandidates].map(
				(order) => [order.id, order] as const,
			),
		).values(),
	);
	const orderIds = orders.map((order) => order.id);
	const [policy, projectionGroups, timelines] = await Promise.all([
		getSalesHandoffTriggerSettings(db),
		orderIds.length
			? Promise.all(
					chunks(orderIds).map((salesOrderIdChunk) =>
						db.paymentProjection.findMany({
							where: { salesOrderId: { in: salesOrderIdChunk } },
							select: {
								salesOrderId: true,
								totalAllocated: true,
								totalRefunded: true,
								totalVoided: true,
								amountDue: true,
								version: true,
							},
						}),
					),
				)
			: [],
		paymentTimelines(db, orderIds),
	]);
	const projections = projectionGroups.flat();
	const projectionByOrder = new Map(
		projections.map(
			(projection) => [projection.salesOrderId, projection] as const,
		),
	);
	const productionTargets = new Map<
		number,
		{
			targetSalesItemId: number | null;
			targetControlUid: string | null;
			targetAssignmentId: number | null;
			orderRevision: string;
		}
	>();

	for (const order of orders) {
		const paymentProjection = projectionByOrder.get(order.id);
		const reconciliation = await projectAndReconcileSalesHandoffOrder(db, {
			order,
			policy,
			paymentProjection,
			timeline: timelines.get(order.id) ?? [],
			actorUserId: input.actorUserId,
			now: input.now,
			openActionKeys,
		});
		productionTargets.set(order.id, reconciliation.productionTarget);
	}

	const openActionsWhere = {
		actionType: { in: [...HANDOFF_ACTION_TYPES] },
		...actorEpochWhere,
		resolvedAt: null,
		openKey: { not: null },
	};
	const [openActions, materialCount, productionCount] = await Promise.all([
		repository.findMany({
			where: openActionsWhere,
			orderBy: [
				{ openedAt: "asc" },
				{ orderId: "asc" },
				{ actionType: "asc" },
				{ id: "asc" },
			],
			take: limit,
		}),
		repository.count({
			where: {
				...actorEpochWhere,
				actionType: MATERIAL_ACTION,
				resolvedAt: null,
				openKey: { not: null },
			},
		}),
		repository.count({
			where: {
				...actorEpochWhere,
				actionType: PRODUCTION_ACTION,
				resolvedAt: null,
				openKey: { not: null },
			},
		}),
	]);
	const total = materialCount + productionCount;

	const representativeIds = Array.from(
		new Set(openActions.map((action) => action.responsibleRepId)),
	);
	const representatives = representativeIds.length
		? await db.users.findMany({
				where: { id: { in: representativeIds } },
				select: { id: true, name: true },
			})
		: [];
	const representativeNames = new Map(
		representatives.map((representative) => [
			representative.id,
			representative.name || `Sales rep ${representative.id}`,
		]),
	);
	return {
		scope: actorScope.kind,
		actions: openActions.map((action) => {
			const type = action.actionType as SalesHandoffActionType;
			const productionTarget = productionTargets.get(action.salesOrderId);
			return {
				id: action.id,
				salesOrderId: action.salesOrderId,
				orderId: action.orderId,
				type,
				responsibleRepId: action.responsibleRepId,
				responsibleRepName:
					representativeNames.get(action.responsibleRepId) ??
					`Sales rep ${action.responsibleRepId}`,
				uncoveredQty: action.uncoveredQty,
				openedAt: action.openedAt.toISOString(),
				qualifiedAt: action.qualifiedAt?.toISOString() ?? null,
				policyRevision: action.policyRevision,
				evidenceRevision: action.evidenceRevision,
				targetSalesItemId:
					type === PRODUCTION_ACTION
						? (action.targetSalesItemId ??
							productionTarget?.targetSalesItemId ??
							null)
						: null,
				targetControlUid:
					type === PRODUCTION_ACTION
						? (action.targetControlUid ??
							productionTarget?.targetControlUid ??
							null)
						: null,
				targetAssignmentId:
					type === PRODUCTION_ACTION
						? (action.targetAssignmentId ??
							productionTarget?.targetAssignmentId ??
							null)
						: null,
				orderRevision:
					type === PRODUCTION_ACTION
						? (productionTarget?.orderRevision ?? null)
						: null,
			};
		}),
		total,
		counts: {
			MATERIAL: materialCount,
			PRODUCTION: productionCount,
		},
		limit,
		truncated: total > openActions.length,
	};
}

/** Protected, actor-derived open-order scope for the Sales Orders Needs Action tab. */
export async function getOpenSalesHandoffOrderScope(
	db: Database,
	input: { actorUserId: number; limit?: number },
) {
	const limit = Math.min(
		MAX_RECONCILE_ORDERS,
		Math.max(1, Math.trunc(input.limit ?? MAX_RECONCILE_ORDERS)),
	);
	const { scope, where } = await getOpenSalesHandoffEpochWhere(
		db,
		input.actorUserId,
	);
	const [rows, uniqueOrderCount] = await Promise.all([
		epochs(db).findMany({
			where,
			select: { salesOrderId: true },
			distinct: ["salesOrderId"],
			orderBy: [{ salesOrderId: "asc" }],
			take: limit + 1,
		}),
		db.salesOrders.count({
			where: { handoffActionEpochs: { some: where } },
		}),
	]);
	const salesOrderIds = rows.slice(0, limit).map((row) => row.salesOrderId);
	return {
		scope: scope.kind,
		salesOrderIds,
		uniqueOrderCount,
		truncated: uniqueOrderCount > salesOrderIds.length,
	};
}

/** Reusable protected relation fragment for exact Sales Orders filtering/counting. */
export async function getOpenSalesHandoffEpochWhere(
	db: Database,
	actorUserId: number,
): Promise<{
	scope: Awaited<ReturnType<typeof getSalesHandoffActorScope>>;
	where: Prisma.SalesHandoffActionEpochWhereInput;
}> {
	const scope = await getSalesHandoffActorScope(db, actorUserId);
	return {
		scope,
		where: {
			actionType: { in: [...HANDOFF_ACTION_TYPES] },
			resolvedAt: null,
			openKey: { not: null },
			...(scope.kind === "SUPER_ADMIN"
				? { organizationId: { in: scope.organizationIds } }
				: { responsibleRepId: actorUserId }),
		},
	};
}

async function resolveMissingSalesHandoffOrder(
	db: Database,
	input: {
		salesOrderId: number;
		actorUserId: number;
		now?: Date;
	},
) {
	const now = input.now ?? new Date();
	return db.$transaction(
		async (tx) => {
			const repository = epochs(tx);
			const current = await repository.findMany({
				where: {
					salesOrderId: input.salesOrderId,
					actionType: { in: [...HANDOFF_ACTION_TYPES] },
					resolvedAt: null,
					openKey: { not: null },
				},
			});
			return Promise.all(
				current.map((epoch) =>
					repository.update({
						where: { id: epoch.id },
						data: {
							openKey: null,
							resolvedAt: now,
							resolvedByUserId: input.actorUserId,
							resolutionReason: "ORDER_NOT_FOUND",
							lastReconciledAt: now,
							lastReconciledByUserId: input.actorUserId,
						},
					}),
				),
			);
		},
		{ isolationLevel: "Serializable" },
	);
}

/**
 * Exact affected-order event seam for committed payment, lifecycle, inventory,
 * ownership, fulfillment, and production writers. This never delegates to the
 * representative-scoped bounded alert read.
 */
export async function reconcileMaterialSalesHandoffOrder(
	db: Database,
	input: {
		salesOrderId: number;
		actorUserId: number;
		now?: Date;
		initialExposureMilestone?: SalesHandoffInitialExposureMilestone | null;
		initialExposurePolicyRevision?: number | null;
		initialExposurePolicyChangedAt?: string | null;
	},
) {
	const order = await db.salesOrders.findFirst({
		where: { id: input.salesOrderId },
		select: salesHandoffOrderSelect,
	});
	if (!order) return resolveMissingSalesHandoffOrder(db, input);
	const [policy, paymentProjection, timelines] = await Promise.all([
		getSalesHandoffTriggerSettings(db),
		db.paymentProjection.findFirst({
			where: { salesOrderId: input.salesOrderId },
			select: {
				salesOrderId: true,
				totalAllocated: true,
				totalRefunded: true,
				totalVoided: true,
				amountDue: true,
				version: true,
			},
		}),
		paymentTimelines(db, [input.salesOrderId]),
	]);
	return projectAndReconcileSalesHandoffOrder(db, {
		order,
		policy,
		paymentProjection,
		timeline: timelines.get(input.salesOrderId) ?? [],
		actorUserId: input.actorUserId,
		now: input.now,
		initialExposureMilestone: input.initialExposureMilestone,
		initialExposurePolicyRevision: input.initialExposurePolicyRevision,
		initialExposurePolicyChangedAt: input.initialExposurePolicyChangedAt,
	});
}

export async function reconcileSalesHandoffOrders(
	db: Database,
	input: {
		salesOrderIds: number[];
		actorUserId: number;
		now?: Date;
		initialExposureMilestone?: SalesHandoffInitialExposureMilestone | null;
		initialExposurePolicyRevision?: number | null;
		initialExposurePolicyChangedAt?: string | null;
	},
) {
	const salesOrderIds = Array.from(
		new Set(input.salesOrderIds.filter((id) => Number.isInteger(id) && id > 0)),
	);
	return Promise.all(
		salesOrderIds.map((salesOrderId) =>
			reconcileMaterialSalesHandoffOrder(db, {
				salesOrderId,
				actorUserId: input.actorUserId,
				now: input.now,
				initialExposureMilestone: input.initialExposureMilestone,
				initialExposurePolicyRevision: input.initialExposurePolicyRevision,
				initialExposurePolicyChangedAt: input.initialExposurePolicyChangedAt,
			}),
		),
	);
}

type SalesHandoffPostCommitDependencies = {
	reconcile?: typeof reconcileSalesHandoffOrders;
	recordRepair?: typeof recordSalesHandoffReconciliationRepair;
	resolveRepairs?: typeof resolveSalesHandoffReconciliationRepairs;
};

export async function reconcileSalesHandoffAfterCommit(
	db: Database,
	input: {
		salesOrderIds: number[];
		actorUserId: number;
		source: string;
		now?: Date;
		initialExposureMilestone?: SalesHandoffInitialExposureMilestone | null;
		initialExposurePolicyRevision?: number | null;
		initialExposurePolicyChangedAt?: string | null;
	},
	dependencies: SalesHandoffPostCommitDependencies = {},
) {
	const salesOrderIds = exactSalesOrderIds(input.salesOrderIds);
	if (!salesOrderIds.length) {
		return { status: "reconciled" as const, salesOrderIds };
	}
	try {
		await (dependencies.reconcile ?? reconcileSalesHandoffOrders)(db, {
			salesOrderIds,
			actorUserId: input.actorUserId,
			now: input.now,
			initialExposureMilestone: input.initialExposureMilestone,
			initialExposurePolicyRevision: input.initialExposurePolicyRevision,
			initialExposurePolicyChangedAt: input.initialExposurePolicyChangedAt,
		});
		try {
			await (
				dependencies.resolveRepairs ?? resolveSalesHandoffReconciliationRepairs
			)(db, salesOrderIds);
		} catch (repairResolutionError) {
			console.error(
				"Sales Handoff reconciled, but its prior repair marker could not be resolved.",
				{
					salesOrderIds,
					source: input.source,
					error: repairResolutionError,
				},
			);
		}
		return { status: "reconciled" as const, salesOrderIds };
	} catch (error) {
		const reason = errorMessage(error);
		console.error(
			"Authoritative mutation committed, but Sales Handoff reconciliation failed.",
			{ salesOrderIds, source: input.source, error },
		);
		try {
			await (
				dependencies.recordRepair ?? recordSalesHandoffReconciliationRepair
			)(db, {
				salesOrderIds,
				actorUserId: input.actorUserId,
				source: input.source,
				reason,
				initialExposureMilestone: input.initialExposureMilestone,
				initialExposurePolicyRevision: input.initialExposurePolicyRevision,
				initialExposurePolicyChangedAt: input.initialExposurePolicyChangedAt,
			});
			return { status: "repair_recorded" as const, salesOrderIds };
		} catch (repairError) {
			console.error(
				"Sales Handoff reconciliation and durable repair recording both failed.",
				{ salesOrderIds, source: input.source, error: repairError },
			);
			return { status: "repair_record_failed" as const, salesOrderIds };
		}
	}
}

/**
 * A settings change has no single affected order. Reconcile a bounded server
 * fan-out of open and recently active orders immediately; the committed
 * revision marker lets Ticket 07's recurring repair own the complete pass
 * instead of making the settings mutation unbounded.
 */
export async function reconcileSalesHandoffPolicyChange(
	db: Database,
	input: { actorUserId: number; now?: Date },
) {
	const repository = epochs(db);
	const open = await repository.findMany({
		where: {
			actionType: { in: [...HANDOFF_ACTION_TYPES] },
			resolvedAt: null,
			openKey: { not: null },
		},
		select: { salesOrderId: true, actionType: true },
		orderBy: [{ openedAt: "asc" }, { id: "asc" }],
		take: MAX_RECONCILE_ORDERS,
	});
	const openIds = Array.from(new Set(open.map((epoch) => epoch.salesOrderId)));
	const recent = await db.salesOrders.findMany({
		where: {
			type: "order",
			deletedAt: null,
			deliveredAt: null,
			...(openIds.length ? { id: { notIn: openIds } } : {}),
			OR: [
				{ status: null },
				{ status: { notIn: [...TERMINAL_ORDER_STATUSES] } },
			],
		},
		select: { id: true },
		orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
		take: MAX_RECONCILE_ORDERS,
	});
	return reconcileSalesHandoffOrders(db, {
		salesOrderIds: [...openIds, ...recent.map((order) => order.id)],
		actorUserId: input.actorUserId,
		now: input.now,
		initialExposureMilestone: "POLICY_CHANGE",
	});
}

export async function reconcileSalesHandoffPolicyAfterCommit(
	db: Database,
	input: {
		policyRevision: number;
		policyChangedAt?: string | null;
		actorUserId: number;
		source: string;
		now?: Date;
	},
	dependencies: {
		reconcile?: typeof reconcileSalesHandoffPolicyChange;
		recordRepair?: typeof recordSalesHandoffPolicyReconciliationRepair;
	} = {},
) {
	const reconcile = dependencies.reconcile ?? reconcileSalesHandoffPolicyChange;
	const recordRepair =
		dependencies.recordRepair ?? recordSalesHandoffPolicyReconciliationRepair;
	const policyChangedAt =
		input.policyChangedAt ?? input.now?.toISOString() ?? null;
	let markerRecorded = false;
	let markerError: unknown = null;
	let reconciliationError: unknown = null;
	const recordFanout = async (reason: string) => {
		try {
			await recordRepair(db, {
				policyRevision: input.policyRevision,
				policyChangedAt,
				actorUserId: input.actorUserId,
				source: input.source,
				reason,
			});
			markerRecorded = true;
		} catch (error) {
			markerError = error;
		}
	};

	await recordFanout(
		"Policy revision requires a complete active-order fan-out.",
	);
	try {
		await reconcile(db, input);
	} catch (error) {
		reconciliationError = error;
		console.error(
			"Sales Handoff settings committed, but policy reconciliation failed.",
			{ policyRevision: input.policyRevision, source: input.source, error },
		);
	}
	if (!markerRecorded || reconciliationError) {
		await recordFanout(
			reconciliationError
				? errorMessage(reconciliationError)
				: "Policy revision requires a complete active-order fan-out.",
		);
	}
	if (!markerRecorded) {
		console.error(
			"Sales Handoff policy fan-out marker could not be recorded.",
			{
				policyRevision: input.policyRevision,
				source: input.source,
				error: markerError,
			},
		);
		return { status: "repair_record_failed" as const };
	}
	return reconciliationError
		? ({ status: "repair_recorded" } as const)
		: ({ status: "reconciled" } as const);
}

/** Compatibility export retained for Ticket 01/02 callers. */
export const getMaterialSalesHandoffActions = getSalesHandoffActions;

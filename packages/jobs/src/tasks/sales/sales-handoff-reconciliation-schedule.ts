import { type Db, db } from "@gnd/db";
import {
	SALES_HANDOFF_POLICY_RECONCILIATION_SCOPE,
	SALES_HANDOFF_RECONCILIATION_SCOPE,
	reconcileMaterialSalesHandoffOrder,
	recordSalesHandoffReconciliationRepair,
	resolveSalesHandoffReconciliationRepairs,
} from "@gnd/sales/sales-handoff";
import { getSalesHandoffTriggerSettings } from "@gnd/settings";
import { logger, schedules } from "@trigger.dev/sdk/v3";

export const SALES_HANDOFF_RECONCILIATION_EVENT =
	"sales-handoff-reconciliation-schedule";
export const SALES_HANDOFF_RECONCILIATION_BATCH_LIMIT = 200;
export const SALES_HANDOFF_RECONCILIATION_ACTOR_USER_ID = 1 as const;
const REPAIR_MARKER_LIMIT = 100;
const OPEN_EPOCH_LIMIT = 50;
const WORKER_REPAIR_SCOPE = "sales_handoff_reconciliation_worker";
const WORKER_REPAIR_ID = "sales-handoff-reconciliation-worker";
const TERMINAL_ORDER_STATUSES = [
	"cancelled",
	"canceled",
	"completed",
	"complete",
	"delivered",
	"fulfilled",
] as const;

type CandidateSource = "REPAIR" | "OPEN_EPOCH" | "ACTIVE_CURSOR";

export type SalesHandoffPolicyExposureContext = {
	initialExposureMilestone: "POLICY_CHANGE";
	initialExposurePolicyRevision: number;
	initialExposurePolicyChangedAt: string;
};

export type SalesHandoffReconciliationCandidate = {
	salesOrderId: number;
	source: CandidateSource;
	policyExposure?: SalesHandoffPolicyExposureContext;
};

type EpochCursor = { openedAt: string; id: string };

export type SalesHandoffReconciliationCursorState = {
	activeOrderId: number | null;
	openEpoch: EpochCursor | null;
	policyRevisionInProgress: number | null;
};

type ReconciliationDependencies = {
	reconcileOrder: typeof reconcileMaterialSalesHandoffOrder;
	recordOrderRepair: typeof recordSalesHandoffReconciliationRepair;
	resolveOrderRepairs: typeof resolveSalesHandoffReconciliationRepairs;
};

const defaultDependencies: ReconciliationDependencies = {
	reconcileOrder: reconcileMaterialSalesHandoffOrder,
	recordOrderRepair: recordSalesHandoffReconciliationRepair,
	resolveOrderRepairs: resolveSalesHandoffReconciliationRepairs,
};

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function positiveInteger(value: unknown) {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function validDateString(value: unknown) {
	return typeof value === "string" && !Number.isNaN(new Date(value).getTime())
		? value
		: null;
}

function repairPolicyExposure(
	value: unknown,
): SalesHandoffPolicyExposureContext | undefined {
	const meta = asRecord(value);
	const policyRevision = positiveInteger(meta.initialExposurePolicyRevision);
	const policyChangedAt = validDateString(meta.initialExposurePolicyChangedAt);
	return meta.initialExposureMilestone === "POLICY_CHANGE" &&
		policyRevision &&
		policyChangedAt
		? {
				initialExposureMilestone: "POLICY_CHANGE",
				initialExposurePolicyRevision: policyRevision,
				initialExposurePolicyChangedAt: policyChangedAt,
			}
		: undefined;
}

function parseCursorState(
	value: unknown,
): SalesHandoffReconciliationCursorState {
	const meta = asRecord(value);
	const cursor = asRecord(meta.cursorAfter);
	const epoch = asRecord(cursor.openEpoch);
	const openedAt =
		typeof epoch.openedAt === "string" &&
		!Number.isNaN(new Date(epoch.openedAt).getTime())
			? epoch.openedAt
			: null;
	const epochId = typeof epoch.id === "string" ? epoch.id : null;
	return {
		activeOrderId: positiveInteger(cursor.activeOrderId),
		openEpoch: openedAt && epochId ? { openedAt, id: epochId } : null,
		policyRevisionInProgress: positiveInteger(cursor.policyRevisionInProgress),
	};
}

async function readCursorState(database: Db) {
	const latest = await database.scheduleHistory.findFirst({
		where: {
			eventName: SALES_HANDOFF_RECONCILIATION_EVENT,
			deletedAt: null,
		},
		select: { meta: true },
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
	});
	return parseCursorState(latest?.meta);
}

function epochCursorWhere(cursor: EpochCursor | null) {
	if (!cursor) return {};
	const openedAt = new Date(cursor.openedAt);
	return {
		OR: [{ openedAt: { gt: openedAt } }, { openedAt, id: { gt: cursor.id } }],
	};
}

export async function selectSalesHandoffReconciliationBatch(database: Db) {
	const priorState = await readCursorState(database);
	const policyRepairs = await database.resolutionCase.findMany({
		where: {
			scopeType: SALES_HANDOFF_POLICY_RECONCILIATION_SCOPE,
			status: "open",
			deletedAt: null,
		},
		select: { id: true, scopeId: true, meta: true },
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		take: REPAIR_MARKER_LIMIT,
	});
	const policyRevision = policyRepairs.reduce(
		(current, repair) =>
			Math.max(current, positiveInteger(repair.scopeId) ?? 0),
		0,
	);
	const markerPolicyChangedAt = policyRepairs
		.filter((repair) => positiveInteger(repair.scopeId) === policyRevision)
		.map((repair) => validDateString(asRecord(repair.meta).policyChangedAt))
		.find((value): value is string => Boolean(value));
	const currentPolicy = policyRevision
		? await getSalesHandoffTriggerSettings(database)
		: null;
	const currentPolicyChangedAt = validDateString(currentPolicy?.changedAt);
	if (
		currentPolicy &&
		(currentPolicy.revision < policyRevision || !currentPolicyChangedAt)
	) {
		throw new Error(
			`Sales Handoff policy repair revision ${policyRevision} has no active persisted policy exposure context.`,
		);
	}
	const policyExposure =
		currentPolicy && currentPolicyChangedAt
			? ({
					initialExposureMilestone: "POLICY_CHANGE",
					initialExposurePolicyRevision: currentPolicy.revision,
					initialExposurePolicyChangedAt:
						currentPolicy.revision === policyRevision && markerPolicyChangedAt
							? markerPolicyChangedAt
							: currentPolicyChangedAt,
				} satisfies SalesHandoffPolicyExposureContext)
			: null;
	const activePolicyRevision =
		policyExposure?.initialExposurePolicyRevision ?? 0;
	const policyReset =
		activePolicyRevision > 0 &&
		priorState.policyRevisionInProgress !== activePolicyRevision;
	const activeCursor = policyReset ? null : priorState.activeOrderId;

	const repairRows = await database.resolutionCase.findMany({
		where: {
			scopeType: SALES_HANDOFF_RECONCILIATION_SCOPE,
			status: "open",
			deletedAt: null,
		},
		select: { scopeId: true, meta: true },
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		take: REPAIR_MARKER_LIMIT,
	});
	const candidates: SalesHandoffReconciliationCandidate[] = [];
	const selectedIds = new Set<number>();
	for (const repair of repairRows) {
		const salesOrderId = positiveInteger(repair.scopeId);
		if (!salesOrderId || selectedIds.has(salesOrderId)) continue;
		selectedIds.add(salesOrderId);
		candidates.push({
			salesOrderId,
			source: "REPAIR",
			policyExposure: repairPolicyExposure(repair.meta),
		});
	}

	const openEpochRows = await database.salesHandoffActionEpoch.findMany({
		where: {
			actionType: { in: ["MATERIAL", "PRODUCTION"] },
			resolvedAt: null,
			openKey: { not: null },
			...epochCursorWhere(priorState.openEpoch),
		},
		select: { id: true, salesOrderId: true, openedAt: true },
		orderBy: [{ openedAt: "asc" }, { id: "asc" }],
		take: OPEN_EPOCH_LIMIT * 2,
	});
	let addedOpenEpochs = 0;
	let lastScannedEpoch: (typeof openEpochRows)[number] | undefined;
	for (const epoch of openEpochRows) {
		lastScannedEpoch = epoch;
		if (selectedIds.has(epoch.salesOrderId)) continue;
		selectedIds.add(epoch.salesOrderId);
		candidates.push({
			salesOrderId: epoch.salesOrderId,
			source: "OPEN_EPOCH",
		});
		addedOpenEpochs += 1;
		if (addedOpenEpochs >= OPEN_EPOCH_LIMIT) break;
	}
	const exhaustedFetchedEpochs =
		!lastScannedEpoch || lastScannedEpoch.id === openEpochRows.at(-1)?.id;
	const openEpochWrapped =
		exhaustedFetchedEpochs && openEpochRows.length < OPEN_EPOCH_LIMIT * 2;
	const nextOpenEpochCursor =
		lastScannedEpoch && !openEpochWrapped
			? {
					openedAt: lastScannedEpoch.openedAt.toISOString(),
					id: lastScannedEpoch.id,
				}
			: null;

	const activeCapacity = Math.max(
		0,
		SALES_HANDOFF_RECONCILIATION_BATCH_LIMIT - candidates.length,
	);
	const activeIdWhere = {
		...(activeCursor ? { gt: activeCursor } : {}),
		...(selectedIds.size ? { notIn: [...selectedIds] } : {}),
	};
	const activeRows = activeCapacity
		? await database.salesOrders.findMany({
				where: {
					type: "order",
					deletedAt: null,
					deliveredAt: null,
					...(Object.keys(activeIdWhere).length ? { id: activeIdWhere } : {}),
					OR: [
						{ status: null },
						{ status: { notIn: [...TERMINAL_ORDER_STATUSES] } },
					],
				},
				select: { id: true },
				orderBy: { id: "asc" },
				take: activeCapacity,
			})
		: [];
	for (const order of activeRows) {
		selectedIds.add(order.id);
		candidates.push({ salesOrderId: order.id, source: "ACTIVE_CURSOR" });
	}
	const activeWrapped = activeRows.length < activeCapacity;
	const nextActiveCursor = activeWrapped
		? null
		: (activeRows.at(-1)?.id ?? null);

	return {
		candidates,
		cursorBefore: priorState,
		cursorAfter: {
			activeOrderId: nextActiveCursor,
			openEpoch: nextOpenEpochCursor,
			policyRevisionInProgress:
				activePolicyRevision > 0 && !activeWrapped
					? activePolicyRevision
					: null,
		} satisfies SalesHandoffReconciliationCursorState,
		activeWrapped,
		openEpochWrapped,
		policyRepairIds: policyRepairs.map((repair) => repair.id),
		policyRevision: activePolicyRevision || null,
		policyExposure,
	};
}

async function writeScheduleHistory(
	database: Db,
	input: { value: number; meta: Record<string, unknown> },
) {
	return database.scheduleHistory.create({
		data: {
			eventName: SALES_HANDOFF_RECONCILIATION_EVENT,
			value: input.value,
			meta: input.meta,
		},
	});
}

async function recordWorkerRepair(
	database: Db,
	input: { actorUserId: number | null; reason: string; now: Date },
) {
	const data = {
		status: "open",
		summary: "Sales Handoff recurring reconciliation requires repair.",
		meta: {
			actorUserId: input.actorUserId,
			reason: input.reason,
			lastFailedAt: input.now.toISOString(),
		},
	};
	return database.resolutionCase.upsert({
		where: { id: WORKER_REPAIR_ID },
		update: data,
		create: {
			id: WORKER_REPAIR_ID,
			...data,
			scopeType: WORKER_REPAIR_SCOPE,
			scopeId: "global",
		},
	});
}

async function resolveWorkerRepair(database: Db) {
	return database.resolutionCase.updateMany({
		where: {
			id: WORKER_REPAIR_ID,
			status: "open",
			deletedAt: null,
		},
		data: { status: "resolved" },
	});
}

function message(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}

export async function runSalesHandoffReconciliation(
	database: Db,
	input: {
		now?: Date;
		actorUserId?: number;
		dependencies?: ReconciliationDependencies;
	} = {},
) {
	const now = input.now ?? new Date();
	const startedAt = new Date();
	let actorUserId: number | null = input.actorUserId ?? null;
	let batch: Awaited<
		ReturnType<typeof selectSalesHandoffReconciliationBatch>
	> | null = null;
	let historyWritten = false;
	try {
		actorUserId ??= SALES_HANDOFF_RECONCILIATION_ACTOR_USER_ID;
		const actor = await database.users.findFirst({
			where: {
				id: actorUserId,
				deletedAt: null,
				accessRevokedAt: null,
			},
			select: { id: true },
		});
		if (!actor) {
			throw new Error(
				"Configured Sales Handoff reconciliation actor is not active.",
			);
		}

		batch = await selectSalesHandoffReconciliationBatch(database);
		const dependencies = input.dependencies ?? defaultDependencies;
		const failures: Array<{
			salesOrderId: number;
			source: CandidateSource;
			reason: string;
			policyExposure: SalesHandoffPolicyExposureContext | null;
			durableRepairRecorded: boolean;
		}> = [];
		let reconciled = 0;
		for (const candidate of batch.candidates) {
			const policyExposure =
				candidate.policyExposure ??
				(candidate.source === "ACTIVE_CURSOR" ? batch.policyExposure : null);
			try {
				await dependencies.reconcileOrder(database, {
					salesOrderId: candidate.salesOrderId,
					actorUserId,
					now,
					initialExposureMilestone: policyExposure?.initialExposureMilestone,
					initialExposurePolicyRevision:
						policyExposure?.initialExposurePolicyRevision,
					initialExposurePolicyChangedAt:
						policyExposure?.initialExposurePolicyChangedAt,
				});
				await dependencies.resolveOrderRepairs(database, [
					candidate.salesOrderId,
				]);
				reconciled += 1;
			} catch (error) {
				const reason = message(error);
				let visibleReason = reason;
				let durableRepairRecorded = true;
				try {
					await dependencies.recordOrderRepair(database, {
						salesOrderIds: [candidate.salesOrderId],
						actorUserId,
						source: SALES_HANDOFF_RECONCILIATION_EVENT,
						reason,
						initialExposureMilestone: policyExposure?.initialExposureMilestone,
						initialExposurePolicyRevision:
							policyExposure?.initialExposurePolicyRevision,
						initialExposurePolicyChangedAt:
							policyExposure?.initialExposurePolicyChangedAt,
					});
				} catch (repairError) {
					durableRepairRecorded = false;
					visibleReason = `${reason}; durable order repair marker failed: ${message(repairError)}`;
				}
				failures.push({
					salesOrderId: candidate.salesOrderId,
					source: candidate.source,
					reason: visibleReason,
					policyExposure,
					durableRepairRecorded,
				});
			}
		}

		const unsecuredPolicyExposure = failures.some(
			(failure) =>
				failure.policyExposure != null && !failure.durableRepairRecorded,
		);
		if (
			batch.activeWrapped &&
			batch.policyRepairIds.length &&
			!unsecuredPolicyExposure
		) {
			await database.resolutionCase.updateMany({
				where: {
					id: { in: batch.policyRepairIds },
					status: "open",
					deletedAt: null,
				},
				data: { status: "resolved" },
			});
		}

		const counts = batch.candidates.reduce<Record<CandidateSource, number>>(
			(result, candidate) => {
				result[candidate.source] += 1;
				return result;
			},
			{ REPAIR: 0, OPEN_EPOCH: 0, ACTIVE_CURSOR: 0 },
		);
		const historyMeta = {
			status: failures.length ? "FAILED" : "COMPLETED",
			actorUserId,
			startedAt: startedAt.toISOString(),
			completedAt: new Date().toISOString(),
			batchLimit: SALES_HANDOFF_RECONCILIATION_BATCH_LIMIT,
			scanned: batch.candidates.length,
			reconciled,
			failed: failures.length,
			candidateCounts: counts,
			cursorBefore: batch.cursorBefore,
			cursorAfter: batch.cursorAfter,
			activeWrapped: batch.activeWrapped,
			openEpochWrapped: batch.openEpochWrapped,
			policyRevision: batch.policyRevision,
			failures: failures.slice(0, 25),
		};
		if (failures.length) {
			await writeScheduleHistory(database, {
				value: reconciled,
				meta: historyMeta,
			});
			historyWritten = true;
			const reason = `${failures.length} of ${batch.candidates.length} Sales Handoff reconciliations failed.`;
			await recordWorkerRepair(database, { actorUserId, reason, now });
			throw new Error(reason);
		}
		await resolveWorkerRepair(database);
		await writeScheduleHistory(database, {
			value: reconciled,
			meta: historyMeta,
		});
		historyWritten = true;
		return historyMeta;
	} catch (error) {
		const reason = message(error);
		let workerRepairError: unknown = null;
		try {
			await recordWorkerRepair(database, { actorUserId, reason, now });
		} catch (repairError) {
			workerRepairError = repairError;
		}
		if (!historyWritten) {
			try {
				await writeScheduleHistory(database, {
					value: 0,
					meta: {
						status: "FAILED",
						actorUserId,
						startedAt: startedAt.toISOString(),
						completedAt: new Date().toISOString(),
						scanned: batch?.candidates.length ?? 0,
						reconciled: 0,
						failed: 1,
						reason,
						workerRepairError: workerRepairError
							? message(workerRepairError)
							: null,
						cursorBefore: batch?.cursorBefore ?? null,
						cursorAfter: batch?.cursorAfter ?? null,
					},
				});
			} catch (historyError) {
				logger.error(
					"Sales Handoff failed run history could not be persisted",
					{
						error: historyError,
					},
				);
			}
		}
		logger.error("Sales Handoff recurring reconciliation failed", {
			error,
			workerRepairError,
		});
		throw error;
	}
}

export const salesHandoffReconciliationSchedule = schedules.task({
	id: SALES_HANDOFF_RECONCILIATION_EVENT,
	cron: { pattern: "*/15 * * * *", timezone: "America/New_York" },
	maxDuration: 300,
	queue: { concurrencyLimit: 1 },
	run: () => runSalesHandoffReconciliation(db),
});

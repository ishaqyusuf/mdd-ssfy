import {
	recordTaskRunStartFailure,
	registerTaskRunDiagnostic,
} from "@api/db/queries/task-run-diagnostics";
import type { TRPCContext } from "@api/trpc/init";
import type {
	InventoryImportProjectionHistory,
	InventoryImportProjectionRetry,
	InventoryImportSourceDispositionResult,
} from "@gnd/inventory";
import { queueInventoryToDykeSync } from "@gnd/inventory";
import { TRPCError } from "@trpc/server";

export const INVENTORY_IMPORT_PROJECTION_TASK_NAME =
	"sync-inventory-to-dyke" as const;

const RETRYABLE_PROJECTION_STATUSES = [
	"START_FAILED",
	"FAILED",
	"CANCELED",
	"STALE",
] as const;

type ProjectionMetadata = {
	type: "inventory-import-projection";
	entityId: string;
	entityLabel: string;
	inventoryId: number;
	dispositionAuditEventId: number | null;
	retryOfDiagnosticId: string | null;
};

function projectionMetadata(input: {
	inventoryId: number;
	dispositionAuditEventId?: number | null;
	retryOfDiagnosticId?: string | null;
}): ProjectionMetadata {
	return {
		type: "inventory-import-projection",
		entityId: String(input.inventoryId),
		entityLabel: `Inventory item ${input.inventoryId}`,
		inventoryId: input.inventoryId,
		dispositionAuditEventId: input.dispositionAuditEventId ?? null,
		retryOfDiagnosticId: input.retryOfDiagnosticId ?? null,
	};
}

function readProjectionMetadata(value: unknown): ProjectionMetadata | null {
	if (!value || typeof value !== "object") return null;
	const metadata = value as Record<string, unknown>;
	if (
		metadata.type !== "inventory-import-projection" ||
		typeof metadata.inventoryId !== "number" ||
		!Number.isInteger(metadata.inventoryId) ||
		metadata.inventoryId <= 0
	) {
		return null;
	}

	return projectionMetadata({
		inventoryId: metadata.inventoryId,
		dispositionAuditEventId:
			typeof metadata.dispositionAuditEventId === "number"
				? metadata.dispositionAuditEventId
				: null,
		retryOfDiagnosticId:
			typeof metadata.retryOfDiagnosticId === "string"
				? metadata.retryOfDiagnosticId
				: null,
	});
}

function projectionTitle(inventoryId: number, retry: boolean) {
	return retry
		? `Retry inventory item ${inventoryId} projection`
		: `Project retained inventory item ${inventoryId}`;
}

async function persistProjectionAttempt(
	ctx: TRPCContext,
	input: {
		inventoryId: number;
		dispositionAuditEventId?: number | null;
		retryOfDiagnosticId?: string | null;
		runId: string | null;
	},
) {
	const retry = Boolean(input.retryOfDiagnosticId);
	const metadata = projectionMetadata(input);
	const shared = {
		taskName: INVENTORY_IMPORT_PROJECTION_TASK_NAME,
		title: projectionTitle(input.inventoryId, retry),
		description: retry
			? `Operator retry of inventory item ${input.inventoryId} projection`
			: `Post-disposition projection for inventory item ${input.inventoryId}`,
		source: "inventory-import-control-center",
		environment: process.env.NODE_ENV,
		metadata,
	};

	try {
		if (input.runId) {
			return await registerTaskRunDiagnostic(ctx, {
				...shared,
				runId: input.runId,
			});
		}

		return await recordTaskRunStartFailure(ctx, {
			...shared,
			errorMessage: "Unable to queue inventory-to-Dyke projection.",
			errorName: "InventoryProjectionQueueError",
		});
	} catch (error) {
		console.error("Unable to persist inventory projection attempt", {
			inventoryId: input.inventoryId,
			runId: input.runId,
			error,
		});
		return null;
	}
}

export async function recordInventoryImportProjectionAttempt(
	ctx: TRPCContext,
	result: InventoryImportSourceDispositionResult,
) {
	if (result.status !== "applied") return result;

	const diagnostic = await persistProjectionAttempt(ctx, {
		inventoryId: result.inventoryId,
		dispositionAuditEventId: result.auditEventId,
		runId: result.syncRunId,
	});

	return {
		...result,
		projectionDiagnosticId: diagnostic?.id ?? null,
		projectionDiagnosticRecorded: Boolean(diagnostic),
	};
}

export async function getInventoryImportProjectionHistory(
	ctx: TRPCContext,
	input: InventoryImportProjectionHistory,
) {
	const rows = await ctx.db.taskRunDiagnostic.findMany({
		where: {
			deletedAt: null,
			taskName: INVENTORY_IMPORT_PROJECTION_TASK_NAME,
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: Math.min(100, Math.max(20, input.limit * 5)),
		select: {
			id: true,
			runId: true,
			status: true,
			title: true,
			actorName: true,
			userMessage: true,
			metadata: true,
			startedAt: true,
			finishedAt: true,
			reviewedAt: true,
			createdAt: true,
		},
	});

	const runs = rows
		.map((row) => {
			const metadata = readProjectionMetadata(row.metadata);
			if (!metadata) return null;
			return {
				...row,
				inventoryId: metadata.inventoryId,
				dispositionAuditEventId: metadata.dispositionAuditEventId,
				retryOfDiagnosticId: metadata.retryOfDiagnosticId,
				canRetry:
					RETRYABLE_PROJECTION_STATUSES.includes(
						row.status as (typeof RETRYABLE_PROJECTION_STATUSES)[number],
					) && !row.reviewedAt,
			};
		})
		.filter((run): run is NonNullable<typeof run> => Boolean(run))
		.slice(0, input.limit);

	return {
		runs,
		limit: input.limit,
		meta: {
			returned: runs.length,
			queued: runs.filter((run) => run.status === "RUNNING").length,
			succeeded: runs.filter((run) => run.status === "SUCCEEDED").length,
			failed: runs.filter((run) =>
				["START_FAILED", "FAILED", "STALE"].includes(run.status),
			).length,
			retryable: runs.filter((run) => run.canRetry).length,
		},
	};
}

export async function retryInventoryImportProjection(
	ctx: TRPCContext,
	input: InventoryImportProjectionRetry,
) {
	if (!ctx.userId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication is required to retry inventory projection.",
		});
	}

	const previous = await ctx.db.taskRunDiagnostic.findFirst({
		where: {
			id: input.diagnosticId,
			deletedAt: null,
			taskName: INVENTORY_IMPORT_PROJECTION_TASK_NAME,
			status: { in: [...RETRYABLE_PROJECTION_STATUSES] },
		},
		select: {
			id: true,
			status: true,
			metadata: true,
			reviewedAt: true,
		},
	});
	const metadata = readProjectionMetadata(previous?.metadata);
	if (!previous || !metadata) {
		return {
			status: "skipped",
			reason: "not_found_or_not_retryable",
		} as const;
	}
	if (previous.reviewedAt) {
		return {
			status: "skipped",
			reason: "already_retried",
		} as const;
	}

	const inventory = await ctx.db.inventory.findFirst({
		where: {
			id: metadata.inventoryId,
			deletedAt: null,
		},
		select: {
			id: true,
		},
	});
	if (!inventory) {
		return {
			status: "skipped",
			reason: "inventory_not_active",
		} as const;
	}

	const claimed = await ctx.db.taskRunDiagnostic.updateMany({
		where: {
			id: previous.id,
			deletedAt: null,
			status: previous.status,
			reviewedAt: null,
		},
		data: {
			reviewedAt: new Date(),
			reviewedById: ctx.userId,
		},
	});
	if (claimed.count !== 1) {
		return {
			status: "skipped",
			reason: "already_retried",
		} as const;
	}

	const run = await queueInventoryToDykeSync({
		inventoryId: inventory.id,
		source: "repair",
	});
	const diagnostic = await persistProjectionAttempt(ctx, {
		inventoryId: inventory.id,
		dispositionAuditEventId: metadata.dispositionAuditEventId,
		retryOfDiagnosticId: previous.id,
		runId: run?.id ?? null,
	});

	return {
		status: run ? ("queued" as const) : ("queue_failed" as const),
		inventoryId: inventory.id,
		runId: run?.id ?? null,
		projectionDiagnosticId: diagnostic?.id ?? null,
		projectionDiagnosticRecorded: Boolean(diagnostic),
	};
}

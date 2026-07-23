import {
	recordTaskRunStartFailure,
	registerTaskRunDiagnostic,
} from "@api/db/queries/task-run-diagnostics";
import type { TRPCContext } from "@api/trpc/init";
import type {
	InventoryImportRun,
	InventoryImportRunHistory,
} from "@gnd/inventory/schema";
import { tasks } from "@trigger.dev/sdk/v3";
import { TRPCError } from "@trpc/server";

export const INVENTORY_IMPORT_TASK_NAMES = [
	"run-inventory-full-import-now",
	"run-inventory-full-import-test",
] as const;

function requireInventoryImportActor(ctx: TRPCContext) {
	if (!ctx.userId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication is required to manage inventory imports.",
		});
	}
	return ctx.userId;
}

function getInventoryImportTaskName(compare: boolean) {
	return compare
		? INVENTORY_IMPORT_TASK_NAMES[1]
		: INVENTORY_IMPORT_TASK_NAMES[0];
}

function getRunTitle(input: InventoryImportRun) {
	if (input.compare) return "Inventory import system check";
	if (input.reset) return "Inventory full refresh";
	return "Inventory update";
}

function getRunDescription(input: InventoryImportRun) {
	const categoryLabel = input.categoryId
		? `category ${input.categoryId}`
		: `${input.scope} scope`;
	return `${categoryLabel} using the ${input.strategy} strategy`;
}

function getRunMetadata(
	taskName: (typeof INVENTORY_IMPORT_TASK_NAMES)[number],
	input: InventoryImportRun,
) {
	return {
		taskName,
		type: "inventory-import",
		entityId: input.categoryId ?? input.scope,
		entityLabel: input.categoryId
			? `Inventory category ${input.categoryId}`
			: `${input.scope} inventory scope`,
		categoryId: input.categoryId ?? null,
		scope: input.scope,
		strategy: input.strategy,
		compare: input.compare,
		reset: input.reset,
		runSource: input.source,
	};
}

async function safelyRecordStartFailure(
	ctx: TRPCContext,
	input: InventoryImportRun,
	taskName: (typeof INVENTORY_IMPORT_TASK_NAMES)[number],
	error: unknown,
) {
	try {
		await recordTaskRunStartFailure(ctx, {
			taskName,
			title: getRunTitle(input),
			description: getRunDescription(input),
			source: "inventory-import-control-center",
			environment: process.env.NODE_ENV,
			errorMessage:
				error instanceof Error
					? error.message
					: "Unable to queue inventory import",
			errorName: error instanceof Error ? error.name : undefined,
			metadata: getRunMetadata(taskName, input),
		});
	} catch (diagnosticError) {
		console.error("Unable to record inventory import start failure", {
			diagnosticError,
		});
	}
}

export async function queueInventoryImportRun(
	ctx: TRPCContext,
	input: InventoryImportRun,
) {
	requireInventoryImportActor(ctx);
	const taskName = getInventoryImportTaskName(input.compare);
	const payload = {
		categoryId: input.categoryId,
		scope: input.scope,
		strategy: input.strategy,
		compare: input.compare,
		reset: input.reset,
		source: input.source,
	};

	let event: Awaited<ReturnType<typeof tasks.trigger>>;
	try {
		event = await tasks.trigger(taskName, payload);
	} catch (error) {
		await safelyRecordStartFailure(ctx, input, taskName, error);
		throw error;
	}

	let diagnosticRecorded = false;
	try {
		await registerTaskRunDiagnostic(ctx, {
			runId: event.id,
			taskName,
			title: getRunTitle(input),
			description: getRunDescription(input),
			source: "inventory-import-control-center",
			environment: process.env.NODE_ENV,
			metadata: getRunMetadata(taskName, input),
		});
		diagnosticRecorded = true;
	} catch (error) {
		console.error("Unable to persist inventory import run history", {
			runId: event.id,
			error,
		});
	}

	return {
		...event,
		diagnosticRecorded,
	};
}

export async function getInventoryImportRunHistory(
	ctx: TRPCContext,
	input: InventoryImportRunHistory,
) {
	requireInventoryImportActor(ctx);

	const runs = await ctx.db.taskRunDiagnostic.findMany({
		where: {
			deletedAt: null,
			taskName: {
				in: [...INVENTORY_IMPORT_TASK_NAMES],
			},
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: input.limit,
		select: {
			id: true,
			runId: true,
			status: true,
			taskName: true,
			title: true,
			description: true,
			actorName: true,
			userMessage: true,
			metadata: true,
			startedAt: true,
			finishedAt: true,
			createdAt: true,
		},
	});

	return {
		runs,
		limit: input.limit,
	};
}

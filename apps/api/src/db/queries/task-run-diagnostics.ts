import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { TRPCError } from "@trpc/server";

type DiagnosticStatus =
	| "RUNNING"
	| "SUCCEEDED"
	| "FAILED"
	| "CANCELED"
	| "STALE"
	| "START_FAILED";

type TaskRunMetadata = {
	taskName?: string | null;
	type?: string | null;
	entityId?: string | number | null;
	entityLabel?: string | null;
	[key: string]: unknown;
};

type TriggerRunLike = {
	id?: string;
	taskIdentifier?: string | null;
	status?: unknown;
	attemptCount?: unknown;
	isQueued?: unknown;
	isExecuting?: unknown;
	isCompleted?: unknown;
	isSuccess?: unknown;
	isFailed?: unknown;
	isCancelled?: unknown;
	createdAt?: unknown;
	startedAt?: unknown;
	updatedAt?: unknown;
	finishedAt?: unknown;
	output?: unknown;
	error?: unknown;
};

export type TaskRunRetriever = (
	runId: string,
) => Promise<TriggerRunLike | null | undefined>;

type RegisterTaskRunDiagnosticInput = {
	runId: string;
	taskName: string;
	title?: string;
	description?: string;
	source?: string;
	environment?: string;
	metadata?: TaskRunMetadata;
	startedAt?: Date;
};

type RecordTaskRunStartFailureInput = {
	taskName: string;
	title?: string;
	description?: string;
	source?: string;
	environment?: string;
	errorMessage?: string;
	errorName?: string;
	metadata?: TaskRunMetadata;
};

type FinalizeTaskRunDiagnosticInput = {
	runId: string;
	observedStatus?: "COMPLETED" | "FAILED" | "CANCELED";
	errorMessage?: string;
	metadata?: TaskRunMetadata;
	finishedAt?: Date;
};

type ListTaskRunDiagnosticsInput = {
	page?: number;
	size?: number;
	status?: DiagnosticStatus;
	taskName?: string;
	q?: string;
	entityType?: string;
	entityId?: string;
	from?: Date;
	to?: Date;
};

const diagnosticSelect = {
	id: true,
	runId: true,
	status: true,
	taskName: true,
	taskFamily: true,
	title: true,
	description: true,
	source: true,
	environment: true,
	actorId: true,
	actorName: true,
	actorEmail: true,
	entityType: true,
	entityId: true,
	entityLabel: true,
	userMessage: true,
	internalError: true,
	errorName: true,
	outputSummary: true,
	metadata: true,
	startedAt: true,
	finishedAt: true,
	lastSyncedAt: true,
	reviewedAt: true,
	reviewedById: true,
	createdAt: true,
	updatedAt: true,
	actor: {
		select: {
			id: true,
			name: true,
			email: true,
		},
	},
	reviewedBy: {
		select: {
			id: true,
			name: true,
			email: true,
		},
	},
} satisfies Prisma.TaskRunDiagnosticSelect;

async function requireActor(ctx: TRPCContext) {
	if (!ctx.userId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Unauthorized",
		});
	}

	const actor = await ctx.db.users.findFirst({
		where: {
			id: ctx.userId,
		},
		select: {
			id: true,
			name: true,
			email: true,
			roles: {
				where: {
					deletedAt: null,
				},
				select: {
					role: {
						select: {
							name: true,
						},
					},
				},
			},
		},
	});

	if (!actor) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Unauthorized",
		});
	}

	return actor;
}

async function requireSuperAdmin(ctx: TRPCContext) {
	const actor = await requireActor(ctx);
	const role = actor.roles?.[0]?.role?.name;

	if (role?.toLowerCase() !== "super admin") {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only Super Admin can access task diagnostics.",
		});
	}

	return actor;
}

export async function registerTaskRunDiagnostic(
	ctx: TRPCContext,
	input: RegisterTaskRunDiagnosticInput,
) {
	const actor = await requireActor(ctx);
	const metadata = normalizeMetadata(input.metadata, input.taskName);
	const now = new Date();

	return ctx.db.taskRunDiagnostic.upsert({
		where: {
			runId: input.runId,
		},
		create: {
			runId: input.runId,
			status: "RUNNING",
			taskName: input.taskName,
			taskFamily: getTaskFamily(metadata, input.taskName),
			title: truncate(input.title, 500),
			description: truncate(input.description, 2000),
			source: truncate(input.source, 120),
			environment: truncate(input.environment, 80),
			actorId: actor.id,
			actorName: truncate(actor.name, 255),
			actorEmail: truncate(actor.email, 255),
			entityType: truncate(metadata.type, 120),
			entityId:
				metadata.entityId == null ? null : truncate(metadata.entityId, 255),
			entityLabel: truncate(metadata.entityLabel, 500),
			metadata: toJsonValue(metadata),
			startedAt: input.startedAt ?? now,
			lastSyncedAt: now,
		},
		update: {
			status: "RUNNING",
			taskName: input.taskName,
			taskFamily: getTaskFamily(metadata, input.taskName),
			title: truncate(input.title, 500),
			description: truncate(input.description, 2000),
			source: truncate(input.source, 120),
			environment: truncate(input.environment, 80),
			actorId: actor.id,
			actorName: truncate(actor.name, 255),
			actorEmail: truncate(actor.email, 255),
			entityType: truncate(metadata.type, 120),
			entityId:
				metadata.entityId == null ? null : truncate(metadata.entityId, 255),
			entityLabel: truncate(metadata.entityLabel, 500),
			metadata: toJsonValue(metadata),
			startedAt: input.startedAt ?? now,
			lastSyncedAt: now,
			deletedAt: null,
		},
		select: diagnosticSelect,
	});
}

export async function recordTaskRunStartFailure(
	ctx: TRPCContext,
	input: RecordTaskRunStartFailureInput,
) {
	const actor = await requireActor(ctx);
	const metadata = normalizeMetadata(input.metadata, input.taskName);
	const now = new Date();

	return ctx.db.taskRunDiagnostic.create({
		data: {
			status: "START_FAILED",
			taskName: input.taskName,
			taskFamily: getTaskFamily(metadata, input.taskName),
			title: truncate(input.title, 500),
			description: truncate(input.description, 2000),
			source: truncate(input.source, 120),
			environment: truncate(input.environment, 80),
			actorId: actor.id,
			actorName: truncate(actor.name, 255),
			actorEmail: truncate(actor.email, 255),
			entityType: truncate(metadata.type, 120),
			entityId:
				metadata.entityId == null ? null : truncate(metadata.entityId, 255),
			entityLabel: truncate(metadata.entityLabel, 500),
			userMessage: "Unable to start this background task.",
			internalError: truncate(input.errorMessage, 4000),
			errorName: truncate(input.errorName, 255),
			metadata: toJsonValue(metadata),
			startedAt: now,
			finishedAt: now,
			lastSyncedAt: now,
		},
		select: diagnosticSelect,
	});
}

export async function finalizeTaskRunDiagnosticWithRetriever(
	ctx: TRPCContext,
	input: FinalizeTaskRunDiagnosticInput,
	retrieveRun: TaskRunRetriever,
) {
	await requireActor(ctx);

	const run: TriggerRunLike = (await retrieveRun(input.runId).catch((error) => {
		return {
			id: input.runId,
			status: input.observedStatus ?? "FAILED",
			error,
		} satisfies TriggerRunLike;
	})) ?? {
		id: input.runId,
		status: input.observedStatus ?? "FAILED",
	};
	const status = resolveDiagnosticStatus(run, input.observedStatus);
	const taskName = truncate(
		(run?.taskIdentifier as string | undefined) ??
			input.metadata?.taskName ??
			"unknown-task",
		255,
	) as string;
	const metadata = normalizeMetadata(input.metadata, taskName);
	const now = new Date();
	const internalError = getDiagnosticErrorMessage(run, input.errorMessage);
	const finishedAt =
		toDate(run?.finishedAt) ??
		input.finishedAt ??
		(status === "RUNNING" ? null : now);
	const startedAt =
		toDate(run?.startedAt) ?? toDate(run?.createdAt) ?? undefined;

	return ctx.db.taskRunDiagnostic.upsert({
		where: {
			runId: input.runId,
		},
		create: {
			runId: input.runId,
			status,
			taskName,
			taskFamily: getTaskFamily(metadata, taskName),
			entityType: truncate(metadata.type, 120),
			entityId:
				metadata.entityId == null ? null : truncate(metadata.entityId, 255),
			entityLabel: truncate(metadata.entityLabel, 500),
			userMessage: getUserMessage(status),
			internalError: status === "FAILED" ? truncate(internalError, 4000) : null,
			errorName: truncate(getErrorName(run?.error), 255),
			outputSummary: summarizeRunOutput(run?.output),
			metadata: toJsonValue(metadata),
			startedAt,
			finishedAt,
			lastSyncedAt: now,
		},
		update: {
			status,
			taskName,
			taskFamily: getTaskFamily(metadata, taskName),
			entityType: truncate(metadata.type, 120),
			entityId:
				metadata.entityId == null ? null : truncate(metadata.entityId, 255),
			entityLabel: truncate(metadata.entityLabel, 500),
			userMessage: getUserMessage(status),
			internalError: status === "FAILED" ? truncate(internalError, 4000) : null,
			errorName: truncate(getErrorName(run?.error), 255),
			outputSummary: summarizeRunOutput(run?.output),
			metadata: toJsonValue(metadata),
			startedAt,
			finishedAt,
			lastSyncedAt: now,
			deletedAt: null,
		},
		select: diagnosticSelect,
	});
}

export async function listTaskRunDiagnostics(
	ctx: TRPCContext,
	input: ListTaskRunDiagnosticsInput,
) {
	await requireSuperAdmin(ctx);

	const page = Math.max(1, input.page || 1);
	const size = Math.min(100, Math.max(1, input.size || 20));
	const where: Prisma.TaskRunDiagnosticWhereInput = {
		deletedAt: null,
	};

	if (input.status) {
		where.status = input.status;
	}

	if (input.taskName) {
		where.taskName = input.taskName;
	}

	if (input.entityType) {
		where.entityType = input.entityType;
	}

	if (input.entityId) {
		where.entityId = input.entityId;
	}

	if (input.from || input.to) {
		where.createdAt = {
			...(input.from ? { gte: input.from } : {}),
			...(input.to ? { lte: input.to } : {}),
		};
	}

	const query = input.q?.trim();
	if (query) {
		where.OR = [
			{ runId: { contains: query } },
			{ taskName: { contains: query } },
			{ title: { contains: query } },
			{ entityLabel: { contains: query } },
			{ actorName: { contains: query } },
			{ actorEmail: { contains: query } },
			{ internalError: { contains: query } },
		];
	}

	const [list, total] = await Promise.all([
		ctx.db.taskRunDiagnostic.findMany({
			where,
			orderBy: {
				createdAt: "desc",
			},
			take: size,
			skip: (page - 1) * size,
			select: diagnosticSelect,
		}),
		ctx.db.taskRunDiagnostic.count({
			where,
		}),
	]);

	return {
		list,
		total,
		page,
		size,
	};
}

export async function getTaskRunDiagnostic(ctx: TRPCContext, id: string) {
	await requireSuperAdmin(ctx);

	const diagnostic = await ctx.db.taskRunDiagnostic.findFirst({
		where: {
			id,
			deletedAt: null,
		},
		select: diagnosticSelect,
	});

	if (!diagnostic) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Task diagnostic not found.",
		});
	}

	return diagnostic;
}

export async function markTaskRunDiagnosticReviewed(
	ctx: TRPCContext,
	id: string,
) {
	const actor = await requireSuperAdmin(ctx);

	return ctx.db.taskRunDiagnostic.update({
		where: {
			id,
		},
		data: {
			reviewedAt: new Date(),
			reviewedById: actor.id,
		},
		select: diagnosticSelect,
	});
}

function resolveDiagnosticStatus(
	run: TriggerRunLike | null | undefined,
	observedStatus?: FinalizeTaskRunDiagnosticInput["observedStatus"],
): DiagnosticStatus {
	if (observedStatus === "FAILED") return "FAILED";
	if (observedStatus === "CANCELED") return "CANCELED";
	if (observedStatus === "COMPLETED") return "SUCCEEDED";

	const status = String(run?.status || "").toUpperCase();

	if (
		run?.isFailed === true ||
		status === "FAILED" ||
		status === "ERRORED" ||
		status === "CRASHED" ||
		status === "TIMED_OUT"
	) {
		return "FAILED";
	}

	if (run?.isCancelled === true || status === "CANCELED") {
		return "CANCELED";
	}

	if (
		run?.isSuccess === true ||
		run?.isCompleted === true ||
		status === "COMPLETED" ||
		status === "SUCCESS"
	) {
		return "SUCCEEDED";
	}

	return "RUNNING";
}

function getUserMessage(status: DiagnosticStatus) {
	if (status === "SUCCEEDED") return "The background task completed.";
	if (status === "CANCELED") return "The background task was cancelled.";
	if (status === "START_FAILED") return "Unable to start this background task.";
	if (status === "FAILED") return "The background task failed.";
	if (status === "STALE")
		return "The background task stopped reporting status.";
	return "The background task is running.";
}

function normalizeMetadata(
	metadata: TaskRunMetadata | undefined,
	taskName: string,
) {
	const normalized: TaskRunMetadata = {
		...(metadata && typeof metadata === "object" ? metadata : {}),
		taskName: metadata?.taskName ?? taskName,
	};

	return shrinkJson(normalized) as TaskRunMetadata;
}

function getTaskFamily(metadata: TaskRunMetadata, taskName: string) {
	return truncate(metadata.type ?? taskName, 120);
}

function summarizeRunOutput(
	output: unknown,
): Prisma.InputJsonValue | undefined {
	if (!output || typeof output !== "object") return undefined;

	const record = output as Record<string, unknown>;
	const summary: Record<string, unknown> = {};

	if (record.emails && typeof record.emails === "object") {
		const emails = record.emails as Record<string, unknown>;
		summary.emails = {
			sent: toNumber(emails.sent),
			failed: toNumber(emails.failed),
			skipped: toNumber(emails.skipped),
			providerStatus: truncate(emails.providerStatus, 120),
			errorCode: truncate(emails.errorCode, 120),
		};
	}

	for (const key of ["status", "count", "processed", "failed", "skipped"]) {
		if (key in record) {
			const value = record[key];
			summary[key] =
				typeof value === "number" || typeof value === "boolean"
					? value
					: truncate(value, 255);
		}
	}

	const compact = Object.keys(summary).length ? summary : { present: true };
	return toJsonValue(shrinkJson(compact));
}

function getDiagnosticErrorMessage(
	run: TriggerRunLike | null | undefined,
	fallback?: string,
) {
	return normalizeErrorMessage(run?.error) ?? fallback ?? null;
}

function normalizeErrorMessage(error: unknown) {
	if (!error) return null;
	if (typeof error === "string") return error;
	if (error instanceof Error) return error.message;
	if (typeof error !== "object") return null;

	const maybeMessage = (error as { message?: unknown }).message;
	if (typeof maybeMessage === "string" && maybeMessage.trim()) {
		return maybeMessage;
	}

	const maybeName = (error as { name?: unknown }).name;
	if (typeof maybeName === "string" && maybeName.trim()) {
		return maybeName;
	}

	return null;
}

function getErrorName(error: unknown) {
	if (!error || typeof error !== "object") return undefined;
	const name = (error as { name?: unknown }).name;
	return typeof name === "string" ? name : undefined;
}

function toDate(value: unknown) {
	if (!value) return null;
	if (value instanceof Date)
		return Number.isNaN(value.getTime()) ? null : value;
	if (typeof value === "string" || typeof value === "number") {
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? null : date;
	}

	return null;
}

function toNumber(value: unknown) {
	const number = Number(value ?? 0);
	return Number.isFinite(number) ? number : 0;
}

function truncate(value: unknown, max: number) {
	if (value == null) return undefined;
	const stringValue = String(value);
	return stringValue.length > max ? stringValue.slice(0, max) : stringValue;
}

function shrinkJson(value: unknown): unknown {
	const serialized = JSON.stringify(value);
	if (serialized.length <= 4000) return value;

	return {
		truncated: true,
		preview: serialized.slice(0, 3900),
	};
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
	return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

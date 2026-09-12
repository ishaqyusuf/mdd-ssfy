import {
	type SalesRequestGenerationCompleteEvent,
	type SalesRequestGenerationRunForReport,
	type SalesRequestGenerationStartEvent,
	aggregateSalesRequestGenerationRuns,
	normalizeSalesRequestGenerationChangedFieldCategories,
	normalizeSalesRequestGenerationIssueCategories,
	normalizeSalesRequestGenerationIssueCounts,
	normalizeSalesRequestGenerationStatus,
} from "@api/services/sales-request-telemetry";
import {
	SALES_REQUEST_GENERATION_RETENTION_DAYS,
	anonymizeSalesRequestGenerationRunsForUser,
	purgeExpiredSalesRequestGenerationRuns,
} from "@gnd/db/queries";
import { TRPCError } from "@trpc/server";

const DAY_MS = 24 * 60 * 60 * 1_000;
export const SALES_REQUEST_GENERATION_REPORT_MAX_ROWS = 10_000;
export {
	SALES_REQUEST_GENERATION_RETENTION_DAYS,
	anonymizeSalesRequestGenerationRunsForUser,
	purgeExpiredSalesRequestGenerationRuns,
};

type TelemetryRow = SalesRequestGenerationRunForReport & {
	generationId: string;
	actorUserId: number | null;
	retentionUntil: Date;
	deletedAt: Date | null;
	completedAt?: Date | null;
	applyOutcome?: string | null;
	applyAt?: Date | null;
	saveDraftOutcome?: string | null;
	saveDraftAt?: Date | null;
	saveFinalOutcome?: string | null;
	saveFinalAt?: Date | null;
	feedbackOutcome?: string | null;
	feedbackAt?: Date | null;
	feedbackIssueCategories?: unknown;
	feedbackChangedFieldCategories?: unknown;
	correctionMs?: number | null;
};

type TelemetryModel = {
	create: (args: { data: Record<string, unknown> }) => Promise<TelemetryRow>;
	findUnique: (args: {
		where: Record<string, unknown>;
	}) => Promise<TelemetryRow | null>;
	findMany: (args: {
		where: Record<string, unknown>;
		orderBy?: Record<string, unknown>;
		take?: number;
		select?: Record<string, unknown>;
	}) => Promise<TelemetryRow[]>;
	updateMany: (args: {
		where: Record<string, unknown>;
		data: Record<string, unknown>;
	}) => Promise<{ count: number }>;
	deleteMany: (args: { where: Record<string, unknown> }) => Promise<{
		count: number;
	}>;
};

export type SalesRequestTelemetryDatabase = {
	salesRequestGenerationRun: TelemetryModel;
};

function boundedToken(value: string, maximum: number, fallback: string) {
	const token = value.trim();
	if (!token || !/^[A-Za-z0-9._:-]+$/.test(token)) return fallback;
	return token.slice(0, maximum);
}

function boundedCount(value: unknown, maximum = 100_000) {
	if (!Number.isInteger(value) || (value as number) < 0) return null;
	return Math.min(value as number, maximum);
}

function boundedLatency(value: unknown) {
	return boundedCount(value, 300_000);
}

function boundedTokens(value: unknown) {
	return boundedCount(value, 100_000_000);
}

function boundedIssueCounts(value: unknown) {
	return normalizeSalesRequestGenerationIssueCounts(value);
}

function safeJson(value: unknown) {
	return JSON.parse(JSON.stringify(value));
}

function unavailableGenerationRun(): never {
	throw new TRPCError({
		code: "NOT_FOUND",
		message: "Generation run is unavailable.",
	});
}

function conflictGenerationOutcome(): never {
	throw new TRPCError({
		code: "CONFLICT",
		message: "Generation outcome has already been recorded.",
	});
}

export type CreateSalesRequestGenerationRunInput = {
	actorUserId: number;
	generationId: string;
	scope: string;
	configurationRevision: string;
	provider: string;
	model: string;
	hasText: boolean;
	startedAt: Date;
};

export async function createSalesRequestGenerationRun(
	db: SalesRequestTelemetryDatabase,
	input: CreateSalesRequestGenerationRunInput,
) {
	const startedAt = input.startedAt;
	return db.salesRequestGenerationRun.create({
		data: {
			generationId: boundedToken(input.generationId, 36, "invalid-generation"),
			actorUserId: input.actorUserId,
			scope: boundedToken(input.scope, 191, "unknown"),
			configurationRevision: boundedToken(
				input.configurationRevision,
				128,
				"unknown",
			),
			provider: boundedToken(input.provider, 32, "unknown"),
			model: boundedToken(input.model, 100, "unknown"),
			status: "started",
			hasText: input.hasText === true,
			startedAt,
			retentionUntil: new Date(
				startedAt.getTime() + SALES_REQUEST_GENERATION_RETENTION_DAYS * DAY_MS,
			),
		},
	});
}

export type CompleteSalesRequestGenerationRunInput =
	SalesRequestGenerationCompleteEvent & {
		actorUserId: number;
	};

export async function completeSalesRequestGenerationRun(
	db: SalesRequestTelemetryDatabase,
	input: CompleteSalesRequestGenerationRunInput,
) {
	const data: Record<string, unknown> = {
		status: normalizeSalesRequestGenerationStatus(input.status),
		completedAt: input.completedAt,
		latencyMs: boundedLatency(input.latencyMs),
	};
	if (input.provider)
		data.provider = boundedToken(input.provider, 32, "unknown");
	if (input.model) data.model = boundedToken(input.model, 100, "unknown");
	if (input.promptVersion)
		data.promptVersion = boundedToken(input.promptVersion, 64, "unknown");
	if (input.schemaVersion !== undefined)
		data.schemaVersion = boundedCount(input.schemaVersion, 100);
	if (input.inputTokens !== undefined)
		data.inputTokens = boundedTokens(input.inputTokens);
	if (input.outputTokens !== undefined)
		data.outputTokens = boundedTokens(input.outputTokens);
	if (input.issueCounts)
		data.issueCounts = safeJson(boundedIssueCounts(input.issueCounts));
	if (input.failureStage)
		data.failureStage = boundedToken(input.failureStage, 32, "unknown");

	return db.salesRequestGenerationRun.updateMany({
		where: {
			generationId: input.generationId,
			actorUserId: input.actorUserId,
			deletedAt: null,
		},
		data,
	});
}

export type SalesRequestGenerationOutcome =
	| {
			kind: "apply";
			outcome: "applied" | "blocked" | "stale" | "unavailable";
	  }
	| {
			kind: "save";
			stage: "draft" | "final";
			outcome: "saved" | "failed";
	  }
	| {
			kind: "feedback";
			outcome: "accepted" | "accepted-with-edits" | "rejected";
			issueCategories: string[];
			changedFieldCategories: string[];
	  };

export type RecordSalesRequestGenerationOutcomeInput =
	SalesRequestGenerationOutcome & {
		actorUserId: number;
		generationId: string;
		now?: Date;
	};

function getOutcomeState(
	run: TelemetryRow,
	input: SalesRequestGenerationOutcome,
) {
	if (input.kind === "apply") {
		return { field: "applyOutcome", value: run.applyOutcome ?? null };
	}
	if (input.kind === "save") {
		const field =
			input.stage === "draft" ? "saveDraftOutcome" : "saveFinalOutcome";
		return { field, value: run[field] ?? null };
	}
	return {
		field: "feedbackOutcome",
		value: run.feedbackOutcome ?? null,
		issueCategories: normalizeSalesRequestGenerationIssueCategories(
			run.feedbackIssueCategories,
		),
		changedFieldCategories:
			normalizeSalesRequestGenerationChangedFieldCategories(
				run.feedbackChangedFieldCategories,
			),
	};
}

function outcomeMatchesExisting(
	run: TelemetryRow,
	input: SalesRequestGenerationOutcome,
) {
	const state = getOutcomeState(run, input);
	if (state.value !== input.outcome) return false;
	if (input.kind !== "feedback") return true;
	return (
		JSON.stringify(state.issueCategories) ===
			JSON.stringify(
				normalizeSalesRequestGenerationIssueCategories(input.issueCategories),
			) &&
		JSON.stringify(state.changedFieldCategories) ===
			JSON.stringify(
				normalizeSalesRequestGenerationChangedFieldCategories(
					input.changedFieldCategories,
				),
			)
	);
}

function outcomeData(
	input: SalesRequestGenerationOutcome,
	now: Date,
	run: TelemetryRow,
) {
	const data: Record<string, unknown> = {};
	if (input.kind === "apply") {
		data.applyOutcome = input.outcome;
		data.applyAt = now;
	} else if (input.kind === "save") {
		const prefix = input.stage === "draft" ? "saveDraft" : "saveFinal";
		data[`${prefix}Outcome`] = input.outcome;
		data[`${prefix}At`] = now;
	} else {
		data.feedbackOutcome = input.outcome;
		data.feedbackAt = now;
		data.feedbackIssueCategories = safeJson(
			normalizeSalesRequestGenerationIssueCategories(input.issueCategories),
		);
		data.feedbackChangedFieldCategories = safeJson(
			normalizeSalesRequestGenerationChangedFieldCategories(
				input.changedFieldCategories,
			),
		);
	}

	const successfulOutcome =
		(input.kind === "apply" && input.outcome === "applied") ||
		(input.kind === "save" && input.outcome === "saved");
	if (successfulOutcome && run.correctionMs == null && run.completedAt) {
		data.correctionMs = Math.max(
			0,
			Math.min(now.getTime() - run.completedAt.getTime(), 86_400_000),
		);
	}
	return data;
}

export async function recordSalesRequestGenerationOutcome(
	db: SalesRequestTelemetryDatabase,
	input: RecordSalesRequestGenerationOutcomeInput,
) {
	const now = input.now ?? new Date();
	const run = await db.salesRequestGenerationRun.findUnique({
		where: { generationId: input.generationId },
	});
	if (
		!run ||
		run.actorUserId !== input.actorUserId ||
		run.deletedAt !== null ||
		run.retentionUntil.getTime() <= now.getTime()
	) {
		return unavailableGenerationRun();
	}

	const state = getOutcomeState(run, input);
	if (state.value !== null) {
		if (outcomeMatchesExisting(run, input)) {
			return {
				generationId: input.generationId,
				kind: input.kind,
				recorded: false,
				duplicate: true,
			};
		}
		return conflictGenerationOutcome();
	}

	const data = outcomeData(input, now, run);
	const updated = await db.salesRequestGenerationRun.updateMany({
		where: {
			generationId: input.generationId,
			actorUserId: input.actorUserId,
			deletedAt: null,
			retentionUntil: { gt: now },
			[state.field]: null,
		},
		data,
	});
	if (updated.count) {
		return {
			generationId: input.generationId,
			kind: input.kind,
			recorded: true,
			duplicate: false,
		};
	}

	const latest = await db.salesRequestGenerationRun.findUnique({
		where: { generationId: input.generationId },
	});
	if (
		!latest ||
		latest.actorUserId !== input.actorUserId ||
		latest.deletedAt !== null ||
		latest.retentionUntil.getTime() <= now.getTime()
	) {
		return unavailableGenerationRun();
	}
	if (outcomeMatchesExisting(latest, input)) {
		return {
			generationId: input.generationId,
			kind: input.kind,
			recorded: false,
			duplicate: true,
		};
	}
	return conflictGenerationOutcome();
}

export type SalesRequestGenerationPilotSummaryInput = {
	days?: number;
	now?: Date;
};

export async function getSalesRequestGenerationPilotSummary(
	db: SalesRequestTelemetryDatabase,
	input: SalesRequestGenerationPilotSummaryInput = {},
) {
	const now = input.now ?? new Date();
	const days = Math.max(1, Math.min(Math.trunc(input.days ?? 30), 90));
	const from = new Date(now.getTime() - days * DAY_MS);
	const rows = await db.salesRequestGenerationRun.findMany({
		where: {
			createdAt: { gte: from, lte: now },
			retentionUntil: { gt: now },
			deletedAt: null,
		},
		orderBy: { createdAt: "desc" },
		take: SALES_REQUEST_GENERATION_REPORT_MAX_ROWS,
		select: {
			provider: true,
			model: true,
			status: true,
			inputTokens: true,
			outputTokens: true,
			issueCounts: true,
			applyOutcome: true,
			saveDraftOutcome: true,
			saveFinalOutcome: true,
			feedbackOutcome: true,
			feedbackIssueCategories: true,
			feedbackChangedFieldCategories: true,
			correctionMs: true,
			createdAt: true,
		},
	});
	return {
		period: { days, from, to: now },
		...aggregateSalesRequestGenerationRuns(rows),
	};
}

export type SalesRequestGenerationStartPersistence =
	SalesRequestGenerationStartEvent & { actorUserId: number };

import { deriveSalesRequestPilotEvidence } from "@api/services/sales-request-pilot-evidence";
import {
	type SalesRequestGenerationCompleteEvent,
	type SalesRequestGenerationPilotAuthority,
	type SalesRequestGenerationRunForReport,
	type SalesRequestGenerationStartEvent,
	aggregateSalesRequestGenerationRuns,
	aggregateSalesRequestProviderDiagnostics,
	deriveSalesRequestGenerationPilotAuthority,
	getSalesRequestGenerationPilotAuthorityBlockers,
	normalizeSalesRequestComplexityStratum,
	normalizeSalesRequestComplexityVersion,
	normalizeSalesRequestGenerationChangedFieldCategories,
	normalizeSalesRequestGenerationIssueCategories,
	normalizeSalesRequestGenerationIssueCounts,
	normalizeSalesRequestGenerationIssuePayload,
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
export const SALES_REQUEST_PROVIDER_DIAGNOSTICS_MAX_ROWS = 1_000;
export {
	SALES_REQUEST_GENERATION_RETENTION_DAYS,
	anonymizeSalesRequestGenerationRunsForUser,
	purgeExpiredSalesRequestGenerationRuns,
};

type TelemetryRow = SalesRequestGenerationRunForReport & {
	generationId: string;
	actorUserId: number | null;
	consumedSalesId: number | null;
	retentionUntil: Date;
	deletedAt: Date | null;
	completedAt?: Date | null;
	applyOutcome?: string | null;
	applyAt?: Date | null;
	providerAttemptedAt?: Date | null;
	providerLatencyMs?: number | null;
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

function boundedSeedDigest(value: unknown) {
	return typeof value === "string" && /^h1:[a-f0-9]{64}$/.test(value)
		? value
		: null;
}

function boundedIssueCounts(value: unknown) {
	return normalizeSalesRequestGenerationIssuePayload(value);
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
	promptVersion: string;
	schemaVersion: number;
	pilotSettingsRevision: number;
	providerBenchmarkApprovalRevision: number;
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
			promptVersion: boundedToken(input.promptVersion, 64, "unknown"),
			schemaVersion: boundedCount(input.schemaVersion, 100),
			pilotSettingsRevision:
				boundedCount(input.pilotSettingsRevision, 2_147_483_647) ?? 0,
			providerBenchmarkApprovalRevision:
				boundedCount(input.providerBenchmarkApprovalRevision, 2_147_483_647) ??
				0,
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
	if (input.providerLatencyMs !== undefined) {
		data.providerLatencyMs = boundedLatency(input.providerLatencyMs);
	}
	if (input.provider)
		data.provider = boundedToken(input.provider, 32, "unknown");
	if (input.model) data.model = boundedToken(input.model, 100, "unknown");
	if (input.promptVersion)
		data.promptVersion = boundedToken(input.promptVersion, 64, "unknown");
	if (input.schemaVersion !== undefined)
		data.schemaVersion = boundedCount(input.schemaVersion, 100);
	if (input.requestComplexityVersion !== undefined) {
		const requestComplexityVersion = normalizeSalesRequestComplexityVersion(
			input.requestComplexityVersion,
		);
		if (requestComplexityVersion) {
			data.requestComplexityVersion = requestComplexityVersion;
		}
	}
	if (input.requestComplexityStratum !== undefined) {
		const requestComplexityStratum = normalizeSalesRequestComplexityStratum(
			input.requestComplexityStratum,
		);
		if (requestComplexityStratum) {
			data.requestComplexityStratum = requestComplexityStratum;
		}
	}
	if (input.seedDigest !== undefined) {
		const seedDigest = boundedSeedDigest(input.seedDigest);
		if (seedDigest) data.seedDigest = seedDigest;
	}
	if (input.inputTokens !== undefined)
		data.inputTokens = boundedTokens(input.inputTokens);
	if (input.outputTokens !== undefined)
		data.outputTokens = boundedTokens(input.outputTokens);
	if (input.issueCounts)
		data.issueCounts = safeJson(boundedIssueCounts(input.issueCounts));
	if (input.failureStage)
		data.failureStage = boundedToken(input.failureStage, 32, "unknown");

	const result = await db.salesRequestGenerationRun.updateMany({
		where: {
			generationId: input.generationId,
			actorUserId: input.actorUserId,
			consumedSalesId: null,
			deletedAt: null,
			retentionUntil: { gt: input.completedAt },
		},
		data,
	});
	if (result.count !== 1) unavailableGenerationRun();
	return result;
}

export type MarkSalesRequestGenerationProviderAttemptedInput = {
	actorUserId: number;
	generationId: string;
	attemptedAt: Date;
};

/** Persist the paid-provider denominator before constructing or invoking it. */
export async function markSalesRequestGenerationProviderAttempted(
	db: SalesRequestTelemetryDatabase,
	input: MarkSalesRequestGenerationProviderAttemptedInput,
) {
	const result = await db.salesRequestGenerationRun.updateMany({
		where: {
			generationId: input.generationId,
			actorUserId: input.actorUserId,
			status: "started",
			providerAttemptedAt: null,
			deletedAt: null,
			retentionUntil: { gt: input.attemptedAt },
		},
		data: { providerAttemptedAt: input.attemptedAt },
	});
	if (result.count !== 1) unavailableGenerationRun();
	return result;
}

export type ConsumeSalesRequestGenerationRunInput = {
	actorUserId: number;
	generationId: string;
	salesId: number;
	now?: Date;
};

/**
 * Atomically binds a retained successful generation to one native Sales row.
 * The caller supplies the transaction client so this compare-and-set can commit
 * or roll back with the Sales write that owns the resulting ID.
 */
export async function consumeSalesRequestGenerationRun(
	db: SalesRequestTelemetryDatabase,
	input: ConsumeSalesRequestGenerationRunInput,
) {
	if (!Number.isInteger(input.salesId) || input.salesId <= 0) {
		return unavailableGenerationRun();
	}
	const now = input.now ?? new Date();
	const consumed = await db.salesRequestGenerationRun.updateMany({
		where: {
			generationId: input.generationId,
			actorUserId: input.actorUserId,
			status: "succeeded",
			hasText: true,
			completedAt: { not: null },
			seedDigest: { not: null },
			deletedAt: null,
			retentionUntil: { gt: now },
			OR: [{ consumedSalesId: null }, { consumedSalesId: input.salesId }],
		},
		data: { consumedSalesId: input.salesId },
	});
	if (consumed.count !== 1) unavailableGenerationRun();
	return { generationId: input.generationId, salesId: input.salesId };
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

function canPromoteOutcome(
	existing: string,
	input: SalesRequestGenerationOutcome,
) {
	if (input.kind === "apply") {
		return existing !== "applied" && input.outcome === "applied";
	}
	if (input.kind === "save") {
		return existing === "failed" && input.outcome === "saved";
	}
	return false;
}

function terminalOutcomeAlreadyWon(
	existing: string,
	input: SalesRequestGenerationOutcome,
) {
	if (input.kind === "apply") {
		return existing === "applied" && input.outcome !== "applied";
	}
	if (input.kind === "save") {
		return existing === "saved" && input.outcome === "failed";
	}
	return false;
}

function ignoredOutcome(input: RecordSalesRequestGenerationOutcomeInput) {
	return {
		generationId: input.generationId,
		kind: input.kind,
		recorded: false,
		duplicate: false,
		ignored: true,
	};
}

function assertOutcomeTransition(
	run: TelemetryRow,
	input: SalesRequestGenerationOutcome,
) {
	if (
		input.kind === "feedback" &&
		run.applyOutcome !== "applied" &&
		input.outcome !== "rejected"
	) {
		return conflictGenerationOutcome();
	}
	if (input.kind === "save" && run.applyOutcome !== "applied") {
		return conflictGenerationOutcome();
	}
	if (
		input.kind === "apply" &&
		run.applyOutcome !== "applied" &&
		run.feedbackOutcome === "rejected"
	) {
		return conflictGenerationOutcome();
	}
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

	if (
		input.kind === "feedback" &&
		input.outcome === "accepted-with-edits" &&
		run.correctionMs == null &&
		run.applyOutcome === "applied" &&
		run.applyAt
	) {
		data.correctionMs = Math.max(
			0,
			Math.min(now.getTime() - run.applyAt.getTime(), 86_400_000),
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
	assertOutcomeTransition(run, input);

	const state = getOutcomeState(run, input);
	let expectedValue: string | null = null;
	if (state.value !== null) {
		if (outcomeMatchesExisting(run, input)) {
			return {
				generationId: input.generationId,
				kind: input.kind,
				recorded: false,
				duplicate: true,
			};
		}
		if (terminalOutcomeAlreadyWon(state.value, input)) {
			return ignoredOutcome(input);
		}
		if (!canPromoteOutcome(state.value, input)) {
			return conflictGenerationOutcome();
		}
		expectedValue = state.value;
	}

	const data = outcomeData(input, now, run);
	const transitionWhere: Record<string, unknown> = {};
	if (input.kind === "apply" && run.applyOutcome !== "applied") {
		transitionWhere.feedbackOutcome = null;
	}
	if (input.kind === "feedback") {
		transitionWhere.applyOutcome = run.applyOutcome ?? null;
	}
	if (input.kind === "save") transitionWhere.applyOutcome = "applied";
	const updated = await db.salesRequestGenerationRun.updateMany({
		where: {
			generationId: input.generationId,
			actorUserId: input.actorUserId,
			deletedAt: null,
			retentionUntil: { gt: now },
			[state.field]: expectedValue,
			...transitionWhere,
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
	assertOutcomeTransition(latest, input);
	if (outcomeMatchesExisting(latest, input)) {
		return {
			generationId: input.generationId,
			kind: input.kind,
			recorded: false,
			duplicate: true,
		};
	}
	const latestState = getOutcomeState(latest, input);
	if (
		latestState.value !== null &&
		terminalOutcomeAlreadyWon(latestState.value, input)
	) {
		return ignoredOutcome(input);
	}
	if (
		latestState.value !== null &&
		canPromoteOutcome(latestState.value, input)
	) {
		const promoted = await db.salesRequestGenerationRun.updateMany({
			where: {
				generationId: input.generationId,
				actorUserId: input.actorUserId,
				deletedAt: null,
				retentionUntil: { gt: now },
				[latestState.field]: latestState.value,
			},
			data: outcomeData(input, now, latest),
		});
		if (promoted.count) {
			return {
				generationId: input.generationId,
				kind: input.kind,
				recorded: true,
				duplicate: false,
			};
		}
		const final = await db.salesRequestGenerationRun.findUnique({
			where: { generationId: input.generationId },
		});
		if (final && outcomeMatchesExisting(final, input)) {
			return {
				generationId: input.generationId,
				kind: input.kind,
				recorded: false,
				duplicate: true,
			};
		}
	}
	return conflictGenerationOutcome();
}

export type SalesRequestGenerationPilotSummaryInput = {
	periodStart: string;
	now?: Date;
	authority?: SalesRequestGenerationPilotAuthority | null;
	authorityBlockers?: readonly string[];
};

function parseUtcDate(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
	const year = Number(value.slice(0, 4));
	const month = Number(value.slice(5, 7));
	const day = Number(value.slice(8, 10));
	const parsed = new Date(Date.UTC(year, month - 1, day));
	if (
		parsed.getUTCFullYear() !== year ||
		parsed.getUTCMonth() !== month - 1 ||
		parsed.getUTCDate() !== day
	) {
		return null;
	}
	return parsed;
}

function reportPeriod(
	input: SalesRequestGenerationPilotSummaryInput,
	now: Date,
) {
	const from = parseUtcDate(input.periodStart);
	if (!from) {
		return {
			period: {
				days: 7,
				from: null,
				toExclusive: null,
			},
			blockers: ["period-open" as const],
		};
	}
	const toExclusive = new Date(from.getTime() + 7 * DAY_MS);
	const blockers: string[] = [];
	if (toExclusive.getTime() > now.getTime()) blockers.push("period-open");
	if (
		from.getTime() <=
		now.getTime() - SALES_REQUEST_GENERATION_RETENTION_DAYS * DAY_MS
	) {
		blockers.push("retention-window-expired");
	}
	return { period: { days: 7, from, toExclusive }, blockers };
}

export async function getSalesRequestGenerationPilotSummary(
	db: SalesRequestTelemetryDatabase,
	input: SalesRequestGenerationPilotSummaryInput,
) {
	const now = input.now ?? new Date();
	const resolved = reportPeriod(input, now);
	const period = resolved.period;
	const periodBlockers = new Set<string>(resolved.blockers);
	const unavailableEvidence = () =>
		deriveSalesRequestPilotEvidence([], {
			collection: {
				periodClosed: !periodBlockers.has("period-open"),
				retentionWindowAvailable: !periodBlockers.has(
					"retention-window-expired",
				),
				sourceTruncated: false,
			},
		});
	const authorityBlockers = new Set<string>([
		...resolved.blockers,
		...(input.authorityBlockers ?? []),
	]);
	if (period.from === null || period.toExclusive === null) {
		return {
			period,
			coverage: { complete: false, truncated: false, returnedRowCount: 0 },
			eligibleForAdvancement: false,
			evidence: unavailableEvidence(),
			authority: {
				status: "blocked" as const,
				blockers: [...authorityBlockers],
				identity: input.authority ?? null,
			},
			metrics: null,
		};
	}
	if (resolved.blockers.length) {
		return {
			period,
			coverage: { complete: false, truncated: false, returnedRowCount: 0 },
			eligibleForAdvancement: false,
			evidence: unavailableEvidence(),
			authority: {
				status: "blocked" as const,
				blockers: [...authorityBlockers],
				identity: input.authority ?? null,
			},
			metrics: null,
		};
	}
	const rows = await db.salesRequestGenerationRun.findMany({
		where: {
			startedAt: { gte: period.from, lt: period.toExclusive },
			retentionUntil: { gt: now },
			deletedAt: null,
		},
		orderBy: { startedAt: "asc" },
		take: SALES_REQUEST_GENERATION_REPORT_MAX_ROWS + 1,
		select: {
			generationId: true,
			actorUserId: true,
			consumedSalesId: true,
			scope: true,
			configurationRevision: true,
			provider: true,
			model: true,
			promptVersion: true,
			schemaVersion: true,
			requestComplexityVersion: true,
			requestComplexityStratum: true,
			pilotSettingsRevision: true,
			providerBenchmarkApprovalRevision: true,
			status: true,
			startedAt: true,
			completedAt: true,
			latencyMs: true,
			providerAttemptedAt: true,
			providerLatencyMs: true,
			inputTokens: true,
			outputTokens: true,
			issueCounts: true,
			applyOutcome: true,
			saveDraftOutcome: true,
			saveFinalOutcome: true,
			saveFinalAt: true,
			feedbackOutcome: true,
			feedbackIssueCategories: true,
			feedbackChangedFieldCategories: true,
			correctionMs: true,
		},
	});
	if (rows.length > SALES_REQUEST_GENERATION_REPORT_MAX_ROWS) {
		authorityBlockers.add("row-limit-exceeded");
		return {
			period,
			coverage: {
				complete: false,
				truncated: true,
				returnedRowCount: rows.length,
			},
			eligibleForAdvancement: false,
			evidence: deriveSalesRequestPilotEvidence([], {
				collection: {
					periodClosed: true,
					retentionWindowAvailable: true,
					sourceTruncated: true,
				},
			}),
			authority: {
				status: "blocked" as const,
				blockers: [...authorityBlockers],
				identity: input.authority ?? null,
			},
			metrics: null,
		};
	}
	if (!rows.length) authorityBlockers.add("no-runs");
	const periodAuthority =
		input.authority ?? deriveSalesRequestGenerationPilotAuthority(rows[0]);
	for (const row of rows) {
		for (const blocker of getSalesRequestGenerationPilotAuthorityBlockers(
			row,
			periodAuthority,
		)) {
			authorityBlockers.add(blocker);
		}
	}
	const evidence = deriveSalesRequestPilotEvidence(rows, {
		collection: {
			periodClosed: true,
			retentionWindowAvailable: true,
			sourceTruncated: false,
		},
	});
	return {
		period,
		coverage: {
			complete: true,
			truncated: false,
			returnedRowCount: rows.length,
		},
		eligibleForAdvancement:
			authorityBlockers.size === 0 && evidence.advancement.status === "pass",
		evidence,
		authority: {
			status: authorityBlockers.size
				? ("blocked" as const)
				: ("matched" as const),
			blockers: [...authorityBlockers],
			identity: periodAuthority,
		},
		metrics: aggregateSalesRequestGenerationRuns(rows),
	};
}

export async function getSalesRequestProviderDiagnostics(
	db: SalesRequestTelemetryDatabase,
	input: { now?: Date; days?: number } = {},
) {
	const now = input.now ?? new Date();
	const days = Math.min(
		Math.max(
			Math.trunc(input.days ?? SALES_REQUEST_GENERATION_RETENTION_DAYS),
			1,
		),
		SALES_REQUEST_GENERATION_RETENTION_DAYS,
	);
	const from = new Date(now.getTime() - days * DAY_MS);
	const rows = await db.salesRequestGenerationRun.findMany({
		where: {
			providerAttemptedAt: { not: null },
			startedAt: { gte: from, lte: now },
			retentionUntil: { gt: now },
			deletedAt: null,
		},
		orderBy: { startedAt: "desc" },
		take: SALES_REQUEST_PROVIDER_DIAGNOSTICS_MAX_ROWS,
		select: {
			generationId: true,
			provider: true,
			model: true,
			status: true,
			failureStage: true,
			startedAt: true,
			providerAttemptedAt: true,
			latencyMs: true,
			inputTokens: true,
			outputTokens: true,
			issueCounts: true,
		},
	});
	return {
		period: { from, to: now, days },
		truncated: rows.length === SALES_REQUEST_PROVIDER_DIAGNOSTICS_MAX_ROWS,
		...aggregateSalesRequestProviderDiagnostics(rows),
	};
}

export type SalesRequestGenerationStartPersistence =
	SalesRequestGenerationStartEvent & { actorUserId: number };

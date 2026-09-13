import { createHmac } from "node:crypto";
import type { NewSalesFormSeed } from "@gnd/sales/sales-form-core";
import type { SalesRequestProviderFailureDiagnostic } from "./sales-request-provider";

export const SALES_REQUEST_GENERATION_STATUSES = [
	"started",
	"succeeded",
	"provider-error",
	"invalid-output",
	"configuration-changed",
	"configuration-error",
	"cancelled",
	"usage-denied",
	"unknown",
] as const;

export type SalesRequestGenerationStatus =
	(typeof SALES_REQUEST_GENERATION_STATUSES)[number];

export const SALES_REQUEST_GENERATION_ISSUE_CATEGORIES = [
	"ambiguous",
	"unreadable",
	"unsupported",
	"missing-component",
	"hidden-component",
	"dependency",
	"unpriced",
	"wrong-quantity",
	"wrong-delivery",
	"wrong-component",
	"unsafe-selection",
	"other",
] as const;

export type SalesRequestGenerationIssueCategory =
	(typeof SALES_REQUEST_GENERATION_ISSUE_CATEGORIES)[number];

export const SALES_REQUEST_GENERATION_CHANGED_FIELD_CATEGORIES = [
	"customer",
	"delivery",
	"line-items",
	"components",
	"quantities",
	"hpt",
	"moulding",
	"services",
	"notes",
	"extra-costs",
	"other",
] as const;

export type SalesRequestGenerationChangedFieldCategory =
	(typeof SALES_REQUEST_GENERATION_CHANGED_FIELD_CATEGORIES)[number];

export const SALES_REQUEST_GENERATION_FAILURE_STAGES = [
	"provider-api",
	"structured-output",
	"aborted",
	"unknown",
] as const;

export type SalesRequestGenerationIssueCounts = {
	ambiguous: number;
	unreadable: number;
	unsupported: number;
};

export type SalesRequestGenerationStartEvent = {
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

export type SalesRequestGenerationCompleteEvent = {
	generationId: string;
	status: SalesRequestGenerationStatus;
	completedAt: Date;
	latencyMs: number;
	providerLatencyMs?: number;
	provider?: string;
	model?: string;
	promptVersion?: string;
	schemaVersion?: number;
	seedDigest?: string;
	inputTokens?: number;
	outputTokens?: number;
	issueCounts?: SalesRequestGenerationIssueCounts;
	failureStage?: SalesRequestProviderFailureDiagnostic["stage"];
};

export type SalesRequestGenerationProviderAttemptEvent = {
	generationId: string;
	attemptedAt: Date;
};

function salesRequestSeedDigestSecret() {
	const secret =
		process.env.SALES_REQUEST_SEED_HMAC_SECRET?.trim() ||
		process.env.AUTH_SECRET?.trim() ||
		process.env.BETTER_AUTH_SECRET?.trim() ||
		process.env.JWT_SECRET?.trim() ||
		(process.env.NODE_ENV !== "production"
			? "gnd-local-sales-request-seed-hmac-v1"
			: "");
	if (!secret) {
		throw new Error("Sales Request seed binding is not configured.");
	}
	return secret;
}

function canonicalJson(value: unknown): string {
	if (value === null) return "null";
	if (typeof value === "string" || typeof value === "boolean") {
		return JSON.stringify(value);
	}
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new TypeError("Sales Request seed contains a non-finite number.");
		}
		return JSON.stringify(value);
	}
	if (typeof value !== "object") {
		throw new TypeError("Sales Request seed contains a non-JSON value.");
	}
	if (Array.isArray(value)) {
		return `[${value.map(canonicalJson).join(",")}]`;
	}
	return `{${Object.entries(value)
		.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
		.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
		.join(",")}}`;
}

/** Create a run-scoped pseudonymous binding without retaining the seed content. */
export function createSalesRequestSeedDigest(input: {
	seed: NewSalesFormSeed;
	generationId: string;
	configurationScope: string;
	configurationRevision: string;
}) {
	const digest = createHmac("sha256", salesRequestSeedDigestSecret())
		.update("gnd:sales-request-seed:h1\0")
		.update(input.generationId)
		.update("\0")
		.update(input.configurationScope)
		.update("\0")
		.update(input.configurationRevision)
		.update("\0")
		.update(canonicalJson(input.seed))
		.digest("hex");
	return `h1:${digest}`;
}

export type SalesRequestGenerationTelemetry = {
	beginRun: (event: SalesRequestGenerationStartEvent) => Promise<void> | void;
	markProviderAttempted: (
		event: SalesRequestGenerationProviderAttemptEvent,
	) => Promise<void> | void;
	completeRun: (
		event: SalesRequestGenerationCompleteEvent,
	) => Promise<void> | void;
};

export type SalesRequestGenerationRunForReport = {
	generationId?: string | null;
	actorUserId?: number | null;
	scope?: string | null;
	configurationRevision?: string | null;
	provider?: string | null;
	model?: string | null;
	promptVersion?: string | null;
	schemaVersion?: number | null;
	pilotSettingsRevision?: number | null;
	providerBenchmarkApprovalRevision?: number | null;
	status?: string | null;
	latencyMs?: number | null;
	providerAttemptedAt?: Date | null;
	providerLatencyMs?: number | null;
	inputTokens?: number | null;
	outputTokens?: number | null;
	issueCounts?: unknown;
	applyOutcome?: string | null;
	saveDraftOutcome?: string | null;
	saveFinalOutcome?: string | null;
	feedbackOutcome?: string | null;
	feedbackIssueCategories?: unknown;
	feedbackChangedFieldCategories?: unknown;
	correctionMs?: number | null;
	createdAt?: Date | null;
};

export const SALES_REQUEST_GENERATION_PILOT_REVIEW_PERIOD_DAYS = 7;

export type SalesRequestGenerationPilotAuthority = {
	scope: string;
	configurationRevision: string;
	provider: string;
	model: string;
	promptVersion: string;
	schemaVersion: number;
	pilotSettingsRevision: number;
	providerBenchmarkApprovalRevision: number;
};

export const SALES_REQUEST_GENERATION_PILOT_AUTHORITY_BLOCKERS = [
	"authority-unavailable",
	"legacy-run-authority",
	"scope-mismatch",
	"configuration-mismatch",
	"provider-mismatch",
	"model-mismatch",
	"prompt-version-mismatch",
	"schema-version-mismatch",
	"pilot-settings-revision-mismatch",
	"provider-benchmark-revision-mismatch",
	"pilot-disabled",
	"pilot-settings-unavailable",
	"provider-benchmark-unavailable",
	"incomplete-run",
	"no-runs",
	"row-limit-exceeded",
	"period-open",
	"retention-window-expired",
] as const;

export type SalesRequestGenerationPilotAuthorityBlocker =
	(typeof SALES_REQUEST_GENERATION_PILOT_AUTHORITY_BLOCKERS)[number];

function isPositiveRevision(value: unknown): value is number {
	return Number.isInteger(value) && (value as number) > 0;
}

function isValidPilotAuthority(
	authority: SalesRequestGenerationPilotAuthority | null | undefined,
): authority is SalesRequestGenerationPilotAuthority {
	return Boolean(
		authority &&
			typeof authority.scope === "string" &&
			authority.scope.length > 0 &&
			typeof authority.configurationRevision === "string" &&
			authority.configurationRevision.length > 0 &&
			typeof authority.provider === "string" &&
			authority.provider.length > 0 &&
			typeof authority.model === "string" &&
			authority.model.length > 0 &&
			typeof authority.promptVersion === "string" &&
			authority.promptVersion.length > 0 &&
			Number.isInteger(authority.schemaVersion) &&
			authority.schemaVersion > 0 &&
			isPositiveRevision(authority.pilotSettingsRevision) &&
			isPositiveRevision(authority.providerBenchmarkApprovalRevision),
	);
}

export function deriveSalesRequestGenerationPilotAuthority(
	row: SalesRequestGenerationRunForReport | undefined,
) {
	if (!row) return null;
	const authority: SalesRequestGenerationPilotAuthority = {
		scope: row.scope ?? "",
		configurationRevision: row.configurationRevision ?? "",
		provider: row.provider ?? "",
		model: row.model ?? "",
		promptVersion: row.promptVersion ?? "",
		schemaVersion: row.schemaVersion ?? 0,
		pilotSettingsRevision: row.pilotSettingsRevision ?? 0,
		providerBenchmarkApprovalRevision:
			row.providerBenchmarkApprovalRevision ?? 0,
	};
	return isValidPilotAuthority(authority) ? authority : null;
}

/**
 * Compare a report row with the one authority tuple captured for the period.
 * Missing immutable fields are treated as legacy rather than being coerced.
 */
export function getSalesRequestGenerationPilotAuthorityBlockers(
	row: SalesRequestGenerationRunForReport,
	authority: SalesRequestGenerationPilotAuthority | null | undefined,
) {
	const blockers = new Set<SalesRequestGenerationPilotAuthorityBlocker>();
	if (!isValidPilotAuthority(authority)) {
		blockers.add("authority-unavailable");
		return [...blockers];
	}

	if (row.scope !== authority.scope) blockers.add("scope-mismatch");
	if (row.configurationRevision !== authority.configurationRevision) {
		blockers.add("configuration-mismatch");
	}
	if (row.provider !== authority.provider) blockers.add("provider-mismatch");
	if (row.model !== authority.model) blockers.add("model-mismatch");
	if (row.promptVersion == null || row.schemaVersion == null) {
		blockers.add("legacy-run-authority");
	} else {
		if (row.promptVersion !== authority.promptVersion) {
			blockers.add("prompt-version-mismatch");
		}
		if (row.schemaVersion !== authority.schemaVersion) {
			blockers.add("schema-version-mismatch");
		}
	}
	if (!isPositiveRevision(row.pilotSettingsRevision)) {
		blockers.add("legacy-run-authority");
	} else if (row.pilotSettingsRevision !== authority.pilotSettingsRevision) {
		blockers.add("pilot-settings-revision-mismatch");
	}
	if (!isPositiveRevision(row.providerBenchmarkApprovalRevision)) {
		blockers.add("legacy-run-authority");
	} else if (
		row.providerBenchmarkApprovalRevision !==
		authority.providerBenchmarkApprovalRevision
	) {
		blockers.add("provider-benchmark-revision-mismatch");
	}
	if (row.status === "started") blockers.add("incomplete-run");
	return [...blockers];
}

const issueStatuses = new Set(["ambiguous", "unreadable", "unsupported"]);

const statusSet = new Set<string>(SALES_REQUEST_GENERATION_STATUSES);
const issueCategorySet = new Set<string>(
	SALES_REQUEST_GENERATION_ISSUE_CATEGORIES,
);
const changedFieldCategorySet = new Set<string>(
	SALES_REQUEST_GENERATION_CHANGED_FIELD_CATEGORIES,
);

function finiteInteger(value: unknown, maximum = 100_000) {
	if (!Number.isInteger(value) || (value as number) < 0) return 0;
	return Math.min(value as number, maximum);
}

function boundedCategoryList(
	value: unknown,
	allowed: ReadonlySet<string>,
	maximum = 12,
) {
	if (!Array.isArray(value)) return [];
	const categories: string[] = [];
	for (const item of value) {
		if (typeof item !== "string" || !allowed.has(item)) continue;
		if (categories.includes(item)) continue;
		categories.push(item);
		if (categories.length >= maximum) break;
	}
	return categories.sort();
}

export function normalizeSalesRequestGenerationIssueCounts(
	value: unknown,
): SalesRequestGenerationIssueCounts {
	if (!value || typeof value !== "object") {
		return { ambiguous: 0, unreadable: 0, unsupported: 0 };
	}
	const counts = value as Record<string, unknown>;
	return {
		ambiguous: finiteInteger(counts.ambiguous),
		unreadable: finiteInteger(counts.unreadable),
		unsupported: finiteInteger(counts.unsupported),
	};
}

export function normalizeSalesRequestGenerationStatus(value: unknown) {
	return typeof value === "string" && statusSet.has(value)
		? (value as SalesRequestGenerationStatus)
		: "unknown";
}

export function normalizeSalesRequestGenerationIssueCategories(value: unknown) {
	return boundedCategoryList(value, issueCategorySet);
}

export function normalizeSalesRequestGenerationChangedFieldCategories(
	value: unknown,
) {
	return boundedCategoryList(value, changedFieldCategorySet);
}

/** Derive issue counts from the validated seed; never copy unresolved reasons. */
export function countSalesRequestGenerationIssues(
	seed: unknown,
): SalesRequestGenerationIssueCounts {
	const counts: SalesRequestGenerationIssueCounts = {
		ambiguous: 0,
		unreadable: 0,
		unsupported: 0,
	};
	if (!seed || typeof seed !== "object") return counts;
	const unresolved = (seed as { unresolved?: unknown }).unresolved;
	if (!Array.isArray(unresolved)) return counts;
	for (const entry of unresolved.slice(0, 100)) {
		if (!entry || typeof entry !== "object") continue;
		const status = (entry as { status?: unknown }).status;
		if (typeof status === "string" && issueStatuses.has(status)) {
			counts[status as keyof SalesRequestGenerationIssueCounts] += 1;
		}
	}
	return counts;
}

function countCategories(
	rows: SalesRequestGenerationRunForReport[],
	field: "feedbackIssueCategories" | "feedbackChangedFieldCategories",
	allowed: ReadonlySet<string>,
) {
	const counts: Record<string, number> = {};
	for (const row of rows) {
		for (const category of boundedCategoryList(row[field], allowed)) {
			counts[category] = (counts[category] ?? 0) + 1;
		}
	}
	return counts;
}

function percentile(values: number[], percentileValue: number) {
	if (!values.length) return null;
	const sorted = [...values].sort((left, right) => left - right);
	const index = Math.min(
		sorted.length - 1,
		Math.max(0, Math.ceil(percentileValue * sorted.length) - 1),
	);
	return sorted[index] ?? null;
}

export function aggregateSalesRequestGenerationRuns(
	rows: readonly SalesRequestGenerationRunForReport[],
) {
	const statusCounts: Record<string, number> = {};
	const providerModelCounts: Record<
		string,
		{
			provider: string;
			model: string;
			generationCount: number;
			succeededCount: number;
		}
	> = {};
	const issueCounts: SalesRequestGenerationIssueCounts = {
		ambiguous: 0,
		unreadable: 0,
		unsupported: 0,
	};
	const correctionValues: number[] = [];
	const latencyValues: number[] = [];
	const providerLatencyValues: number[] = [];
	let inputTokens = 0;
	let outputTokens = 0;
	let inputTokensComplete = true;
	let outputTokensComplete = true;
	let succeededCount = 0;

	for (const row of rows) {
		const status = normalizeSalesRequestGenerationStatus(row.status);
		statusCounts[status] = (statusCounts[status] ?? 0) + 1;
		if (status === "succeeded") succeededCount += 1;

		const provider =
			typeof row.provider === "string" && row.provider.length <= 32
				? row.provider
				: "unknown";
		const model =
			typeof row.model === "string" && row.model.length <= 100
				? row.model
				: "unknown";
		const providerModelKey = `${provider}\u0000${model}`;
		const providerModel = providerModelCounts[providerModelKey] ?? {
			provider,
			model,
			generationCount: 0,
			succeededCount: 0,
		};
		providerModel.generationCount += 1;
		if (status === "succeeded") providerModel.succeededCount += 1;
		providerModelCounts[providerModelKey] = providerModel;

		const rowIssues = normalizeSalesRequestGenerationIssueCounts(
			row.issueCounts,
		);
		issueCounts.ambiguous += rowIssues.ambiguous;
		issueCounts.unreadable += rowIssues.unreadable;
		issueCounts.unsupported += rowIssues.unsupported;
		if (Number.isInteger(row.inputTokens) && (row.inputTokens as number) >= 0) {
			inputTokens += Math.min(row.inputTokens as number, 100_000_000);
		} else if (row.providerAttemptedAt) {
			inputTokensComplete = false;
		}
		if (
			Number.isInteger(row.outputTokens) &&
			(row.outputTokens as number) >= 0
		) {
			outputTokens += Math.min(row.outputTokens as number, 100_000_000);
		} else if (row.providerAttemptedAt) {
			outputTokensComplete = false;
		}
		if (Number.isInteger(row.latencyMs) && (row.latencyMs as number) >= 0) {
			latencyValues.push(Math.min(row.latencyMs as number, 300_000));
		}
		if (
			Number.isInteger(row.providerLatencyMs) &&
			(row.providerLatencyMs as number) >= 0
		) {
			providerLatencyValues.push(
				Math.min(row.providerLatencyMs as number, 300_000),
			);
		}
		if (
			Number.isInteger(row.correctionMs) &&
			(row.correctionMs as number) >= 0
		) {
			correctionValues.push(Math.min(row.correctionMs as number, 86_400_000));
		}
	}

	const applied = rows.filter((row) => row.applyOutcome === "applied").length;
	const feedbackAccepted = rows.filter(
		(row) => row.feedbackOutcome === "accepted",
	).length;
	const feedbackAcceptedWithEdits = rows.filter(
		(row) => row.feedbackOutcome === "accepted-with-edits",
	).length;
	const feedbackRejected = rows.filter(
		(row) => row.feedbackOutcome === "rejected",
	).length;

	return {
		generationCount: rows.length,
		succeededCount,
		statusCounts,
		providerModels: Object.values(providerModelCounts).sort((left, right) =>
			`${left.provider}:${left.model}`.localeCompare(
				`${right.provider}:${right.model}`,
			),
		),
		tokenTotals: {
			input: inputTokensComplete ? inputTokens : null,
			output: outputTokensComplete ? outputTokens : null,
		},
		outcomeCounts: {
			applied,
			applyBlocked: rows.filter((row) => row.applyOutcome === "blocked").length,
			applyStale: rows.filter((row) => row.applyOutcome === "stale").length,
			applyUnavailable: rows.filter((row) => row.applyOutcome === "unavailable")
				.length,
			saveDrafted: rows.filter((row) => row.saveDraftOutcome === "saved")
				.length,
			saveDraftFailed: rows.filter((row) => row.saveDraftOutcome === "failed")
				.length,
			saveFinal: rows.filter((row) => row.saveFinalOutcome === "saved").length,
			saveFinalFailed: rows.filter((row) => row.saveFinalOutcome === "failed")
				.length,
			feedbackAccepted,
			feedbackAcceptedWithEdits,
			feedbackRejected,
		},
		issueCounts,
		feedbackIssueCounts: countCategories(
			[...rows],
			"feedbackIssueCategories",
			issueCategorySet,
		),
		changedFieldCounts: countCategories(
			[...rows],
			"feedbackChangedFieldCategories",
			changedFieldCategorySet,
		),
		latency: {
			sampleCount: latencyValues.length,
			p50Ms: percentile(latencyValues, 0.5),
			p95Ms: percentile(latencyValues, 0.95),
		},
		providerLatency: {
			sampleCount: providerLatencyValues.length,
			p50Ms: percentile(providerLatencyValues, 0.5),
			p95Ms: percentile(providerLatencyValues, 0.95),
		},
		correction: {
			sampleCount: correctionValues.length,
			p50Ms: percentile(correctionValues, 0.5),
			p95Ms: percentile(correctionValues, 0.95),
		},
	};
}

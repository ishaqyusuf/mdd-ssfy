import { createHmac } from "node:crypto";
import type { NewSalesFormSeed } from "@gnd/sales/sales-form-core";
import {
	SALES_REQUEST_GENERATION_CHANGED_FIELD_CATEGORIES,
	SALES_REQUEST_GENERATION_ISSUE_CATEGORIES,
	isValidSalesRequestPilotFeedback,
} from "./sales-request-feedback";
import { buildSalesRequestMatchedComparison } from "./sales-request-matched-comparison";
import type { SalesRequestProviderFailureDiagnostic } from "./sales-request-provider";
import {
	SALES_REQUEST_COMPLEXITY_STRATA,
	SALES_REQUEST_COMPLEXITY_VERSIONS,
	type SalesRequestComplexityStratum,
	type SalesRequestComplexityVersion,
} from "./sales-request-request-shape";

export {
	SALES_REQUEST_GENERATION_CHANGED_FIELD_CATEGORIES,
	SALES_REQUEST_GENERATION_ISSUE_CATEGORIES,
} from "./sales-request-feedback";
export type {
	SalesRequestGenerationChangedFieldCategory,
	SalesRequestGenerationIssueCategory,
} from "./sales-request-feedback";
export {
	SALES_REQUEST_COMPLEXITY_STRATA,
	SALES_REQUEST_COMPLEXITY_VERSIONS,
} from "./sales-request-request-shape";
export type {
	SalesRequestComplexityStratum,
	SalesRequestComplexityVersion,
} from "./sales-request-request-shape";

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

export type SalesRequestProviderFailureTelemetry = Pick<
	SalesRequestProviderFailureDiagnostic,
	| "statusCode"
	| "providerCode"
	| "providerStatus"
	| "retryable"
	| "structuredOutputCause"
	| "finishReason"
	| "outputShape"
	| "repairAttempted"
	| "configurationIssue"
	| "routeFailureKind"
	| "schemaIssues"
>;

export type SalesRequestGenerationIssuePayload =
	| SalesRequestGenerationIssueCounts
	| { providerFailure: SalesRequestProviderFailureTelemetry };

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
	requestComplexityVersion?: SalesRequestComplexityVersion;
	requestComplexityStratum?: SalesRequestComplexityStratum;
	seedDigest?: string;
	inputTokens?: number;
	outputTokens?: number;
	issueCounts?: SalesRequestGenerationIssuePayload;
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
	requestComplexityVersion?: SalesRequestComplexityVersion | null;
	requestComplexityStratum?: SalesRequestComplexityStratum | null;
	pilotSettingsRevision?: number | null;
	providerBenchmarkApprovalRevision?: number | null;
	status?: string | null;
	failureStage?: string | null;
	latencyMs?: number | null;
	consumedSalesId?: number | null;
	startedAt?: Date | null;
	providerAttemptedAt?: Date | null;
	providerLatencyMs?: number | null;
	inputTokens?: number | null;
	outputTokens?: number | null;
	issueCounts?: unknown;
	applyOutcome?: string | null;
	saveDraftOutcome?: string | null;
	saveFinalOutcome?: string | null;
	saveFinalAt?: Date | null;
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
const requestComplexityVersionSet = new Set<string>(
	SALES_REQUEST_COMPLEXITY_VERSIONS,
);
const requestComplexityStratumSet = new Set<string>(
	SALES_REQUEST_COMPLEXITY_STRATA,
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

const providerFailureCauseSet = new Set(["json-parse", "schema-validation"]);
const providerFailureStatusSet = new Set([
	"OK",
	"CANCELLED",
	"UNKNOWN",
	"INVALID_ARGUMENT",
	"DEADLINE_EXCEEDED",
	"NOT_FOUND",
	"ALREADY_EXISTS",
	"PERMISSION_DENIED",
	"RESOURCE_EXHAUSTED",
	"FAILED_PRECONDITION",
	"ABORTED",
	"OUT_OF_RANGE",
	"UNIMPLEMENTED",
	"INTERNAL",
	"UNAVAILABLE",
	"DATA_LOSS",
	"UNAUTHENTICATED",
]);
const providerFailureIssueCodeSet = new Set([
	"configuration-validation",
	"custom",
	"invalid_element",
	"invalid_format",
	"invalid_key",
	"invalid_type",
	"invalid_union",
	"invalid_value",
	"not_multiple_of",
	"too_big",
	"too_small",
	"unrecognized_keys",
]);

export function normalizeSalesRequestProviderFailureTelemetry(value: unknown) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const input = value as Record<string, unknown>;
	const structuredOutputCause =
		typeof input.structuredOutputCause === "string" &&
		providerFailureCauseSet.has(input.structuredOutputCause)
			? (input.structuredOutputCause as "json-parse" | "schema-validation")
			: undefined;
	const statusCode =
		Number.isInteger(input.statusCode) &&
		(input.statusCode as number) >= 100 &&
		(input.statusCode as number) <= 599
			? (input.statusCode as number)
			: undefined;
	const providerCode =
		Number.isInteger(input.providerCode) &&
		(input.providerCode as number) >= 100 &&
		(input.providerCode as number) <= 599
			? (input.providerCode as number)
			: undefined;
	const providerStatus =
		typeof input.providerStatus === "string" &&
		providerFailureStatusSet.has(input.providerStatus)
			? input.providerStatus
			: undefined;
	const retryable =
		typeof input.retryable === "boolean" ? input.retryable : undefined;
	const repairAttempted =
		typeof input.repairAttempted === "boolean"
			? input.repairAttempted
			: undefined;
	const outputShape =
		input.outputShape === "object" ||
		input.outputShape === "array" ||
		input.outputShape === "primitive" ||
		input.outputShape === "invalid-json"
			? input.outputShape
			: undefined;
	const configurationIssue =
		input.configurationIssue === "source" ||
		input.configurationIssue === "source-coverage" ||
		input.configurationIssue === "moulding-product" ||
		input.configurationIssue === "moulding-quantity" ||
		input.configurationIssue === "interpretation-source" ||
		input.configurationIssue === "interpretation-route" ||
		input.configurationIssue === "interpretation-title" ||
		input.configurationIssue === "custom-source" ||
		input.configurationIssue === "service-source" ||
		input.configurationIssue === "door-dimension-source" ||
		input.configurationIssue === "delivery-option-source" ||
		input.configurationIssue === "delivery-amount-source" ||
		input.configurationIssue === "route" ||
		input.configurationIssue === "catalog" ||
		input.configurationIssue === "dimensions" ||
		input.configurationIssue === "mouldings" ||
		input.configurationIssue === "interpretation" ||
		input.configurationIssue === "other"
			? input.configurationIssue
			: undefined;
	const routeFailureKind = configurationIssue === "route" && (
		input.routeFailureKind === "missing-root" ||
		input.routeFailureKind === "interior-for-exterior" ||
		input.routeFailureKind === "slab-for-prehung" ||
		input.routeFailureKind === "outside-step" ||
		input.routeFailureKind === "service-route" ||
		input.routeFailureKind === "swing-route"
	) ? input.routeFailureKind : undefined;
	const finishReason =
		input.finishReason === "length" ||
		input.finishReason === "stop" ||
		input.finishReason === "content-filter" ||
		input.finishReason === "error" ||
		input.finishReason === "other" ||
		input.finishReason === "unknown"
			? input.finishReason
			: undefined;
	const schemaIssues = Array.isArray(input.schemaIssues)
		? input.schemaIssues.slice(0, 12).flatMap((issue) => {
				if (!issue || typeof issue !== "object") return [];
				const candidate = issue as Record<string, unknown>;
				if (
					typeof candidate.code !== "string" ||
					!providerFailureIssueCodeSet.has(candidate.code) ||
					typeof candidate.path !== "string" ||
					candidate.path.length > 256 ||
					!/^(?:\$|(?:[A-Za-z]+|\[\]|<field>)(?:\.(?:[A-Za-z]+|\[\]|<field>))*)$/.test(
						candidate.path,
					)
				) {
					return [];
				}
			const detail = candidate.path === "lineItems.[].qty" &&
				(candidate.detail === "zero-quantity" ||
					candidate.detail === "hpt-quantity-mismatch")
					? candidate.detail : candidate.path === "lineItems.[].housePackageTool.doors.[]" &&
					candidate.detail === "zero-handed-units"
						? candidate.detail : undefined;
				return [{ code: candidate.code, path: candidate.path,
					...(detail ? { detail } : {}) }];
			})
		: [];
	const normalized: SalesRequestProviderFailureTelemetry = {
		...(structuredOutputCause ? { structuredOutputCause } : {}),
		...(statusCode !== undefined ? { statusCode } : {}),
		...(providerCode !== undefined ? { providerCode } : {}),
		...(providerStatus ? { providerStatus } : {}),
		...(retryable !== undefined ? { retryable } : {}),
		...(finishReason ? { finishReason } : {}),
		...(outputShape ? { outputShape } : {}),
		...(repairAttempted !== undefined ? { repairAttempted } : {}),
		...(configurationIssue ? { configurationIssue } : {}),
		...(routeFailureKind ? { routeFailureKind } : {}),
		...(schemaIssues.length ? { schemaIssues } : {}),
	};
	return Object.keys(normalized).length ? normalized : null;
}

export function normalizeSalesRequestGenerationIssuePayload(
	value: unknown,
): SalesRequestGenerationIssuePayload {
	if (value && typeof value === "object" && "providerFailure" in value) {
		const providerFailure = normalizeSalesRequestProviderFailureTelemetry(
			(value as { providerFailure?: unknown }).providerFailure,
		);
		if (providerFailure) return { providerFailure };
	}
	return normalizeSalesRequestGenerationIssueCounts(value);
}

function hasCompleteSalesRequestGenerationIssueCounts(
	value: unknown,
): value is SalesRequestGenerationIssueCounts {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const counts = value as Record<string, unknown>;
	return (
		Number.isInteger(counts.ambiguous) &&
		(counts.ambiguous as number) >= 0 &&
		Number.isInteger(counts.unreadable) &&
		(counts.unreadable as number) >= 0 &&
		Number.isInteger(counts.unsupported) &&
		(counts.unsupported as number) >= 0
	);
}

export function normalizeSalesRequestGenerationStatus(value: unknown) {
	return typeof value === "string" && statusSet.has(value)
		? (value as SalesRequestGenerationStatus)
		: "unknown";
}

export function normalizeSalesRequestComplexityVersion(value: unknown) {
	return typeof value === "string" && requestComplexityVersionSet.has(value)
		? (value as SalesRequestComplexityVersion)
		: null;
}

export function normalizeSalesRequestComplexityStratum(value: unknown) {
	return typeof value === "string" && requestComplexityStratumSet.has(value)
		? (value as SalesRequestComplexityStratum)
		: null;
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

function isValidDate(value: unknown): value is Date {
	return value instanceof Date && Number.isFinite(value.getTime());
}

function representativeComparisonArm(
	rows: readonly SalesRequestGenerationRunForReport[],
) {
	const handlingTimeValues = rows
		.map((row) => {
			if (!isValidDate(row.startedAt) || !isValidDate(row.saveFinalAt)) {
				return null;
			}
			const duration = row.saveFinalAt.getTime() - row.startedAt.getTime();
			return duration >= 0 && duration <= 86_400_000 ? duration : null;
		})
		.filter((value): value is number => value !== null);
	const reviewedRows = rows.filter(
		(row) =>
			isValidSalesRequestPilotFeedback(row) &&
			(row.feedbackOutcome === "accepted" ||
				row.feedbackOutcome === "accepted-with-edits"),
	);
	const acceptedWithEditsCount = reviewedRows.filter(
		(row) => row.feedbackOutcome === "accepted-with-edits",
	).length;

	return {
		finalizedCount: rows.length,
		handlingTime: {
			sampleCount: handlingTimeValues.length,
			p50Ms: percentile(handlingTimeValues, 0.5),
			p95Ms: percentile(handlingTimeValues, 0.95),
		},
		correctionRate: {
			reviewedCount: reviewedRows.length,
			acceptedWithEditsCount,
			rateBasisPoints: reviewedRows.length
				? Math.round((acceptedWithEditsCount * 10_000) / reviewedRows.length)
				: null,
		},
	};
}

function representativeComparison(
	rows: readonly SalesRequestGenerationRunForReport[],
) {
	// Consumption is an observed save outcome, not randomized experiment assignment.
	// Report the delta for operational review without making a causal claim.
	const finalizedRows = rows.filter(
		(row) =>
			row.status === "succeeded" &&
			row.applyOutcome === "applied" &&
			row.saveFinalOutcome === "saved",
	);
	const assistiveTextFirst = representativeComparisonArm(
		finalizedRows.filter(
			(row) =>
				Number.isInteger(row.actorUserId) &&
				(row.actorUserId as number) > 0 &&
				row.consumedSalesId === null,
		),
	);
	const lowTouchConsumedFinalSave = representativeComparisonArm(
		finalizedRows.filter(
			(row) =>
				Number.isInteger(row.actorUserId) &&
				(row.actorUserId as number) > 0 &&
				Number.isInteger(row.consumedSalesId) &&
				(row.consumedSalesId as number) > 0,
		),
	);
	const assistiveHandlingP95Ms = assistiveTextFirst.handlingTime.p95Ms;
	const assistiveCorrectionRateBasisPoints =
		assistiveTextFirst.correctionRate.rateBasisPoints;
	const lowTouchHandlingP95Ms = lowTouchConsumedFinalSave.handlingTime.p95Ms;
	const lowTouchCorrectionRateBasisPoints =
		lowTouchConsumedFinalSave.correctionRate.rateBasisPoints;
	const blockers: Array<
		| "assistive-handling-time-incomplete"
		| "assistive-feedback-incomplete"
		| "low-touch-handling-time-incomplete"
		| "low-touch-feedback-incomplete"
	> = [];
	if (
		assistiveTextFirst.finalizedCount === 0 ||
		assistiveTextFirst.handlingTime.sampleCount !==
			assistiveTextFirst.finalizedCount
	) {
		blockers.push("assistive-handling-time-incomplete");
	}
	if (
		assistiveTextFirst.finalizedCount === 0 ||
		assistiveTextFirst.correctionRate.reviewedCount !==
			assistiveTextFirst.finalizedCount
	) {
		blockers.push("assistive-feedback-incomplete");
	}
	if (
		lowTouchConsumedFinalSave.finalizedCount === 0 ||
		lowTouchConsumedFinalSave.handlingTime.sampleCount !==
			lowTouchConsumedFinalSave.finalizedCount
	) {
		blockers.push("low-touch-handling-time-incomplete");
	}
	if (
		lowTouchConsumedFinalSave.finalizedCount === 0 ||
		lowTouchConsumedFinalSave.correctionRate.reviewedCount !==
			lowTouchConsumedFinalSave.finalizedCount
	) {
		blockers.push("low-touch-feedback-incomplete");
	}
	const observedLowTouchMinusAssistive =
		blockers.length === 0 &&
		assistiveHandlingP95Ms !== null &&
		assistiveCorrectionRateBasisPoints !== null &&
		lowTouchHandlingP95Ms !== null &&
		lowTouchCorrectionRateBasisPoints !== null
			? {
					handlingTimeP95Ms: lowTouchHandlingP95Ms - assistiveHandlingP95Ms,
					correctionRateBasisPoints:
						lowTouchCorrectionRateBasisPoints -
						assistiveCorrectionRateBasisPoints,
				}
			: null;

	return {
		scope: "successful-final-saves" as const,
		handlingTimeDefinition:
			"generation-start-to-successful-final-save" as const,
		correctionRateDefinition:
			"accepted-with-edits-over-accepted-reviews" as const,
		comparison: {
			method: "observational-outcome-classification" as const,
			status: observedLowTouchMinusAssistive
				? ("descriptive-only" as const)
				: ("insufficient-evidence" as const),
			autonomyDecisionEligible: false,
			limitations: [
				"outcome-selected-arms",
				"request-family-not-stratified",
			] as const,
			blockers,
			observedLowTouchMinusAssistive,
		},
		arms: {
			assistiveTextFirst,
			lowTouchConsumedFinalSave,
		},
	};
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
	let issueCountsComplete = true;
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

		if (status === "succeeded") {
			if (hasCompleteSalesRequestGenerationIssueCounts(row.issueCounts)) {
				const rowIssues = normalizeSalesRequestGenerationIssueCounts(
					row.issueCounts,
				);
				issueCounts.ambiguous += rowIssues.ambiguous;
				issueCounts.unreadable += rowIssues.unreadable;
				issueCounts.unsupported += rowIssues.unsupported;
			} else {
				issueCountsComplete = false;
			}
		}
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
		issueCounts: issueCountsComplete ? issueCounts : null,
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
		representativeComparison: representativeComparison(rows),
		matchedRepresentativeComparison: buildSalesRequestMatchedComparison(rows),
	};
}

export function aggregateSalesRequestProviderDiagnostics(
	rows: readonly SalesRequestGenerationRunForReport[],
) {
	const providerCounts = new Map<
		string,
		{ provider: string; attempts: number; failures: number }
	>();
	const failures: Array<{
		reference: string;
		provider: string;
		model: string;
		stage: string;
		cause?: "json-parse" | "schema-validation";
		statusCode?: number;
		providerStatus?: string;
		retryable?: boolean;
		schemaIssues?: Array<{ code: string; path: string }>;
		occurredAt: Date;
		latencyMs?: number;
		inputTokens?: number;
		outputTokens?: number;
	}> = [];

	for (const row of rows) {
		if (!isValidDate(row.providerAttemptedAt)) continue;
		const provider =
			typeof row.provider === "string" &&
			/^[A-Za-z0-9._:-]{1,32}$/.test(row.provider)
				? row.provider
				: "unknown";
		const current = providerCounts.get(provider) ?? {
			provider,
			attempts: 0,
			failures: 0,
		};
		current.attempts += 1;
		const failed =
			row.status === "provider-error" || row.status === "invalid-output";
		if (failed) current.failures += 1;
		providerCounts.set(provider, current);
		if (!failed || !isValidDate(row.startedAt)) continue;

		const payload =
			row.issueCounts &&
			typeof row.issueCounts === "object" &&
			"providerFailure" in row.issueCounts
				? normalizeSalesRequestProviderFailureTelemetry(
						(row.issueCounts as { providerFailure?: unknown }).providerFailure,
					)
				: null;
		const reference =
			typeof row.generationId === "string" &&
			/^[A-Za-z0-9-]{8,36}$/.test(row.generationId)
				? row.generationId.slice(0, 8)
				: "unknown";
		const model =
			typeof row.model === "string" &&
			/^[A-Za-z0-9._:-]{1,100}$/.test(row.model)
				? row.model
				: "unknown";
		const stage =
			typeof row.failureStage === "string" &&
			SALES_REQUEST_GENERATION_FAILURE_STAGES.includes(
				row.failureStage as (typeof SALES_REQUEST_GENERATION_FAILURE_STAGES)[number],
			)
				? row.failureStage
				: "unknown";
		failures.push({
			reference,
			provider,
			model,
			stage,
			...(payload?.structuredOutputCause
				? { cause: payload.structuredOutputCause }
				: {}),
			...(payload?.statusCode !== undefined
				? { statusCode: payload.statusCode }
				: {}),
			...(payload?.providerStatus
				? { providerStatus: payload.providerStatus }
				: {}),
			...(payload?.retryable !== undefined
				? { retryable: payload.retryable }
				: {}),
			...(payload?.schemaIssues?.length
				? { schemaIssues: payload.schemaIssues }
				: {}),
			occurredAt: row.startedAt,
			...(Number.isInteger(row.latencyMs) && (row.latencyMs as number) >= 0
				? { latencyMs: Math.min(row.latencyMs as number, 300_000) }
				: {}),
			...(Number.isInteger(row.inputTokens) && (row.inputTokens as number) >= 0
				? { inputTokens: Math.min(row.inputTokens as number, 100_000_000) }
				: {}),
			...(Number.isInteger(row.outputTokens) &&
			(row.outputTokens as number) >= 0
				? { outputTokens: Math.min(row.outputTokens as number, 100_000_000) }
				: {}),
		});
	}

	return {
		attemptCount: [...providerCounts.values()].reduce(
			(total, entry) => total + entry.attempts,
			0,
		),
		failureCount: failures.length,
		providers: [...providerCounts.values()].sort((left, right) =>
			left.provider.localeCompare(right.provider),
		),
		recentFailures: failures
			.sort(
				(left, right) => right.occurredAt.getTime() - left.occurredAt.getTime(),
			)
			.slice(0, 20),
	};
}

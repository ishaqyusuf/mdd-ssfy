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
	hasText: boolean;
	startedAt: Date;
};

export type SalesRequestGenerationCompleteEvent = {
	generationId: string;
	status: SalesRequestGenerationStatus;
	completedAt: Date;
	latencyMs: number;
	provider?: string;
	model?: string;
	promptVersion?: string;
	schemaVersion?: number;
	inputTokens?: number;
	outputTokens?: number;
	issueCounts?: SalesRequestGenerationIssueCounts;
	failureStage?: SalesRequestProviderFailureDiagnostic["stage"];
};

export type SalesRequestGenerationTelemetry = {
	onStart?: (event: SalesRequestGenerationStartEvent) => Promise<void> | void;
	onComplete?: (
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
	status?: string | null;
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
	let inputTokens = 0;
	let outputTokens = 0;
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
		inputTokens += finiteInteger(row.inputTokens);
		outputTokens += finiteInteger(row.outputTokens);
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
		tokenTotals: { input: inputTokens, output: outputTokens },
		outcomeCounts: {
			applied,
			saveDrafted: rows.filter((row) => row.saveDraftOutcome === "saved")
				.length,
			saveFinal: rows.filter((row) => row.saveFinalOutcome === "saved").length,
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
		correction: {
			sampleCount: correctionValues.length,
			p50Ms: percentile(correctionValues, 0.5),
			p95Ms: percentile(correctionValues, 0.95),
		},
	};
}

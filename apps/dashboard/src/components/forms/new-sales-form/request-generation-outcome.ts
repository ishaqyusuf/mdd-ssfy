import type { RouterInputs } from "@api/trpc/routers/_app";

export const SALES_REQUEST_FEEDBACK_OUTCOMES = [
	{ value: "accepted", label: "Accepted" },
	{ value: "accepted-with-edits", label: "Accepted with edits" },
	{ value: "rejected", label: "Rejected" },
] as const;

export const SALES_REQUEST_ISSUE_CATEGORY_OPTIONS = [
	{ value: "ambiguous", label: "Ambiguous request" },
	{ value: "unreadable", label: "Unreadable content" },
	{ value: "unsupported", label: "Unsupported request" },
	{ value: "missing-component", label: "Missing component" },
	{ value: "hidden-component", label: "Hidden component" },
	{ value: "dependency", label: "Invalid dependency" },
	{ value: "unpriced", label: "Missing price" },
	{ value: "wrong-quantity", label: "Wrong quantity" },
	{ value: "wrong-delivery", label: "Wrong delivery" },
	{ value: "wrong-component", label: "Wrong component" },
	{ value: "unsafe-selection", label: "Unsafe or invented selection" },
	{ value: "other", label: "Other issue" },
] as const;

export const SALES_REQUEST_CHANGED_FIELD_CATEGORY_OPTIONS = [
	{ value: "customer", label: "Customer" },
	{ value: "delivery", label: "Delivery" },
	{ value: "line-items", label: "Line items" },
	{ value: "components", label: "Components" },
	{ value: "quantities", label: "Quantities" },
	{ value: "hpt", label: "House Package Tool" },
	{ value: "moulding", label: "Mouldings" },
	{ value: "services", label: "Services" },
	{ value: "notes", label: "Notes" },
	{ value: "extra-costs", label: "Extra costs" },
	{ value: "other", label: "Other field" },
] as const;

export type SalesRequestFeedbackOutcome =
	(typeof SALES_REQUEST_FEEDBACK_OUTCOMES)[number]["value"];
export type SalesRequestIssueCategory =
	(typeof SALES_REQUEST_ISSUE_CATEGORY_OPTIONS)[number]["value"];
export type SalesRequestChangedFieldCategory =
	(typeof SALES_REQUEST_CHANGED_FIELD_CATEGORY_OPTIONS)[number]["value"];

export type SalesRequestGenerationFeedbackSelection = {
	outcome: SalesRequestFeedbackOutcome;
	issueCategories: SalesRequestIssueCategory[];
	changedFieldCategories: SalesRequestChangedFieldCategory[];
};

export type SalesRequestGenerationOutcomeInput = Exclude<
	RouterInputs["salesRequest"]["recordOutcome"],
	void
>;

type ApplyResultForOutcome = {
	status:
		| "ready"
		| "applied"
		| "already-applied"
		| "blocked"
		| "configuration-stale"
		| "error";
	reason?: string;
};

export type SalesRequestGenerationSaveIntent =
	| "autosave"
	| "draft"
	| "close"
	| "new"
	| "final";

export type SalesRequestGenerationSaveAttribution = {
	generationId: string;
	stage: "draft" | "final";
};

type OutcomeWriter = (
	input: SalesRequestGenerationOutcomeInput,
) => Promise<unknown>;

const issueCategorySet = new Set<SalesRequestIssueCategory>(
	SALES_REQUEST_ISSUE_CATEGORY_OPTIONS.map((option) => option.value),
);
const changedFieldCategorySet = new Set<SalesRequestChangedFieldCategory>(
	SALES_REQUEST_CHANGED_FIELD_CATEGORY_OPTIONS.map((option) => option.value),
);

function boundedCategories<T extends string>(
	values: readonly T[],
	allowed: ReadonlySet<T>,
) {
	return [...new Set(values.filter((value) => allowed.has(value)))]
		.sort()
		.slice(0, 12);
}

export function getSalesRequestGenerationApplyOutcome(
	result: ApplyResultForOutcome,
): "applied" | "blocked" | "stale" | "unavailable" {
	if (result.status === "applied" || result.status === "already-applied") {
		return "applied";
	}
	if (
		result.status === "configuration-stale" ||
		(result.status === "blocked" && result.reason === "form-stale")
	) {
		return "stale";
	}
	if (result.status === "blocked" || result.status === "ready") {
		return "blocked";
	}
	return "unavailable";
}

export function getSalesRequestGenerationSaveStage(
	intent: SalesRequestGenerationSaveIntent,
): "draft" | "final" {
	return intent === "final" ? "final" : "draft";
}

export function buildSalesRequestGenerationFeedbackInput(
	input: SalesRequestGenerationFeedbackSelection & { generationId: string },
): SalesRequestGenerationOutcomeInput | null {
	const issueCategories = boundedCategories(
		input.issueCategories,
		issueCategorySet,
	);
	const changedFieldCategories = boundedCategories(
		input.changedFieldCategories,
		changedFieldCategorySet,
	);
	if (
		input.outcome === "accepted-with-edits" &&
		!changedFieldCategories.length
	) {
		return null;
	}
	if (input.outcome === "rejected" && !issueCategories.length) return null;
	return {
		generationId: input.generationId,
		kind: "feedback",
		outcome: input.outcome,
		issueCategories: input.outcome === "rejected" ? issueCategories : [],
		changedFieldCategories:
			input.outcome === "accepted-with-edits" ? changedFieldCategories : [],
	};
}

export function createSalesRequestGenerationOutcomeTracker(
	writeOutcome: OutcomeWriter,
) {
	let appliedGenerationId: string | null = null;

	async function writeBestEffort(input: SalesRequestGenerationOutcomeInput) {
		try {
			await writeOutcome(input);
			return true;
		} catch {
			return false;
		}
	}

	return {
		getAppliedGenerationId: () => appliedGenerationId,
		captureSave(stage: "draft" | "final") {
			return appliedGenerationId
				? ({ generationId: appliedGenerationId, stage } as const)
				: null;
		},
		async recordApplyResult(
			generationId: string,
			result: ApplyResultForOutcome,
		) {
			const outcome = getSalesRequestGenerationApplyOutcome(result);
			if (outcome === "applied") appliedGenerationId = generationId;
			return writeBestEffort({ generationId, kind: "apply", outcome });
		},
		async recordSave(
			attribution: SalesRequestGenerationSaveAttribution | null,
			outcome: "saved" | "failed",
		) {
			if (!attribution) return false;
			return writeBestEffort({
				generationId: attribution.generationId,
				kind: "save",
				stage: attribution.stage,
				outcome,
			});
		},
		async recordFeedback(input: SalesRequestGenerationFeedbackSelection) {
			if (!appliedGenerationId) return false;
			const payload = buildSalesRequestGenerationFeedbackInput({
				...input,
				generationId: appliedGenerationId,
			});
			if (!payload) return false;
			return writeBestEffort(payload);
		},
		clearAppliedGeneration(generationId?: string) {
			if (generationId && generationId !== appliedGenerationId) return;
			appliedGenerationId = null;
		},
	};
}

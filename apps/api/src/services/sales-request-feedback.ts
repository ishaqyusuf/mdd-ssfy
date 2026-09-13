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

const feedbackOutcomes = new Set([
	"accepted",
	"accepted-with-edits",
	"rejected",
]);
const issueCategories = new Set<string>(
	SALES_REQUEST_GENERATION_ISSUE_CATEGORIES,
);
const changedFieldCategories = new Set<string>(
	SALES_REQUEST_GENERATION_CHANGED_FIELD_CATEGORIES,
);

type PersistedSalesRequestFeedback = {
	feedbackOutcome?: string | null;
	feedbackIssueCategories?: unknown;
	feedbackChangedFieldCategories?: unknown;
};

function isBoundedCategoryList(
	value: unknown,
	allowed: ReadonlySet<string>,
): value is string[] {
	return (
		Array.isArray(value) &&
		value.length <= 12 &&
		value.every((entry) => typeof entry === "string" && allowed.has(entry))
	);
}

/** Validate current and legacy persisted feedback against one vocabulary. */
export function isValidSalesRequestPilotFeedback(
	row: PersistedSalesRequestFeedback,
) {
	if (
		typeof row.feedbackOutcome !== "string" ||
		!feedbackOutcomes.has(row.feedbackOutcome) ||
		!isBoundedCategoryList(row.feedbackIssueCategories, issueCategories)
	) {
		return false;
	}
	if (row.feedbackOutcome === "rejected") {
		return row.feedbackIssueCategories.length > 0;
	}
	if (row.feedbackOutcome === "accepted-with-edits") {
		return (
			isBoundedCategoryList(
				row.feedbackChangedFieldCategories,
				changedFieldCategories,
			) && row.feedbackChangedFieldCategories.length > 0
		);
	}
	return true;
}

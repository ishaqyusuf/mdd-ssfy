type LegacySalesOverviewMode =
	| "quote"
	| "sales"
	| "sales-production"
	| "dispatch-modal"
	| "production-tasks";

type SalesType = "quote" | "order";

export function composeLegacySalesOverviewOpenParams(
	orderNo: string,
	mode: LegacySalesOverviewMode,
	options: { assignedTo?: unknown } = {},
) {
	const assignedToProduction = Boolean(options.assignedTo);
	const salesType: SalesType = mode === "quote" ? "quote" : "order";

	return {
		"sales-overview-id": orderNo,
		"sales-type": salesType,
		mode: assignedToProduction ? "production-tasks" : mode,
		salesTab: assignedToProduction ? "production" : "general",
	};
}

export function composeLegacyQuoteOverviewOpenParams(quoteUuid: string) {
	return composeLegacySalesOverviewOpenParams(quoteUuid, "quote");
}

export function composeV2QuoteOverviewSheetParams(quoteId: string) {
	return {
		overviewSheetId: quoteId,
		overviewSheetType: "quote",
		overviewSheetMode: "quote",
	};
}

export function composeV2QuoteOverviewPageParams(quoteId: string) {
	return {
		overviewId: quoteId,
		overviewType: "quote",
		overviewMode: "quote",
	};
}

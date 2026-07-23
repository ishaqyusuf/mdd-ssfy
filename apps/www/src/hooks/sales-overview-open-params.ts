export type LegacySalesOverviewMode =
	| "quote"
	| "sales"
	| "sales-production"
	| "dispatch-modal"
	| "production-tasks";

type SalesType = "quote" | "order";
export type LegacySalesOverviewTab =
	| "general"
	| "production"
	| "transaction"
	| "transactions"
	| "activity"
	| "inbound"
	| "inventory"
	| "dispatch"
	| "notification"
	| "packing";

type SalesOverviewOpenOptions = {
	assignedTo?: unknown;
	dispatchId?: number | string | null;
	salesTab?: LegacySalesOverviewTab | null;
};

export function composeLegacySalesOverviewOpenParams(
	orderNo: string,
	mode: LegacySalesOverviewMode,
	options: SalesOverviewOpenOptions = {},
) {
	const assignedToProduction = Boolean(options.assignedTo);
	const salesType: SalesType = mode === "quote" ? "quote" : "order";
	const defaultTab =
		mode === "sales-production" || mode === "production-tasks"
			? "production"
			: mode === "dispatch-modal"
				? "packing"
				: "general";
	const dispatchId =
		options.dispatchId == null ? null : Number(options.dispatchId);

	return {
		"sales-overview-id": orderNo,
		"sales-type": salesType,
		mode: assignedToProduction ? "production-tasks" : mode,
		salesTab: assignedToProduction
			? ("production" as const)
			: (options.salesTab ?? defaultTab),
		...(Number.isFinite(dispatchId) ? { dispatchId } : {}),
	};
}

export function composeLegacyQuoteOverviewOpenParams(quoteUuid: string) {
	return composeLegacySalesOverviewOpenParams(quoteUuid, "quote");
}

export function buildSalesOverviewUrl(
	orderNo: string,
	mode: LegacySalesOverviewMode = "sales",
	options: SalesOverviewOpenOptions = {},
) {
	const params = new URLSearchParams();
	const values = composeLegacySalesOverviewOpenParams(orderNo, mode, options);

	for (const [key, value] of Object.entries(values)) {
		if (value != null) params.set(key, String(value));
	}

	return `/sales-book/orders?${params.toString()}`;
}

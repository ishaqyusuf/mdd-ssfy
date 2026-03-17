"use client";

export type SalesOverviewSurface = "sheet" | "page";

export type SalesOverviewAudience = "general" | "production" | "dispatch";

export type SalesOverviewTabId =
	| "general"
	| "production"
	| "transactions"
	| "dispatch"
	| "packing"
	| "notes";

export type LegacySalesOverviewTabId = SalesOverviewTabId | "transaction";

export const SALES_OVERVIEW_TAB_ORDER: SalesOverviewTabId[] = [
	"general",
	"production",
	"transactions",
	"dispatch",
	"packing",
	"notes",
];

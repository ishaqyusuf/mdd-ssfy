"use client";

export type SalesOverviewSurface = "sheet" | "page";

export type SalesOverviewAudience = "general" | "production" | "dispatch";

export type SalesOverviewTabId =
	| "overview"
	| "finance"
	| "operations"
	| "details";

export const SALES_OVERVIEW_TAB_ORDER: SalesOverviewTabId[] = [
	"overview",
	"finance",
	"operations",
	"details",
];

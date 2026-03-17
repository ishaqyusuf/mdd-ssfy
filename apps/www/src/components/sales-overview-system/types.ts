"use client";

export type SalesOverviewSurface = "sheet" | "page";

export type SalesOverviewAccessView = "salesAdmin" | "production" | "dispatch";

export type SalesOverviewTabId =
	| "overview"
	| "finance"
	| "production"
	| "dispatch"
	| "details";

export const SALES_OVERVIEW_TAB_ORDER: SalesOverviewTabId[] = [
	"overview",
	"finance",
	"production",
	"dispatch",
	"details",
];

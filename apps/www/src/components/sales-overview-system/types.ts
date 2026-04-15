"use client";

import type { useAuth } from "@/hooks/use-auth";
import type { RouterOutputs } from "@api/trpc/routers/_app";

export type SalesOverviewSurface = "sheet" | "page";

export type SalesOverviewAccessView = "salesAdmin" | "production" | "dispatch";

export type SalesOverviewTabId =
	| "overview"
	| "finance"
	| "production"
	| "dispatch"
	| "packing"
	| "transactions"
	| "details";

export const SALES_OVERVIEW_TAB_ORDER: SalesOverviewTabId[] = [
	"overview",
	"finance",
	"production",
	"dispatch",
	"packing",
	"transactions",
	"details",
];

export type SalesOverviewData = RouterOutputs["sales"]["getSaleOverview"];

export type SalesOverviewState = {
	surface: SalesOverviewSurface;
	overviewId: string | null;
	dispatchId: string | null;
	currentTab: SalesOverviewTabId;
	accessView: SalesOverviewAccessView;
	isAdmin: boolean;
	auth: ReturnType<typeof useAuth>;
	mode?: string | null;
	data: SalesOverviewData | null | undefined;
	prodQty: number;
	isQuote: boolean;
	title: string;
};

export type SalesOverviewActions = {
	setCurrentTab: (tab: SalesOverviewTabId) => void;
	close: () => void;
};

export type SalesOverviewMeta = {
	isLoading: boolean;
	hasOverview: boolean;
};

export type SalesOverviewContextValue = {
	state: SalesOverviewState;
	actions: SalesOverviewActions;
	meta: SalesOverviewMeta;
};

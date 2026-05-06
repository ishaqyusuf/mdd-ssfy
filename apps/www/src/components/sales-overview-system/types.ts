"use client";

import type { useAuth } from "@/hooks/use-auth";
import type { RouterOutputs } from "@api/trpc/routers/_app";

export type SalesOverviewSurface = "sheet" | "page";

export type SalesOverviewAccessView = "salesAdmin" | "production" | "dispatch";

export type SalesOverviewTabId =
	| "overview"
	| "production"
	| "transactions"
	| "activity"
	| "dispatch"
	| "packing"
	| "finance"
	| "details";

export const SALES_OVERVIEW_TAB_ORDER: SalesOverviewTabId[] = [
	"overview",
	"production",
	"transactions",
	"activity",
	"dispatch",
	"packing",
	"finance",
	"details",
];

type SalesOverviewProgressStat = {
	score?: number | null;
	total?: number | null;
	percentage?: number | null;
};

type SalesOverviewStatusGroup = {
	status?: string | null;
	color?: string | null;
};

export type SalesOverviewData = RouterOutputs["sales"]["getSaleOverview"] & {
	addressData?: {
		billing?: Record<string, unknown> | string | null;
		shipping?: Record<string, unknown> | string | null;
	} | null;
	costLines?: unknown[] | null;
	dispatchList?: unknown[] | null;
	stats?: {
		prodAssigned?: SalesOverviewProgressStat | null;
		prodCompleted?: SalesOverviewProgressStat | null;
	} | null;
	status?: {
		assignment?: SalesOverviewStatusGroup | null;
		delivery?: SalesOverviewStatusGroup | null;
		production?: SalesOverviewStatusGroup | null;
	} | null;
	uuid?: string | null;
};

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

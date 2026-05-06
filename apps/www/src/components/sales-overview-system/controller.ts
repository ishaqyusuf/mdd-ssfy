"use client";

import {
	SALES_OVERVIEW_TAB_ORDER,
	type SalesOverviewAccessView,
	type SalesOverviewTabId,
} from "./types";

export function normalizeSalesOverviewTab(
	tab: string | null | undefined,
): SalesOverviewTabId | null {
	if (!tab) return null;
	if (tab === "general") return "overview";
	if (tab === "transaction") return "transactions";
	if (tab === "inbound") return "activity";
	if (SALES_OVERVIEW_TAB_ORDER.includes(tab as SalesOverviewTabId)) {
		return tab as SalesOverviewTabId;
	}
	return null;
}

export function resolveSalesOverviewActiveTab({
	currentTab,
	availableTabs,
}: {
	currentTab: string | null | undefined;
	availableTabs: SalesOverviewTabId[];
}): SalesOverviewTabId {
	const normalizedTab = normalizeSalesOverviewTab(currentTab);
	return (
		availableTabs.find((tab) => tab === normalizedTab) ||
		availableTabs[0] ||
		"overview"
	);
}

export function resolveSalesOverviewAccessView({
	isAdmin,
	mode,
	canProduction,
	canDispatch,
}: {
	isAdmin: boolean;
	mode?: string | null;
	canProduction?: boolean;
	canDispatch?: boolean;
}): SalesOverviewAccessView {
	if (isAdmin) return "salesAdmin";
	if (mode === "dispatch-modal" || canDispatch) return "dispatch";
	if (mode === "production-tasks" || canProduction) return "production";
	return "salesAdmin";
}

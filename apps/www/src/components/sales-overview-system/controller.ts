"use client";

import { SALES_OVERVIEW_TAB_ORDER, type SalesOverviewTabId } from "./types";

export function normalizeSalesOverviewTab(
	tab: string | null | undefined,
): SalesOverviewTabId | null {
	if (!tab) return null;
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

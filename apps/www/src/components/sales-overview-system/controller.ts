"use client";

import {
	type LegacySalesOverviewTabId,
	SALES_OVERVIEW_TAB_ORDER,
	type SalesOverviewAudience,
	type SalesOverviewTabId,
} from "./types";

export function normalizeLegacySalesOverviewTab(
	tab: LegacySalesOverviewTabId | null | undefined,
): SalesOverviewTabId | null {
	if (tab === "transaction") return "transactions";
	if (!tab) return null;
	if (SALES_OVERVIEW_TAB_ORDER.includes(tab)) return tab;
	return null;
}

export function resolveSalesOverviewAudience({
	assignedTo,
	viewMode,
}: {
	assignedTo?: string | number | null;
	viewMode?: string | null;
}): SalesOverviewAudience {
	if (assignedTo) return "production";
	if (viewMode === "dispatch-modal") return "dispatch";
	return "general";
}

export function resolveSalesOverviewActiveTab({
	currentTab,
	availableTabs,
}: {
	currentTab: LegacySalesOverviewTabId | null | undefined;
	availableTabs: SalesOverviewTabId[];
}): SalesOverviewTabId {
	const normalizedTab = normalizeLegacySalesOverviewTab(currentTab);
	return (
		availableTabs.find((tab) => tab === normalizedTab) ||
		availableTabs[0] ||
		"general"
	);
}

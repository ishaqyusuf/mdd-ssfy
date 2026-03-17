"use client";

import type { ReactNode } from "react";

import { useSalesOverviewSystem } from "./provider";
import { SalesOverviewDetailsTab } from "./tabs/details-tab";
import { SalesOverviewDispatchTab } from "./tabs/dispatch-tab";
import { SalesOverviewFinanceTab } from "./tabs/finance-tab";
import { SalesOverviewOverviewTab } from "./tabs/overview-tab";
import { SalesOverviewProductionTab } from "./tabs/production-tab";
import type { SalesOverviewTabId } from "./types";

type TabDefinition = {
	value: SalesOverviewTabId;
	label: string;
	description: string;
	access: Array<"salesAdmin" | "production" | "dispatch">;
	content: ReactNode;
};

export function useSalesOverviewTabs() {
	const { accessView, isAdmin } = useSalesOverviewSystem();

	const tabs: TabDefinition[] = [
		{
			value: "overview",
			label: "Overview",
			description: "Customer, order, payment, and status summary",
			access: ["salesAdmin"],
			content: <SalesOverviewOverviewTab />,
		},
		{
			value: "finance",
			label: "Finance",
			description: "Invoice, balance, and cost context",
			access: ["salesAdmin"],
			content: <SalesOverviewFinanceTab />,
		},
		{
			value: "production",
			label: "Production",
			description: "Assignments, progress, and visible production items",
			access: ["salesAdmin", "production"],
			content: <SalesOverviewProductionTab />,
		},
		{
			value: "dispatch",
			label: "Dispatch",
			description: "Dispatch overview and current delivery status",
			access: ["salesAdmin", "dispatch"],
			content: <SalesOverviewDispatchTab />,
		},
		{
			value: "details",
			label: "Details",
			description: "Reference data and identifiers",
			access: ["salesAdmin"],
			content: <SalesOverviewDetailsTab />,
		},
	];

	if (isAdmin) return tabs;
	return tabs.filter((tab) => tab.access.includes(accessView));
}

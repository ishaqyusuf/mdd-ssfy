"use client";

import type { ReactNode } from "react";

import { SalesOverviewDetailsTab } from "./tabs/details-tab";
import { SalesOverviewFinanceTab } from "./tabs/finance-tab";
import { SalesOverviewOperationsTab } from "./tabs/operations-tab";
import { SalesOverviewOverviewTab } from "./tabs/overview-tab";
import type { SalesOverviewTabId } from "./types";

type TabDefinition = {
	value: SalesOverviewTabId;
	label: string;
	description: string;
	content: ReactNode;
};

export function useSalesOverviewTabs() {
	const tabs: TabDefinition[] = [
		{
			value: "overview",
			label: "Overview",
			description: "Customer, order, payment, and status summary",
			content: <SalesOverviewOverviewTab />,
		},
		{
			value: "finance",
			label: "Finance",
			description: "Invoice, balance, and cost context",
			content: <SalesOverviewFinanceTab />,
		},
		{
			value: "operations",
			label: "Operations",
			description: "Production and fulfillment status",
			content: <SalesOverviewOperationsTab />,
		},
		{
			value: "details",
			label: "Details",
			description: "Reference data and identifiers",
			content: <SalesOverviewDetailsTab />,
		},
	];

	return tabs;
}

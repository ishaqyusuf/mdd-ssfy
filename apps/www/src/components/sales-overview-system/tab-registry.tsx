"use client";

import type { ReactNode } from "react";

import { useSalesOverviewSystem } from "./provider";
import { SalesOverviewDetailsTab } from "./tabs/details-tab";
import { SalesOverviewDispatchTab } from "./tabs/dispatch-tab";
import { SalesOverviewFinanceTab } from "./tabs/finance-tab";
import { SalesOverviewOverviewTab } from "./tabs/overview-tab";
import { SalesOverviewPackingTab } from "./tabs/packing-tab";
import { SalesOverviewProductionTab } from "./tabs/production-tab";
import { SalesOverviewTransactionsTab } from "./tabs/transactions-tab";
import type { SalesOverviewTabId } from "./types";

type TabDefinition = {
	value: SalesOverviewTabId;
	label: string;
	description: string;
	access: Array<"salesAdmin" | "production" | "dispatch">;
	hideForQuote?: boolean;
	content: ReactNode;
};

export function useSalesOverviewTabs() {
	const {
		state: { accessView, isAdmin, isQuote },
	} = useSalesOverviewSystem();

	const tabs: TabDefinition[] = [
		{
			value: "overview",
			label: "Overview",
			description: "Customer, order, payment, and status at a glance",
			access: ["salesAdmin"],
			content: <SalesOverviewOverviewTab />,
		},
		{
			value: "finance",
			label: "Finance",
			description: "Invoice totals, payment collection, and cost lines",
			access: ["salesAdmin"],
			content: <SalesOverviewFinanceTab />,
		},
		{
			value: "production",
			label: "Production",
			description: "Assignment coverage and item-level progress",
			access: ["salesAdmin", "production"],
			hideForQuote: true,
			content: <SalesOverviewProductionTab />,
		},
		{
			value: "dispatch",
			label: "Dispatch",
			description: "Active deliveries and driver assignment",
			access: ["salesAdmin", "dispatch"],
			hideForQuote: true,
			content: <SalesOverviewDispatchTab />,
		},
		{
			value: "packing",
			label: "Packing",
			description: "Packing list and dispatch item management",
			access: ["salesAdmin", "dispatch"],
			hideForQuote: true,
			content: <SalesOverviewPackingTab />,
		},
		{
			value: "transactions",
			label: "Transactions",
			description: "Payment history and transaction records",
			access: ["salesAdmin"],
			hideForQuote: true,
			content: <SalesOverviewTransactionsTab />,
		},
		{
			value: "details",
			label: "Details",
			description: "Internal IDs, dates, and raw status snapshot",
			access: ["salesAdmin"],
			content: <SalesOverviewDetailsTab />,
		},
	];

	let visible = tabs;

	// Filter by role
	if (!isAdmin) {
		visible = visible.filter((tab) => tab.access.includes(accessView));
	}

	// Filter quote-inappropriate tabs
	if (isQuote) {
		visible = visible.filter((tab) => !tab.hideForQuote);
	}

	return visible;
}

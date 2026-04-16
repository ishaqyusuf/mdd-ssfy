"use client";

import type { ReactNode } from "react";

import { useSalesOverviewSystem } from "./provider";
import { resolveSalesOverviewTabVersion } from "./tab-versions";
import type { SalesOverviewTabId } from "./types";

type TabDefinition = {
	value: SalesOverviewTabId;
	label: string;
	description: string;
	version: string;
	availableVersions: string[];
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
			...resolveSalesOverviewTabVersion("overview"),
			description: "Customer, order, payment, and status at a glance",
			access: ["salesAdmin"],
		},
		{
			value: "finance",
			label: "Finance",
			...resolveSalesOverviewTabVersion("finance"),
			description: "Invoice totals, payment collection, and cost lines",
			access: ["salesAdmin"],
		},
		{
			value: "production",
			label: "Production",
			...resolveSalesOverviewTabVersion("production"),
			description: "Assignment coverage and item-level progress",
			access: ["salesAdmin", "production"],
			hideForQuote: true,
		},
		{
			value: "dispatch",
			label: "Dispatch",
			...resolveSalesOverviewTabVersion("dispatch"),
			description: "Active deliveries and driver assignment",
			access: ["salesAdmin", "dispatch"],
			hideForQuote: true,
		},
		{
			value: "packing",
			label: "Packing",
			...resolveSalesOverviewTabVersion("packing"),
			description: "Packing list and dispatch item management",
			access: ["salesAdmin", "dispatch"],
			hideForQuote: true,
		},
		{
			value: "transactions",
			label: "Transactions",
			...resolveSalesOverviewTabVersion("transactions"),
			description: "Payment history and transaction records",
			access: ["salesAdmin"],
			hideForQuote: true,
		},
		{
			value: "details",
			label: "Details",
			...resolveSalesOverviewTabVersion("details"),
			description: "Internal IDs, dates, and raw status snapshot",
			access: ["salesAdmin"],
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

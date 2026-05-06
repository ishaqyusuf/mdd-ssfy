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
	badge?: ReactNode;
	disabled?: boolean;
	hideForQuote?: boolean;
	hidden?: boolean;
	content: ReactNode;
};

export function useSalesOverviewTabs() {
	const {
		state: { accessView, isAdmin, isQuote, mode, prodQty },
	} = useSalesOverviewSystem();
	const isDispatchMode = mode === "dispatch-modal";
	const isProductionMode =
		mode === "production-tasks" || mode === "sales-production";

	const tabs: TabDefinition[] = [
		{
			value: "overview",
			label: "General",
			...resolveSalesOverviewTabVersion("overview"),
			description: "Customer, order, payment, and status details",
			access: ["salesAdmin"],
			hidden: isDispatchMode || isProductionMode,
		},
		{
			value: "production",
			label: "Productions",
			...resolveSalesOverviewTabVersion("production"),
			description: "Production assignments and item-level progress",
			access: ["salesAdmin", "production", "dispatch"],
			badge: prodQty > 0 ? prodQty : 0,
			disabled: !isProductionMode && !isDispatchMode && prodQty <= 0,
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
			value: "activity",
			label: isProductionMode
				? "Notes"
				: isDispatchMode
					? "General"
					: "Activity",
			...resolveSalesOverviewTabVersion("activity"),
			description: "Sales activity, notes, and inbound updates",
			access: ["salesAdmin", "production", "dispatch"],
		},
		{
			value: "dispatch",
			label: "Dispatch",
			...resolveSalesOverviewTabVersion("dispatch"),
			description: "Active deliveries and driver assignment",
			access: ["salesAdmin"],
			hideForQuote: true,
			hidden: isDispatchMode || isProductionMode,
		},
		{
			value: "packing",
			label: isDispatchMode ? "Packing List" : "Packing",
			...resolveSalesOverviewTabVersion("packing"),
			description: "Packing list and dispatch item management",
			access: ["dispatch"],
			hideForQuote: true,
			hidden: !isDispatchMode,
		},
		{
			value: "finance",
			label: "Finance",
			...resolveSalesOverviewTabVersion("finance"),
			description: "Invoice totals, payment collection, and cost lines",
			access: ["salesAdmin"],
			hidden: true,
		},
		{
			value: "details",
			label: "Details",
			...resolveSalesOverviewTabVersion("details"),
			description: "Internal IDs, dates, and raw status snapshot",
			access: ["salesAdmin"],
			hidden: true,
		},
	];

	let visible = tabs.filter((tab) => !tab.hidden);

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

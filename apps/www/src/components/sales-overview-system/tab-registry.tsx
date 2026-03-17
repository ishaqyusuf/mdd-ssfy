"use client";

import type { ReactNode } from "react";

import Note from "@/modules/notes";
import { noteTagFilter } from "@/modules/notes/utils";

import { Badge } from "@gnd/ui/badge";

import { TransactionsTab } from "../sheets/customer-overview-sheet/transactions-tab";
import { DispatchTab } from "../sheets/sales-overview-sheet/dispatch-tab";
import { GeneralTab } from "../sheets/sales-overview-sheet/general-tab";
import { PackingTab } from "../sheets/sales-overview-sheet/packing-tab";
import { ProductionTab } from "../sheets/sales-overview-sheet/production-tab";
import { useSalesOverviewSystem } from "./provider";
import type { SalesOverviewAudience, SalesOverviewTabId } from "./types";

type TabDefinition = {
	value: SalesOverviewTabId;
	label: string;
	disabled?: boolean;
	badge?: ReactNode;
	audiences: SalesOverviewAudience[];
	hidden?: boolean;
	content: ReactNode;
};

export function useSalesOverviewTabs() {
	const { audience, data, prodQty, isQuote } = useSalesOverviewSystem();

	const tabs: TabDefinition[] = [
		{
			value: "general",
			label: "General",
			audiences: ["general", "dispatch"],
			content: <GeneralTab />,
		},
		{
			value: "production",
			label: "Productions",
			audiences: ["general", "dispatch", "production"],
			disabled: audience === "general" ? !prodQty : false,
			hidden: audience === "general" ? isQuote : false,
			badge:
				audience === "general" ? (
					<Badge className="ml-2" variant={prodQty ? "default" : "outline"}>
						{prodQty}
					</Badge>
				) : null,
			content: <ProductionTab />,
		},
		{
			value: "transactions",
			label: "Transactions",
			audiences: ["general"],
			hidden: isQuote,
			content: <TransactionsTab salesId={data?.orderId} />,
		},
		{
			value: "dispatch",
			label: "Dispatch",
			audiences: ["general"],
			hidden: isQuote,
			content: <DispatchTab />,
		},
		{
			value: "packing",
			label: "Packing List",
			audiences: ["dispatch"],
			content: <PackingTab />,
		},
		{
			value: "notes",
			label: "Notes",
			audiences: ["production"],
			content: (
				<Note
					subject="Production Note"
					headline=""
					statusFilters={["public"]}
					typeFilters={["production", "general"]}
					tagFilters={[noteTagFilter("salesId", data?.id)]}
				/>
			),
		},
	];

	return tabs.filter((tab) => tab.audiences.includes(audience) && !tab.hidden);
}

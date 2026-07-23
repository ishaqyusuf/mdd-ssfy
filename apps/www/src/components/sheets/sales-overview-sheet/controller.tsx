"use client";

import type { ReactNode } from "react";

import { SalesOverviewInbox } from "@/components/chat";
import { SalesOverviewInventoryContent } from "@/components/sales-overview-system/tabs/inventory-tab";
import Note from "@/modules/notes";
import { noteTagFilter } from "@/modules/notes/utils";

import { TransactionsTab } from "../customer-overview-sheet/transactions-tab";
import { useSaleOverview } from "./context";
import { DispatchTab } from "./dispatch-tab";
import { GeneralTab } from "./general-tab";
import { PackingTab } from "./packing-tab";
import { ProductionTab } from "./production-tab";
import type {
	LegacySalesOverviewMode,
	LegacySalesOverviewTabDefinition,
	LegacySalesOverviewTabId,
} from "./types";
export { resolveLegacySalesOverviewMode } from "./mode";

function LegacySalesOverviewInventoryTab() {
	const { data } = useSaleOverview();

	return <SalesOverviewInventoryContent salesOrderId={data?.id} />;
}

export function resolveLegacySalesOverviewActiveTab({
	currentTab,
	tabs,
}: {
	currentTab?: string | null;
	tabs: LegacySalesOverviewTabDefinition[];
}): LegacySalesOverviewTabId {
	const normalizedCurrentTab =
		currentTab === "inbound" ? "activity" : currentTab;

	return (
		tabs.find((tab) => tab.value === normalizedCurrentTab && !tab.hidden)
			?.value ??
		tabs.find((tab) => !tab.hidden)?.value ??
		"general"
	);
}

export function createLegacySalesOverviewTabs({
	mode,
	isQuote,
	prodQty,
	saleId,
	orderId,
}: {
	mode: LegacySalesOverviewMode;
	isQuote: boolean;
	prodQty: number;
	saleId?: number | null;
	orderId?: string | null;
}): LegacySalesOverviewTabDefinition[] {
	const prodBadge = prodQty > 0 ? prodQty : 0;

	switch (mode) {
		case "assigned-production":
			return [
				{
					value: "production",
					label: "Productions",
					content: <ProductionTab />,
				},
				{
					value: "production-notes",
					label: "Notes",
					content: (
						<Note
							subject="Production Note"
							headline=""
							statusFilters={["public"]}
							typeFilters={["production", "general"]}
							tagFilters={[noteTagFilter("salesId", saleId)]}
						/>
					),
				},
			];
		case "dispatch-modal":
			return [
				{
					value: "production",
					label: "Productions",
					content: <ProductionTab />,
				},
				{
					value: "dispatch-notes",
					label: "General",
				},
				{
					value: "packing",
					label: "Packing List",
					content: <PackingTab />,
				},
			];
		default:
			return [
				{
					value: "general",
					label: "General",
					content: <GeneralTab />,
				},
				{
					value: "production",
					label: "Productions",
					hidden: isQuote,
					badge: prodBadge ? (prodBadge as ReactNode) : undefined,
					content: <ProductionTab />,
				},
				{
					value: "transactions",
					label: "Transactions",
					hidden: isQuote,
					content: <TransactionsTab salesId={orderId || undefined} />,
				},
				{
					value: "activity",
					label: "Activity",
					content: (
						<div className="p-1">
							<SalesOverviewInbox
								saleData={{
									id: saleId,
									orderId,
								}}
								variant="activity"
							/>
						</div>
					),
				},
				{
					value: "inventory",
					label: "Inventory",
					hidden: isQuote,
					badge: "New",
					content: <LegacySalesOverviewInventoryTab />,
				},
				{
					value: "dispatch",
					label: "Dispatch",
					hidden: isQuote,
					content: <DispatchTab />,
				},
				{
					value: "packing",
					label: "Packing",
					hidden: true,
					content: <PackingTab />,
				},
			];
	}
}

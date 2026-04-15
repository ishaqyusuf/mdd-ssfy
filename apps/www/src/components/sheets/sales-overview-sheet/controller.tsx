"use client";

import type { ReactNode } from "react";

import { SalesOverviewInbox } from "@/components/chat";
import Note from "@/modules/notes";
import { noteTagFilter } from "@/modules/notes/utils";

import { TransactionsTab } from "../customer-overview-sheet/transactions-tab";
import { DispatchTab } from "./dispatch-tab";
import { GeneralTab } from "./general-tab";
import { PackingTab } from "./packing-tab";
import { ProductionTab } from "./production-tab";
import type {
	LegacySalesOverviewMode,
	LegacySalesOverviewTabDefinition,
	LegacySalesOverviewTabId,
} from "./types";

export function shouldRenderLegacySalesOverviewSheet({
	legacyOverviewId,
	v2OverviewId,
	v2OverviewSheetId,
}: {
	legacyOverviewId?: string | null;
	v2OverviewId?: string | null;
	v2OverviewSheetId?: string | null;
}) {
	return !!legacyOverviewId && !v2OverviewId && !v2OverviewSheetId;
}

export function resolveLegacySalesOverviewMode({
	assignedTo,
	viewMode,
}: {
	assignedTo?: string | number | null;
	viewMode?: string | null;
}): LegacySalesOverviewMode {
	if (assignedTo) return "assigned-production";
	if (viewMode === "dispatch-modal") return "dispatch-modal";
	return "default";
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
					disabled: !prodQty,
					hidden: isQuote,
					badge: prodBadge as ReactNode,
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

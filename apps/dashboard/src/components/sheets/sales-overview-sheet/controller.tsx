"use client";

import type { ReactNode } from "react";

import { SalesOverviewInbox } from "@/components/chat";
import { SalesOverviewInventoryContent } from "@/components/sales-overview-system/tabs/inventory-tab";
import Note from "@/modules/notes";
import { noteTagFilter } from "@/modules/notes/utils";

import { useSaleOverview } from "./context";
import { DispatchTab } from "./dispatch-tab";
import type { GeneralTabProps } from "./general-tab";
import { GeneralTabGateway } from "./general/general-tab-gateway";
import { PackingTab } from "./packing-tab";
import { ProductionTab } from "./production-tab";
import { TransactionsTab } from "./transactions-tab";
import type {
	LegacySalesOverviewMode,
	LegacySalesOverviewTabDefinition,
	LegacySalesOverviewTabId,
} from "./types";
export { resolveLegacySalesOverviewMode } from "./mode";

function LegacySalesOverviewInventoryTab({
	onCreateInbound,
	onViewInbound,
}: {
	onCreateInbound?: () => void;
	onViewInbound?: (inboundId: number) => void;
}) {
	const { data } = useSaleOverview();

	return (
		<SalesOverviewInventoryContent
			salesOrderId={data?.id}
			onCreateInbound={onCreateInbound}
			onViewInbound={onViewInbound}
		/>
	);
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
	onEditAddress,
	onEditCustomer,
	onCreateInbound,
	onViewInbound,
	onViewPayment,
	onCreatePayment,
}: {
	mode: LegacySalesOverviewMode;
	isQuote: boolean;
	prodQty: number;
	saleId?: number | null;
	orderId?: string | null;
	onEditAddress?: GeneralTabProps["onEditAddress"];
	onEditCustomer?: GeneralTabProps["onEditCustomer"];
	onCreateInbound?: () => void;
	onViewInbound?: (inboundId: number) => void;
	onViewPayment?: (transactionId: string) => void;
	onCreatePayment?: () => void;
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
					content: (
						<GeneralTabGateway
							onCreatePayment={onCreatePayment}
							onEditAddress={onEditAddress}
							onEditCustomer={onEditCustomer}
						/>
					),
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
					content: (
						<TransactionsTab
							salesId={orderId || undefined}
							onCreatePayment={onCreatePayment}
							onViewTransaction={onViewPayment}
						/>
					),
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
								onOpenInbound={onViewInbound}
							/>
						</div>
					),
				},
				{
					value: "inventory",
					label: "Inventory",
					hidden: isQuote,
					content: (
						<LegacySalesOverviewInventoryTab
							onCreateInbound={onCreateInbound}
							onViewInbound={onViewInbound}
						/>
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

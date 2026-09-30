"use client";

import { SalesOverviewInventoryContent } from "@/components/sales-overview-system/tabs/inventory-tab";
import Note from "@/modules/notes";
import { noteTagFilter } from "@/modules/notes/utils";

import {
	SalesOverviewActivity,
	type SalesOverviewActivityProps,
} from "./activity-tab";
import { useSaleOverview } from "./context";
import { DispatchTab } from "./dispatch-tab";
import type { GeneralTabProps } from "./general-tab";
import { GeneralTabGateway } from "./general/general-tab-gateway";
import { PackingTab } from "./packing-tab";
import { ProductionTabGateway } from "./production/production-tab-gateway";
import { TransactionsTab } from "./transactions-tab";
import type {
	LegacySalesOverviewMode,
	LegacySalesOverviewTabDefinition,
} from "./types";
export { resolveLegacySalesOverviewMode } from "./mode";

function LegacySalesOverviewInventoryTab({
	onCreateInbound,
	onViewInbound,
	inboundCreateOpen,
}: {
	onCreateInbound?: (mode?: "create_inbound" | "mark_available") => void;
	onViewInbound?: (inboundId: number) => void;
	inboundCreateOpen?: boolean;
}) {
	const { data } = useSaleOverview();

	return (
		<SalesOverviewInventoryContent
			salesOrderId={data?.id}
			onCreateInbound={onCreateInbound}
			onViewInbound={onViewInbound}
			inboundCreateOpen={inboundCreateOpen}
		/>
	);
}

export { resolveLegacySalesOverviewActiveTab } from "./tab-navigation";

export function createLegacySalesOverviewTabs({
	mode,
	isQuote,
	tabCounts,
	saleId,
	orderId,
	onEditAddress,
	onEditCustomer,
	onCreateInbound,
	onViewInbound,
	inboundCreateOpen,
	onViewPayment,
	onCreatePayment,
	packItemsOpen,
	onPackItemsOpenChange,
	activityDraftRef,
}: {
	mode: LegacySalesOverviewMode;
	isQuote: boolean;
	tabCounts?: { productionQty: number; transactions: number; dispatch: number };
	saleId?: number | null;
	orderId?: string | null;
	onEditAddress?: GeneralTabProps["onEditAddress"];
	onEditCustomer?: GeneralTabProps["onEditCustomer"];
	onCreateInbound?: (mode?: "create_inbound" | "mark_available") => void;
	onViewInbound?: (inboundId: number) => void;
	inboundCreateOpen?: boolean;
	onViewPayment?: (transactionId: string) => void;
	onCreatePayment?: () => void;
	packItemsOpen: boolean;
	onPackItemsOpenChange: (open: boolean) => void;
	activityDraftRef?: SalesOverviewActivityProps["draftRef"];
}): LegacySalesOverviewTabDefinition[] {
	const productionNavigation = {
		badge: tabCounts?.productionQty,
		disabled: tabCounts?.productionQty === 0,
	};

	switch (mode) {
		case "assigned-production":
			return [
				{
					value: "production",
					label: "Productions",
					...productionNavigation,
					content: <ProductionTabGateway onCreateInbound={onCreateInbound} onViewInbound={onViewInbound} />,
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
					...productionNavigation,
					content: <ProductionTabGateway onCreateInbound={onCreateInbound} onViewInbound={onViewInbound} />,
				},
				{
					value: "packing",
					label: "Overview",
					content: (
						<PackingTab
							packItemsOpen={packItemsOpen}
							onPackItemsOpenChange={onPackItemsOpenChange}
						/>
					),
				},
				{
					value: "inventory",
					label: "Inventory",
					content: (
						<LegacySalesOverviewInventoryTab
							onCreateInbound={onCreateInbound}
							onViewInbound={onViewInbound}
							inboundCreateOpen={inboundCreateOpen}
						/>
					),
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
					...productionNavigation,
					hidden: isQuote,
					content: <ProductionTabGateway onCreateInbound={onCreateInbound} onViewInbound={onViewInbound} />,
				},
				{
					value: "transactions",
					label: "Transactions",
					badge: tabCounts?.transactions || undefined,
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
						<SalesOverviewActivity
							draftRef={activityDraftRef}
							onOpenInbound={onViewInbound}
						/>
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
							inboundCreateOpen={inboundCreateOpen}
						/>
					),
				},
				{
					value: "dispatch",
					label: "Dispatch",
					badge: tabCounts?.dispatch || undefined,
					hidden: isQuote,
					content: <DispatchTab />,
				},
				{
					value: "packing",
					label: "Packing",
					content: (
						<PackingTab
							packItemsOpen={packItemsOpen}
							onPackItemsOpenChange={onPackItemsOpenChange}
						/>
					),
				},
			];
	}
}

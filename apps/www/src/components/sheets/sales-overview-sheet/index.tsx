"use client";

import { DataSkeleton } from "@/components/data-skeleton";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { Tabs } from "@gnd/ui/tabs";

import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { SalesOverviewProvider, useSaleOverview } from "./context";
import {
	createLegacySalesOverviewTabs,
	resolveLegacySalesOverviewActiveTab,
	resolveLegacySalesOverviewMode,
} from "./controller";
import { LegacySalesOverviewHeader, LegacySalesOverviewPanels } from "./layout";
import type { LegacySalesOverviewTabId } from "./types";

export default function SalesOverviewSheet() {
	const query = useSalesOverviewQuery();

	return query["sales-overview-id"] ? <Modal /> : null;
}
function Modal() {
	return (
		<SalesOverviewProvider args={[]}>
			<Content />
		</SalesOverviewProvider>
	);
}
function Content() {
	usePageTitle();
	const query = useSalesOverviewQuery();
	const { data } = useSaleOverview();
	const isQuote =
		data?.type === "quote" || query.params["sales-type"] === "quote";
	const mode = resolveLegacySalesOverviewMode({
		assignedTo: query.assignedTo,
		requestedMode: query.params.mode,
		viewMode: query.viewMode,
	});
	const tabs = createLegacySalesOverviewTabs({
		mode,
		isQuote,
		prodQty: 0,
		saleId: data?.id,
		orderId: data?.orderId,
	});
	const activeTab = resolveLegacySalesOverviewActiveTab({
		currentTab: query?.params?.salesTab,
		tabs,
	});
	const setActiveTab = (tab: LegacySalesOverviewTabId) => {
		query.setParams({
			salesTab: tab as never,
			"prod-item-tab": null,
			"prod-item-view": null,
			dispatchOverviewId: null,
		});
	};

	return (
		<CustomSheet
			sheetName="sales-overview-sheet"
			open
			onOpenChange={query.close}
			floating
			rounded
			size="2xl"
		>
			<Tabs
				value={activeTab}
				onValueChange={(e) => {
					setActiveTab(e as LegacySalesOverviewTabId);
				}}
			>
				<LegacySalesOverviewHeader
					tabs={tabs}
					activeTab={activeTab as LegacySalesOverviewTabId}
					onTabChange={setActiveTab}
				/>
			</Tabs>
			<CustomSheetContent className="-mt-4">
				<Tabs value={activeTab}>
					<LegacySalesOverviewPanels activeTab={activeTab} tabs={tabs} />
				</Tabs>
			</CustomSheetContent>
		</CustomSheet>
	);
}

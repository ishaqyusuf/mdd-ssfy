"use client";

import { DataSkeleton } from "@/components/data-skeleton";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesOverviewV2PageQuery } from "@/hooks/use-sales-overview-v2-page-query";
import { useSalesOverviewV2SheetQuery } from "@/hooks/use-sales-overview-v2-sheet-query";
import { Tabs } from "@gnd/ui/tabs";

import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { SalesOverviewProvider, useSaleOverview } from "./context";
import {
	createLegacySalesOverviewTabs,
	resolveLegacySalesOverviewActiveTab,
	resolveLegacySalesOverviewMode,
	shouldRenderLegacySalesOverviewSheet,
} from "./controller";
import { LegacySalesOverviewHeader, LegacySalesOverviewPanels } from "./layout";
import type { LegacySalesOverviewTabId } from "./types";

export default function SalesOverviewSheet() {
	const query = useSalesOverviewQuery();
	const v2PageQuery = useSalesOverviewV2PageQuery();
	const v2SheetQuery = useSalesOverviewV2SheetQuery();

	return shouldRenderLegacySalesOverviewSheet({
		legacyOverviewId: query["sales-overview-id"],
		v2OverviewId: v2PageQuery.params.overviewId,
		v2OverviewSheetId: v2SheetQuery.params.overviewSheetId,
	}) ? (
		<Modal />
	) : null;
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
	const prodQty = data?.salesStat?.prodAssigned?.total || 0;
	const isQuote = data?.type === "quote";
	const mode = resolveLegacySalesOverviewMode({
		assignedTo: query.assignedTo,
		viewMode: query.viewMode,
	});
	const tabs = createLegacySalesOverviewTabs({
		mode,
		isQuote,
		prodQty,
		saleId: data?.id,
		orderId: data?.orderId,
	});
	const activeTab = resolveLegacySalesOverviewActiveTab({
		currentTab: query?.params?.salesTab,
		tabs,
	});

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
					query.setParams({
						salesTab: e as never,
						"prod-item-tab": null,
						"prod-item-view": null,
						dispatchOverviewId: null,
					});
				}}
			>
				<LegacySalesOverviewHeader
					tabs={tabs}
					activeTab={activeTab as LegacySalesOverviewTabId}
				/>
			</Tabs>
			<CustomSheetContent className="-mt-4">
				<Tabs value={activeTab}>
					<LegacySalesOverviewPanels tabs={tabs} />
				</Tabs>
			</CustomSheetContent>
		</CustomSheet>
	);
}

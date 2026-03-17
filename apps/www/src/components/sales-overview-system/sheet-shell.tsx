"use client";

import { useMemo } from "react";

import { usePageTitle } from "@/hooks/use-page-title";

import { Tabs } from "@gnd/ui/tabs";

import {
	CustomSheet,
	CustomSheetContent,
} from "../sheets/custom-sheet-content";
import { resolveSalesOverviewActiveTab } from "./controller";
import { SalesOverviewHeader, SalesOverviewPanels } from "./layout";
import { useSalesOverviewSystem } from "./provider";
import { useSalesOverviewTabs } from "./tab-registry";
import type { SalesOverviewTabId } from "./types";

export function SalesOverviewSheetShell() {
	usePageTitle();
	const { query } = useSalesOverviewSystem();
	const tabs = useSalesOverviewTabs();
	const activeTab = useMemo<SalesOverviewTabId>(() => {
		return resolveSalesOverviewActiveTab({
			currentTab: query.params.salesTab,
			availableTabs: tabs.map((tab) => tab.value),
		});
	}, [query.params.salesTab, tabs]);

	const handleTabChange = (tab: SalesOverviewTabId) => {
		query.setParams({
			salesTab: tab,
			"prod-item-tab": null,
			"prod-item-view": null,
			dispatchOverviewId: null,
		});
	};

	return (
		<CustomSheet
			sheetName="sales-overview-system-sheet"
			open
			onOpenChange={query.close}
			floating
			rounded
			size="2xl"
		>
			<Tabs
				value={activeTab}
				onValueChange={(tab) => handleTabChange(tab as SalesOverviewTabId)}
			>
				<SalesOverviewHeader onTabChange={handleTabChange} />
				<CustomSheetContent className="-mt-4">
					<SalesOverviewPanels activeTab={activeTab} />
				</CustomSheetContent>
			</Tabs>
		</CustomSheet>
	);
}

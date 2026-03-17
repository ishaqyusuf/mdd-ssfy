"use client";

import { useMemo } from "react";

import { usePageTitle } from "@/hooks/use-page-title";

import { Tabs } from "@gnd/ui/tabs";

import { resolveSalesOverviewActiveTab } from "./controller";
import { SalesOverviewHeader, SalesOverviewPanels } from "./layout";
import { useSalesOverviewSystem } from "./provider";
import { useSalesOverviewTabs } from "./tab-registry";
import type { SalesOverviewTabId } from "./types";

export function SalesOverviewPageShell() {
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
		<div className="flex h-full flex-col gap-4 p-4 md:p-6">
			<Tabs
				value={activeTab}
				onValueChange={(tab) => handleTabChange(tab as SalesOverviewTabId)}
			>
				<SalesOverviewHeader onTabChange={handleTabChange} />
				<div className="flex flex-1 flex-col">
					<SalesOverviewPanels activeTab={activeTab} />
				</div>
			</Tabs>
		</div>
	);
}

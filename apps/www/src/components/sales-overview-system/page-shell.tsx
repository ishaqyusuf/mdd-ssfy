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
	const { currentTab, query } = useSalesOverviewSystem();
	const tabs = useSalesOverviewTabs();
	const activeTab = useMemo<SalesOverviewTabId>(() => {
		return resolveSalesOverviewActiveTab({
			currentTab,
			availableTabs: tabs.map((tab) => tab.value),
		});
	}, [currentTab, tabs]);

	const handleTabChange = (tab: SalesOverviewTabId) => {
		query.setParams({
			...(query.params["sales-overview-v2-id"]
				? { "sales-overview-v2-tab": tab }
				: { "sales-overview-v2-sheet-tab": tab }),
		});
	};

	return (
		<div className="flex h-full flex-col gap-6 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.18),_transparent_40%),linear-gradient(180deg,_rgba(248,250,252,1),_rgba(241,245,249,0.7))] p-4 md:p-6">
			<Tabs
				value={activeTab}
				onValueChange={(tab) => handleTabChange(tab as SalesOverviewTabId)}
			>
				<SalesOverviewHeader
					activeTab={activeTab}
					onTabChange={handleTabChange}
				/>
				<div className="flex flex-1 flex-col">
					<SalesOverviewPanels activeTab={activeTab} />
				</div>
			</Tabs>
		</div>
	);
}

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

export function SalesOverviewSheetShell({ onClose }: { onClose?: () => void }) {
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
			"sales-overview-v2-sheet-tab": tab,
		});
	};

	return (
		<CustomSheet
			sheetName="sales-overview-system-sheet"
			open
			onOpenChange={(open) => {
				if (!open) {
					if (onClose) onClose();
					else query.close();
				}
			}}
			floating
			rounded
			size="2xl"
		>
			<Tabs
				value={activeTab}
				onValueChange={(tab) => handleTabChange(tab as SalesOverviewTabId)}
			>
				<SalesOverviewHeader
					activeTab={activeTab}
					onTabChange={handleTabChange}
				/>
				<CustomSheetContent className="-mt-4">
					<SalesOverviewPanels activeTab={activeTab} />
				</CustomSheetContent>
			</Tabs>
		</CustomSheet>
	);
}

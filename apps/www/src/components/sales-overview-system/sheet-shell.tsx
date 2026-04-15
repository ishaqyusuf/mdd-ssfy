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
	const {
		state: { currentTab },
		actions,
	} = useSalesOverviewSystem();
	const tabs = useSalesOverviewTabs();
	const activeTab = useMemo<SalesOverviewTabId>(() => {
		return resolveSalesOverviewActiveTab({
			currentTab,
			availableTabs: tabs.map((tab) => tab.value),
		});
	}, [currentTab, tabs]);

	return (
		<CustomSheet
			sheetName="sales-overview-system-sheet"
			open
			onOpenChange={(open) => {
				if (!open) {
					if (onClose) onClose();
					else actions.close();
				}
			}}
			floating
			rounded
			size="2xl"
		>
			<Tabs
				value={activeTab}
				onValueChange={(tab) =>
					actions.setCurrentTab(tab as SalesOverviewTabId)
				}
			>
				<SalesOverviewHeader
					activeTab={activeTab}
					onTabChange={actions.setCurrentTab}
				/>
				<CustomSheetContent className="-mt-4">
					<SalesOverviewPanels activeTab={activeTab} />
				</CustomSheetContent>
			</Tabs>
		</CustomSheet>
	);
}

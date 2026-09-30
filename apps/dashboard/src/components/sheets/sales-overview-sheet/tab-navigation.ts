import type {
	LegacySalesOverviewTabDefinition,
	LegacySalesOverviewTabId,
} from "./types";

export function buildLegacySalesOverviewTabNavigation(
	tab: LegacySalesOverviewTabId,
	currentPaneKind?: string | null,
) {
	return {
		closePackingPane: currentPaneKind === "packing",
		params: {
			salesTab: tab,
			"prod-item-tab": null,
			"prod-item-view": null,
			dispatchOverviewId: null,
		},
	};
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
		tabs.find(
			(tab) =>
				tab.value === normalizedCurrentTab && !tab.hidden && !tab.disabled,
		)?.value ??
		tabs.find((tab) => !tab.hidden && !tab.disabled)?.value ??
		"general"
	);
}

import type { LegacySalesOverviewTabId } from "./types";

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

import type {
	LegacySalesOverviewMode,
	LegacySalesOverviewTabId,
} from "./types";

export function resolveSalesOverviewActivityPresentation({
	mode,
	activeTab,
	isSideBySide,
	hasSale,
	dismissed,
	hasWorkflowPane,
}: {
	mode: LegacySalesOverviewMode;
	activeTab: LegacySalesOverviewTabId;
	isSideBySide: boolean;
	hasSale: boolean;
	dismissed: boolean;
	hasWorkflowPane: boolean;
}) {
	const secondaryActivity = mode === "default" && isSideBySide;
	const primaryTab =
		secondaryActivity && activeTab === "activity" ? "general" : activeTab;

	return {
		primaryTab,
		hideActivityTab: secondaryActivity,
		showActivityPane:
			secondaryActivity &&
			primaryTab === "general" &&
			hasSale &&
			!dismissed &&
			!hasWorkflowPane,
	};
}

import { useState } from "react";
import { View } from "react-native";
import { PreviewBottomFilterSheet } from "../components/preview-bottom-filter-sheet";
import { PreviewMetricCard } from "../components/preview-metric";
import { PreviewRecordDetail } from "../components/preview-record-detail";
import { PreviewRecordList } from "../components/preview-record-list";
import { PreviewBottomNav, PreviewShell } from "../components/preview-shell";
import { opsMetrics, opsRecords } from "../data/sample-data";
import {
	opsConsoleTabs,
	opsDetailTabs,
	opsFilterGroups,
} from "../data/template-tabs";
import { opsConsoleSystem } from "../design-systems/template-a-ops-console";
import { usePreviewDesignSystem } from "../design-systems/types";
import { usePreviewFilters } from "../hooks/use-preview-filters";
import { usePreviewSelection } from "../hooks/use-preview-selection";
import { usePreviewTabs } from "../hooks/use-preview-tabs";
import { filterPreviewRecords } from "../utils/preview-filtering";

const opsTabCopy: Record<string, { title: string; subtitle: string }> = {
	Home: {
		title: "Work queue",
		subtitle:
			"Priority work across sales, production, warehouse, and field teams.",
	},
	Inbox: {
		title: "Inbox",
		subtitle:
			"Alerts, closeout requests, and customer issues needing a response.",
	},
	Sales: {
		title: "Sales review",
		subtitle:
			"Quotes and orders with a pricing, margin, or production decision.",
	},
	Calendar: {
		title: "Schedule",
		subtitle: "Today’s jobs, routes, and upcoming production commitments.",
	},
	More: {
		title: "Operations tools",
		subtitle: "Team coverage and workspace preferences for the mobile console.",
	},
};

export function TemplateAScreen() {
	const system = usePreviewDesignSystem(opsConsoleSystem);
	const { activeTab, setActiveTab } = usePreviewTabs("Home");
	const { filters, setSearch, applyFilters } = usePreviewFilters();
	const { selectedRecord, setSelectedRecord, clearSelection } =
		usePreviewSelection();
	const { activeTab: detailTab, setActiveTab: setDetailTab } =
		usePreviewTabs("Overview");
	const [filterSheetVisible, setFilterSheetVisible] = useState(false);
	const records = filterPreviewRecords(opsRecords, filters, activeTab);
	const copy = opsTabCopy[activeTab] || opsTabCopy.Home;

	return (
		<>
			<PreviewShell
				bottomNavigation={
					selectedRecord ? undefined : (
						<PreviewBottomNav
							active={activeTab}
							items={opsConsoleTabs}
							onSelect={(tab) => {
								setActiveTab(tab);
								clearSelection();
							}}
							system={system}
						/>
					)
				}
				eyebrow="Template A"
				onFilterPress={() => setFilterSheetVisible(true)}
				onSearchChange={setSearch}
				searchPlaceholder={`Search ${activeTab.toLowerCase()} work`}
				searchValue={filters.search}
				system={system}
				title="Ops Console"
			>
				{selectedRecord ? (
					<PreviewRecordDetail
						activeTab={detailTab}
						mode="ops"
						onBack={clearSelection}
						onTabSelect={setDetailTab}
						record={selectedRecord}
						system={system}
						tabs={opsDetailTabs}
					/>
				) : (
					<View style={{ flex: 1, gap: 18 }}>
						{activeTab === "Home" ? (
							<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
								{opsMetrics.map((metric) => (
									<PreviewMetricCard
										key={metric.label}
										metric={metric}
										system={system}
									/>
								))}
							</View>
						) : null}
						<PreviewRecordList
							emptyCopy="Try another search or reset the active filters."
							onSelect={(record) => {
								setSelectedRecord(record);
								setDetailTab("Overview");
							}}
							records={records}
							subtitle={copy.subtitle}
							system={system}
							title={copy.title}
						/>
					</View>
				)}
			</PreviewShell>

			<PreviewBottomFilterSheet
				filters={filters}
				groups={opsFilterGroups}
				onApply={applyFilters}
				onClose={() => setFilterSheetVisible(false)}
				system={system}
				visible={filterSheetVisible}
			/>
		</>
	);
}

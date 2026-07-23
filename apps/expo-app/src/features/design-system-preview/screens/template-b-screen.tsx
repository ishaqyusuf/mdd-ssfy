import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { useState } from "react";
import { Text, View } from "react-native";
import { PreviewBottomFilterSheet } from "../components/preview-bottom-filter-sheet";
import { PreviewMetricCard } from "../components/preview-metric";
import { PreviewRecordDetail } from "../components/preview-record-detail";
import { PreviewRecordList } from "../components/preview-record-list";
import { PreviewBottomNav, PreviewShell } from "../components/preview-shell";
import {
	type PreviewRecord,
	fieldMetrics,
	fieldRecords,
} from "../data/sample-data";
import {
	fieldDetailTabs,
	fieldFilterGroups,
	fieldFlowTabs,
} from "../data/template-tabs";
import { fieldFlowSystem } from "../design-systems/template-b-field-flow";
import { usePreviewDesignSystem } from "../design-systems/types";
import { usePreviewFilters } from "../hooks/use-preview-filters";
import { usePreviewSelection } from "../hooks/use-preview-selection";
import { usePreviewTabs } from "../hooks/use-preview-tabs";
import { filterPreviewRecords } from "../utils/preview-filtering";

const activeRoute: PreviewRecord = {
	id: "RT-ACTIVE",
	title: "North Ridge Delivery",
	subtitle: "3 stops, 18 packed items, one customer signature needed",
	status: "ready",
	tabs: ["Home", "Route"],
	facets: {
		assignment: "My route",
		routeWindow: "morning",
		workType: "delivery",
	},
	action: "Continue route",
	meta: [
		{ icon: "Truck", label: "Route 8" },
		{ icon: "Clock", label: "Next stop 8:45 AM" },
		{ icon: "ClipboardCheck", label: "18 items" },
	],
	detail: {
		stops: [
			"8:45 AM · North Ridge clubhouse",
			"10:15 AM · Lot 42 customer delivery",
			"11:30 AM · Returns at Dock 2",
		],
		items: ["18 packed items", "3 stop packets", "1 return label"],
		proof: ["Vehicle load photo complete", "Customer signature still required"],
		activity: ["Route released at 7:32 AM", "Vehicle check completed"],
	},
};

const fieldTabCopy: Record<string, { title: string; subtitle: string }> = {
	Home: {
		title: "Today’s work",
		subtitle: "The next field, warehouse, and closeout tasks assigned to you.",
	},
	Route: {
		title: "Routes and stops",
		subtitle: "Active and upcoming delivery work in route-window order.",
	},
	Pack: {
		title: "Packing queue",
		subtitle: "Items that must be verified and loaded before route release.",
	},
	Proof: {
		title: "Proof and closeout",
		subtitle: "Photos, signatures, and final job evidence requiring attention.",
	},
	Me: {
		title: "My shift",
		subtitle: "Assignment coverage and today’s mobile field profile.",
	},
};

export function TemplateBScreen() {
	const system = usePreviewDesignSystem(fieldFlowSystem);
	const { activeTab, setActiveTab } = usePreviewTabs("Home");
	const { filters, setSearch, applyFilters } = usePreviewFilters();
	const { selectedRecord, setSelectedRecord, clearSelection } =
		usePreviewSelection();
	const { activeTab: detailTab, setActiveTab: setDetailTab } =
		usePreviewTabs("Overview");
	const [filterSheetVisible, setFilterSheetVisible] = useState(false);
	const records = filterPreviewRecords(fieldRecords, filters, activeTab);
	const showActiveRoute =
		filterPreviewRecords([activeRoute], filters, "Home").length > 0;
	const copy = fieldTabCopy[activeTab] || fieldTabCopy.Home;

	const selectRecord = (record: PreviewRecord) => {
		setSelectedRecord(record);
		setDetailTab("Overview");
	};

	return (
		<>
			<PreviewShell
				comfortableControls
				bottomNavigation={
					selectedRecord ? undefined : (
						<PreviewBottomNav
							active={activeTab}
							items={fieldFlowTabs}
							onSelect={(tab) => {
								setActiveTab(tab);
								clearSelection();
							}}
							size="comfortable"
							system={system}
						/>
					)
				}
				eyebrow="Template B"
				onFilterPress={() => setFilterSheetVisible(true)}
				onSearchChange={setSearch}
				searchPlaceholder={`Search ${activeTab.toLowerCase()} work`}
				searchValue={filters.search}
				system={system}
				title="Field Flow"
			>
				{selectedRecord ? (
					<PreviewRecordDetail
						activeTab={detailTab}
						mode="field"
						onBack={clearSelection}
						onTabSelect={setDetailTab}
						record={selectedRecord}
						system={system}
						tabs={fieldDetailTabs}
					/>
				) : (
					<View style={{ flex: 1, gap: 18 }}>
						{activeTab === "Home" ? (
							<>
								{showActiveRoute ? (
									<View
										style={{
											backgroundColor: system.colors.primary,
											borderRadius: 22,
											gap: 14,
											padding: 18,
										}}
									>
										<View
											style={{
												flexDirection: "row",
												gap: 12,
												justifyContent: "space-between",
											}}
										>
											<View style={{ flex: 1, gap: 5 }}>
												<Text
													style={{
														color: system.colors.primaryForeground,
														fontSize: 11,
														fontWeight: "900",
													}}
												>
													ACTIVE ROUTE
												</Text>
												<Text
													style={{
														color: system.colors.primaryForeground,
														fontSize: 22,
														fontWeight: "900",
													}}
												>
													{activeRoute.title}
												</Text>
												<Text
													style={{
														color: system.colors.primaryForeground,
														fontSize: 13,
														lineHeight: 18,
														opacity: 0.76,
													}}
												>
													{activeRoute.subtitle}
												</Text>
											</View>
											<View
												style={{
													alignItems: "center",
													backgroundColor: "rgba(255,255,255,0.14)",
													borderRadius: 16,
													height: 48,
													justifyContent: "center",
													width: 48,
												}}
											>
												<Icon
													color={system.colors.primaryForeground}
													name="Truck"
													size={23}
												/>
											</View>
										</View>
										<Pressable
											accessibilityLabel={`Continue route ${activeRoute.id}`}
											accessibilityRole="button"
											onPress={() => selectRecord(activeRoute)}
											style={{
												alignItems: "center",
												backgroundColor: system.colors.primaryForeground,
												borderRadius: 14,
												flexDirection: "row",
												justifyContent: "center",
												minHeight: 52,
												overflow: "hidden",
												paddingVertical: 13,
											}}
										>
											<Text
												style={{
													color: system.colors.primary,
													fontSize: 14,
													fontWeight: "900",
												}}
											>
												Continue Route
											</Text>
										</Pressable>
									</View>
								) : null}
								<View style={{ flexDirection: "row", gap: 10 }}>
									{fieldMetrics.map((metric) => (
										<PreviewMetricCard
											compact
											key={metric.label}
											metric={metric}
											system={system}
										/>
									))}
								</View>
							</>
						) : null}
						<PreviewRecordList
							emptyCopy="Try another search or reset the active filters."
							onSelect={selectRecord}
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
				groups={fieldFilterGroups}
				onApply={applyFilters}
				onClose={() => setFilterSheetVisible(false)}
				system={system}
				visible={filterSheetVisible}
			/>
		</>
	);
}

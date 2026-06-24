import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRef } from "react";
import { Text, View } from "react-native";
import { PreviewBottomFilterSheet } from "../components/preview-bottom-filter-sheet";
import { PreviewRecordCard } from "../components/preview-card";
import { PreviewDetailTabs } from "../components/preview-detail-tabs";
import { PreviewMetricCard } from "../components/preview-metric";
import { PreviewBottomNav, PreviewShell } from "../components/preview-shell";
import { PreviewTabContent } from "../components/preview-tab-content";
import { opsMetrics, opsRecords } from "../data/sample-data";
import { opsConsoleTabs, opsDetailTabs } from "../data/template-tabs";
import { opsConsoleSystem } from "../design-systems/template-a-ops-console";
import { usePreviewDesignSystem } from "../design-systems/types";
import { usePreviewFilters } from "../hooks/use-preview-filters";
import { usePreviewSelection } from "../hooks/use-preview-selection";
import { usePreviewTabs } from "../hooks/use-preview-tabs";
import { filterPreviewRecords } from "../utils/preview-filtering";

export function TemplateAScreen() {
	const system = usePreviewDesignSystem(opsConsoleSystem);
	const { activeTab, setActiveTab } = usePreviewTabs("Home");
	const { filters, setSearch, toggleStatus, clearFilters } =
		usePreviewFilters();
	const { selectedRecord, setSelectedRecord, clearSelection } =
		usePreviewSelection();

	const filterSheetRef = useRef<BottomSheetModal>(null);
	const filteredRecords = filterPreviewRecords(opsRecords, filters);
	const { activeTab: activeDetailTab, setActiveTab: setActiveDetailTab } =
		usePreviewTabs("Overview");

	return (
		<>
			<PreviewShell
				searchValue={filters.search}
				onSearchChange={setSearch}
				onFilterPress={() => filterSheetRef.current?.present()}
				bottomNavigation={
					<PreviewBottomNav
						active={activeTab}
						items={opsConsoleTabs}
						system={system}
						onSelect={(tab) => {
							setActiveTab(tab);
							clearSelection();
						}}
					/>
				}
				eyebrow="Template A"
				system={system}
				title="Ops Console"
			>
				{selectedRecord ? (
					<View style={{ flex: 1 }}>
						<Pressable
							onPress={clearSelection}
							style={{
								flexDirection: "row",
								alignItems: "center",
								gap: 8,
								marginBottom: 16,
							}}
						>
							<Icon name="ArrowLeft" size={16} color={system.colors.muted} />
							<Text style={{ color: system.colors.muted, fontWeight: "600" }}>
								Back
							</Text>
						</Pressable>

						<Text
							style={{
								color: system.colors.text,
								fontSize: 24,
								fontWeight: "bold",
								marginBottom: 8,
							}}
						>
							{selectedRecord.title}
						</Text>
						<Text style={{ color: system.colors.muted, marginBottom: 24 }}>
							{selectedRecord.subtitle}
						</Text>

						<PreviewDetailTabs
							tabs={opsDetailTabs}
							activeTab={activeDetailTab}
							onTabSelect={setActiveDetailTab}
							system={system}
						/>

						<PreviewTabContent activeTab={activeDetailTab} tab="Overview">
							<Text style={{ color: system.colors.text }}>
								Overview details for {selectedRecord.id}...
							</Text>
						</PreviewTabContent>
						<PreviewTabContent activeTab={activeDetailTab} tab="Timeline">
							<Text style={{ color: system.colors.text }}>
								Timeline information...
							</Text>
						</PreviewTabContent>
						<PreviewTabContent activeTab={activeDetailTab} tab="Checklist">
							<Text style={{ color: system.colors.text }}>
								Checklist for this task...
							</Text>
						</PreviewTabContent>
						<PreviewTabContent activeTab={activeDetailTab} tab="Notes">
							<Text style={{ color: system.colors.text }}>
								Documents and notes...
							</Text>
						</PreviewTabContent>
						<PreviewTabContent activeTab={activeDetailTab} tab="Actions">
							<Text style={{ color: system.colors.text }}>Actions...</Text>
						</PreviewTabContent>
					</View>
				) : (
					<View style={{ flex: 1, gap: 16 }}>
						<PreviewTabContent activeTab={activeTab} tab="Home">
							<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
								{opsMetrics.map((metric) => (
									<PreviewMetricCard
										key={metric.label}
										metric={metric}
										system={system}
									/>
								))}
							</View>

							<View style={{ gap: 10 }}>
								<View
									style={{
										alignItems: "center",
										flexDirection: "row",
										justifyContent: "space-between",
									}}
								>
									<Text
										style={{
											color: system.colors.text,
											fontSize: 16,
											fontWeight: "900",
										}}
									>
										Work Queue
									</Text>
									<Text
										style={{
											color: system.colors.muted,
											fontSize: 12,
											fontWeight: "700",
										}}
									>
										{filteredRecords.length} priority items
									</Text>
								</View>
								{filteredRecords.map((record) => (
									<PreviewRecordCard
										key={record.id}
										record={record}
										system={system}
										onPress={() => {
											setSelectedRecord(record);
											setActiveDetailTab("Overview");
										}}
									/>
								))}
								{filteredRecords.length === 0 && (
									<Text
										style={{
											color: system.colors.muted,
											textAlign: "center",
											marginTop: 24,
										}}
									>
										No records found.
									</Text>
								)}
							</View>
						</PreviewTabContent>

						<PreviewTabContent activeTab={activeTab} tab="Inbox">
							<Text style={{ color: system.colors.text }}>
								Inbox alerts here...
							</Text>
						</PreviewTabContent>
						<PreviewTabContent activeTab={activeTab} tab="Sales">
							<Text style={{ color: system.colors.text }}>
								Sales records here...
							</Text>
						</PreviewTabContent>
						<PreviewTabContent activeTab={activeTab} tab="Calendar">
							<Text style={{ color: system.colors.text }}>
								Calendar view here...
							</Text>
						</PreviewTabContent>
						<PreviewTabContent activeTab={activeTab} tab="More">
							<Text style={{ color: system.colors.text }}>
								Admin actions here...
							</Text>
						</PreviewTabContent>
					</View>
				)}
			</PreviewShell>

			<PreviewBottomFilterSheet
				ref={filterSheetRef}
				system={system}
				filters={filters}
				toggleStatus={toggleStatus}
				clearFilters={clearFilters}
			/>
		</>
	);
}

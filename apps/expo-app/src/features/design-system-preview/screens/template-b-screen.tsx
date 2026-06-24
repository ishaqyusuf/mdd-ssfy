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
import { fieldMetrics, fieldRecords } from "../data/sample-data";
import { fieldDetailTabs, fieldFlowTabs } from "../data/template-tabs";
import { fieldFlowSystem } from "../design-systems/template-b-field-flow";
import { usePreviewDesignSystem } from "../design-systems/types";
import { usePreviewFilters } from "../hooks/use-preview-filters";
import { usePreviewSelection } from "../hooks/use-preview-selection";
import { usePreviewTabs } from "../hooks/use-preview-tabs";
import { filterPreviewRecords } from "../utils/preview-filtering";

export function TemplateBScreen() {
	const system = usePreviewDesignSystem(fieldFlowSystem);
	const { activeTab, setActiveTab } = usePreviewTabs("Home");
	const { filters, setSearch, toggleStatus, clearFilters } =
		usePreviewFilters();
	const { selectedRecord, setSelectedRecord, clearSelection } =
		usePreviewSelection();

	const filterSheetRef = useRef<BottomSheetModal>(null);
	const filteredRecords = filterPreviewRecords(fieldRecords, filters);
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
						items={fieldFlowTabs}
						system={system}
						onSelect={(tab) => {
							setActiveTab(tab);
							clearSelection();
						}}
					/>
				}
				eyebrow="Template B"
				system={system}
				title="Field Flow"
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
							tabs={fieldDetailTabs}
							activeTab={activeDetailTab}
							onTabSelect={setActiveDetailTab}
							system={system}
						/>

						<PreviewTabContent activeTab={activeDetailTab} tab="Overview">
							<Text style={{ color: system.colors.text }}>
								Overview details for {selectedRecord.id}...
							</Text>
						</PreviewTabContent>
						<PreviewTabContent activeTab={activeDetailTab} tab="Stops">
							<Text style={{ color: system.colors.text }}>
								Stop information...
							</Text>
						</PreviewTabContent>
						<PreviewTabContent activeTab={activeDetailTab} tab="Items">
							<Text style={{ color: system.colors.text }}>
								Items to pack/deliver...
							</Text>
						</PreviewTabContent>
						<PreviewTabContent activeTab={activeDetailTab} tab="Proof">
							<Text style={{ color: system.colors.text }}>Photo proofs...</Text>
						</PreviewTabContent>
						<PreviewTabContent activeTab={activeDetailTab} tab="Activity">
							<Text style={{ color: system.colors.text }}>Activity log...</Text>
						</PreviewTabContent>
					</View>
				) : (
					<View style={{ flex: 1, gap: 16 }}>
						<PreviewTabContent activeTab={activeTab} tab="Home">
							<View
								style={{
									backgroundColor: system.colors.primary,
									borderRadius: 22,
									padding: 18,
									gap: 14,
								}}
							>
								<View
									style={{
										flexDirection: "row",
										justifyContent: "space-between",
										gap: 12,
									}}
								>
									<View style={{ flex: 1, gap: 5 }}>
										<Text
											style={{
												color: system.colors.primaryForeground,
												fontSize: 12,
												fontWeight: "800",
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
											North Ridge Delivery
										</Text>
										<Text
											style={{ color: "rgba(255,255,255,0.76)", fontSize: 13 }}
										>
											3 stops, 18 packed items, one customer signature needed.
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
											name="Truck"
											color={system.colors.primaryForeground}
											size={23}
										/>
									</View>
								</View>

								<Pressable
									onPress={() => {
										setSelectedRecord({
											id: "RT-ACTIVE",
											title: "North Ridge Delivery",
											subtitle: "3 stops, 18 packed items",
											status: "ready",
											meta: [],
										});
										setActiveDetailTab("Overview");
									}}
									style={{
										alignItems: "center",
										backgroundColor: system.colors.primaryForeground,
										borderRadius: 14,
										flexDirection: "row",
										justifyContent: "center",
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

							<View style={{ gap: 10 }}>
								{filteredRecords.map((record) => (
									<PreviewRecordCard
										dense
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

						<PreviewTabContent activeTab={activeTab} tab="Route">
							<Text style={{ color: system.colors.text }}>
								Route map and stop list here...
							</Text>
						</PreviewTabContent>

						<PreviewTabContent activeTab={activeTab} tab="Pack">
							<Text style={{ color: system.colors.text }}>
								Packing lists and warehouse tasks here...
							</Text>
						</PreviewTabContent>

						<PreviewTabContent activeTab={activeTab} tab="Proof">
							<Text style={{ color: system.colors.text }}>
								Uploaded proofs and signatures here...
							</Text>
						</PreviewTabContent>

						<PreviewTabContent activeTab={activeTab} tab="Me">
							<Text style={{ color: system.colors.text }}>
								User profile and settings here...
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

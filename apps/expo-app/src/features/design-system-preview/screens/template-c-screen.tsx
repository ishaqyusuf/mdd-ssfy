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
import { salesMetrics, salesRecords } from "../data/sample-data";
import { salesDetailTabs, salesLedgerTabs } from "../data/template-tabs";
import { salesLedgerSystem } from "../design-systems/template-c-sales-ledger";
import { usePreviewDesignSystem } from "../design-systems/types";
import { usePreviewFilters } from "../hooks/use-preview-filters";
import { usePreviewSelection } from "../hooks/use-preview-selection";
import { usePreviewTabs } from "../hooks/use-preview-tabs";
import { filterPreviewRecords } from "../utils/preview-filtering";

export function TemplateCScreen() {
	const system = usePreviewDesignSystem(salesLedgerSystem);
	const { activeTab, setActiveTab } = usePreviewTabs("Sales");
	const { filters, setSearch, toggleStatus, clearFilters } =
		usePreviewFilters();
	const { selectedRecord, setSelectedRecord, clearSelection } =
		usePreviewSelection();

	const filterSheetRef = useRef<BottomSheetModal>(null);
	const filteredRecords = filterPreviewRecords(salesRecords, filters);
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
						items={salesLedgerTabs}
						system={system}
						onSelect={(tab) => {
							setActiveTab(tab);
							clearSelection();
						}}
					/>
				}
				eyebrow="Template C"
				system={system}
				title="Sales Ledger"
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
							tabs={salesDetailTabs}
							activeTab={activeDetailTab}
							onTabSelect={setActiveDetailTab}
							system={system}
						/>

						<PreviewTabContent activeTab={activeDetailTab} tab="Overview">
							<Text style={{ color: system.colors.text }}>
								Overview details for {selectedRecord.id}...
							</Text>
						</PreviewTabContent>
						<PreviewTabContent activeTab={activeDetailTab} tab="Items">
							<Text style={{ color: system.colors.text }}>
								Line items information...
							</Text>
						</PreviewTabContent>
						<PreviewTabContent activeTab={activeDetailTab} tab="Payments">
							<Text style={{ color: system.colors.text }}>
								Payment history...
							</Text>
						</PreviewTabContent>
						<PreviewTabContent activeTab={activeDetailTab} tab="Fulfillment">
							<Text style={{ color: system.colors.text }}>
								Fulfillment status...
							</Text>
						</PreviewTabContent>
						<PreviewTabContent activeTab={activeDetailTab} tab="Activity">
							<Text style={{ color: system.colors.text }}>Activity log...</Text>
						</PreviewTabContent>
					</View>
				) : (
					<View style={{ flex: 1, gap: 16 }}>
						<PreviewTabContent activeTab={activeTab} tab="Sales">
							<View style={{ flexDirection: "row", gap: 10 }}>
								{salesMetrics.map((metric) => (
									<PreviewMetricCard
										compact
										key={metric.label}
										metric={metric}
										system={system}
									/>
								))}
							</View>

							<View
								style={{
									backgroundColor: system.colors.surface,
									borderColor: system.colors.border,
									borderRadius: system.radius.card,
									borderWidth: 1,
									padding: 15,
									gap: 12,
								}}
							>
								<Text
									style={{
										color: system.colors.text,
										fontSize: 15,
										fontWeight: "900",
									}}
								>
									Invoice Snapshot
								</Text>
								{[
									["Subtotal", "$18,420.00"],
									["Tax", "$1,243.35"],
									["Paid", "$8,500.00"],
									["Balance Due", "$11,163.35"],
								].map(([label, value], index) => (
									<View
										key={label}
										style={{
											borderTopColor:
												index === 0 ? "transparent" : system.colors.border,
											borderTopWidth: index === 0 ? 0 : 1,
											flexDirection: "row",
											justifyContent: "space-between",
											paddingTop: index === 0 ? 0 : 10,
										}}
									>
										<Text
											style={{
												color: system.colors.muted,
												fontSize: 12,
												fontWeight: "700",
											}}
										>
											{label}
										</Text>
										<Text
											style={{
												color:
													label === "Balance Due"
														? system.colors.blocked
														: system.colors.text,
												fontSize: 13,
												fontVariant: ["tabular-nums"],
												fontWeight: "900",
											}}
										>
											{value}
										</Text>
									</View>
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
										Recent Orders
									</Text>
									<Text
										style={{
											color: system.colors.muted,
											fontSize: 12,
											fontWeight: "700",
										}}
									>
										Ledger view
									</Text>
								</View>
								{filteredRecords.map((record) => (
									<View key={record.id} style={{ gap: 8 }}>
										<PreviewRecordCard
											dense
											record={record}
											system={system}
											onPress={() => {
												setSelectedRecord(record);
												setActiveDetailTab("Overview");
											}}
										/>
										<Text
											style={{
												alignSelf: "flex-end",
												color: system.colors.text,
												fontSize: 13,
												fontVariant: ["tabular-nums"],
												fontWeight: "900",
											}}
										>
											{record.amount}
										</Text>
									</View>
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

						<PreviewTabContent activeTab={activeTab} tab="Home">
							<Text style={{ color: system.colors.text }}>
								Dashboard overview here...
							</Text>
						</PreviewTabContent>
						<PreviewTabContent activeTab={activeTab} tab="Money">
							<Text style={{ color: system.colors.text }}>
								Financial reports here...
							</Text>
						</PreviewTabContent>
						<PreviewTabContent activeTab={activeTab} tab="Ship">
							<Text style={{ color: system.colors.text }}>
								Shipping and logistics here...
							</Text>
						</PreviewTabContent>
						<PreviewTabContent activeTab={activeTab} tab="More">
							<Text style={{ color: system.colors.text }}>
								Settings and more here...
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

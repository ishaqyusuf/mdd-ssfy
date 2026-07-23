import { useState } from "react";
import { Text, View } from "react-native";
import { PreviewBottomFilterSheet } from "../components/preview-bottom-filter-sheet";
import { PreviewMetricCard } from "../components/preview-metric";
import { PreviewRecordDetail } from "../components/preview-record-detail";
import { PreviewRecordList } from "../components/preview-record-list";
import { PreviewBottomNav, PreviewShell } from "../components/preview-shell";
import { salesMetrics, salesRecords } from "../data/sample-data";
import {
	salesDetailTabs,
	salesFilterGroups,
	salesLedgerTabs,
} from "../data/template-tabs";
import { salesLedgerSystem } from "../design-systems/template-c-sales-ledger";
import { usePreviewDesignSystem } from "../design-systems/types";
import { usePreviewFilters } from "../hooks/use-preview-filters";
import { usePreviewSelection } from "../hooks/use-preview-selection";
import { usePreviewTabs } from "../hooks/use-preview-tabs";
import { filterPreviewRecords } from "../utils/preview-filtering";

const salesTabCopy: Record<string, { title: string; subtitle: string }> = {
	Home: {
		title: "Needs attention",
		subtitle: "Orders with the clearest payment or delivery next action.",
	},
	Sales: {
		title: "Sales documents",
		subtitle: "Orders and quotes with compact financial and status evidence.",
	},
	Money: {
		title: "Payment ledger",
		subtitle: "Recent receipts and balances without mixing fulfillment state.",
	},
	Ship: {
		title: "Fulfillment",
		subtitle: "Paid orders that are in production or ready for delivery.",
	},
	More: {
		title: "Ledger tools",
		subtitle: "Reports and preferences for the sales workspace.",
	},
};

export function TemplateCScreen() {
	const system = usePreviewDesignSystem(salesLedgerSystem);
	const { activeTab, setActiveTab } = usePreviewTabs("Home");
	const { filters, setSearch, applyFilters } = usePreviewFilters();
	const { selectedRecord, setSelectedRecord, clearSelection } =
		usePreviewSelection();
	const { activeTab: detailTab, setActiveTab: setDetailTab } =
		usePreviewTabs("Overview");
	const [filterSheetVisible, setFilterSheetVisible] = useState(false);
	const records = filterPreviewRecords(salesRecords, filters, activeTab);
	const copy = salesTabCopy[activeTab] || salesTabCopy.Home;

	return (
		<>
			<PreviewShell
				bottomNavigation={
					selectedRecord ? undefined : (
						<PreviewBottomNav
							active={activeTab}
							items={salesLedgerTabs}
							onSelect={(tab) => {
								setActiveTab(tab);
								clearSelection();
							}}
							system={system}
						/>
					)
				}
				eyebrow="Template C"
				onFilterPress={() => setFilterSheetVisible(true)}
				onSearchChange={setSearch}
				searchPlaceholder={`Search ${activeTab.toLowerCase()} ledger`}
				searchValue={filters.search}
				system={system}
				title="Sales Ledger"
			>
				{selectedRecord ? (
					<PreviewRecordDetail
						activeTab={detailTab}
						mode="sales"
						onBack={clearSelection}
						onTabSelect={setDetailTab}
						record={selectedRecord}
						system={system}
						tabs={salesDetailTabs}
					/>
				) : (
					<View style={{ flex: 1, gap: 18 }}>
						{activeTab === "Home" ? (
							<>
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
								<InvoiceSnapshot system={system} />
							</>
						) : null}
						<PreviewRecordList
							dense
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
				groups={salesFilterGroups}
				onApply={applyFilters}
				onClose={() => setFilterSheetVisible(false)}
				system={system}
				visible={filterSheetVisible}
			/>
		</>
	);
}

function InvoiceSnapshot({
	system,
}: {
	system: ReturnType<typeof usePreviewDesignSystem>;
}) {
	const rows = [
		["Subtotal", "$18,420.00"],
		["Tax", "$1,243.35"],
		["Paid", "$8,500.00"],
		["Balance due", "$11,163.35"],
	];

	return (
		<View
			style={{
				backgroundColor: system.colors.surface,
				borderColor: system.colors.border,
				borderRadius: system.radius.card,
				borderWidth: 1,
				gap: 12,
				padding: 15,
			}}
		>
			<Text
				style={{
					color: system.colors.text,
					fontSize: 15,
					fontWeight: "900",
				}}
			>
				Invoice snapshot
			</Text>
			{rows.map(([label, value], index) => (
				<View
					key={label}
					style={{
						borderTopColor: index === 0 ? "transparent" : system.colors.border,
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
								label === "Balance due"
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
	);
}

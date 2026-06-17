import { Text, View } from "react-native";
import { PreviewRecordCard } from "../components/preview-card";
import { PreviewMetricCard } from "../components/preview-metric";
import { PreviewBottomNav, PreviewShell } from "../components/preview-shell";
import { opsMetrics, opsRecords } from "../data/sample-data";
import { opsConsoleSystem } from "../design-systems/template-a-ops-console";
import { usePreviewDesignSystem } from "../design-systems/types";

export function TemplateAScreen() {
	const system = usePreviewDesignSystem(opsConsoleSystem);

	return (
		<PreviewShell
			bottomNavigation={
				<PreviewBottomNav
					active="Home"
					items={[
						{ icon: "House", label: "Home" },
						{ icon: "Mail", label: "Inbox" },
						{ icon: "ReceiptText", label: "Sales" },
						{ icon: "Calendar", label: "Calendar" },
						{ icon: "more", label: "More" },
					]}
					system={system}
				/>
			}
			eyebrow="Template A"
			system={system}
			title="Ops Console"
		>
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
						{opsRecords.length} priority items
					</Text>
				</View>
				{opsRecords.map((record) => (
					<PreviewRecordCard key={record.id} record={record} system={system} />
				))}
			</View>
		</PreviewShell>
	);
}

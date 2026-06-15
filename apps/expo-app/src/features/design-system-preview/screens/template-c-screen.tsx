import { Text, View } from "react-native";
import { PreviewRecordCard } from "../components/preview-card";
import { PreviewMetricCard } from "../components/preview-metric";
import { PreviewBottomNav, PreviewShell } from "../components/preview-shell";
import { salesMetrics, salesRecords } from "../data/sample-data";
import { salesLedgerSystem } from "../design-systems/template-c-sales-ledger";

export function TemplateCScreen() {
	const system = salesLedgerSystem;

	return (
		<PreviewShell eyebrow="Template C" system={system} title="Sales Ledger">
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
					style={{ color: system.colors.text, fontSize: 15, fontWeight: "900" }}
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
				{salesRecords.map((record) => (
					<View key={record.id} style={{ gap: 8 }}>
						<PreviewRecordCard dense record={record} system={system} />
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
			</View>

			<PreviewBottomNav
				active="Sales"
				items={[
					{ icon: "LayoutDashboard", label: "Home" },
					{ icon: "ReceiptText", label: "Sales" },
					{ icon: "CircleDollarSign", label: "Money" },
					{ icon: "Truck", label: "Ship" },
					{ icon: "more", label: "More" },
				]}
				system={system}
			/>
		</PreviewShell>
	);
}

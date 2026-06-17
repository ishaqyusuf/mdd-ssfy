import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text, View } from "react-native";
import { PreviewRecordCard } from "../components/preview-card";
import { PreviewMetricCard } from "../components/preview-metric";
import { PreviewBottomNav, PreviewShell } from "../components/preview-shell";
import { fieldMetrics, fieldRecords } from "../data/sample-data";
import { fieldFlowSystem } from "../design-systems/template-b-field-flow";
import { usePreviewDesignSystem } from "../design-systems/types";

export function TemplateBScreen() {
	const system = usePreviewDesignSystem(fieldFlowSystem);

	return (
		<PreviewShell
			bottomNavigation={
				<PreviewBottomNav
					active="Route"
					items={[
						{ icon: "House", label: "Home" },
						{ icon: "Route", label: "Route" },
						{ icon: "Warehouse", label: "Pack" },
						{ icon: "Camera", label: "Proof" },
						{ icon: "User", label: "Me" },
					]}
					system={system}
				/>
			}
			eyebrow="Template B"
			system={system}
			title="Field Flow"
		>
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
						<Text style={{ color: "rgba(255,255,255,0.76)", fontSize: 13 }}>
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

			<View style={{ flexDirection: "row", gap: 8 }}>
				{["Today", "Packed", "Issues"].map((label, index) => (
					<View
						key={label}
						style={{
							backgroundColor:
								index === 0 ? system.colors.primary : system.colors.surface,
							borderColor: system.colors.border,
							borderRadius: system.radius.pill,
							borderWidth: 1,
							paddingHorizontal: 14,
							paddingVertical: 8,
						}}
					>
						<Text
							style={{
								color: index === 0 ? "#ffffff" : system.colors.muted,
								fontSize: 12,
								fontWeight: "800",
							}}
						>
							{label}
						</Text>
					</View>
				))}
			</View>

			<View style={{ gap: 10 }}>
				{fieldRecords.map((record) => (
					<PreviewRecordCard
						dense
						key={record.id}
						record={record}
						system={system}
					/>
				))}
			</View>
		</PreviewShell>
	);
}

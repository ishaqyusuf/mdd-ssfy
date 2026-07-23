import { Text, View } from "react-native";
import type { PreviewMetric } from "../data/sample-data";
import type { ResolvedPreviewDesignSystem } from "../design-systems/types";

export function PreviewMetricCard({
	metric,
	system,
	compact = false,
}: {
	metric: PreviewMetric;
	system: ResolvedPreviewDesignSystem;
	compact?: boolean;
}) {
	const color = system.colors[metric.tone];

	return (
		<View
			style={{
				flex: 1,
				minWidth: compact ? 84 : 74,
				borderRadius: system.radius.card,
				borderWidth: 1,
				borderColor: system.colors.border,
				backgroundColor: system.colors.surface,
				padding: 10,
				gap: 6,
			}}
		>
			<View
				style={{
					height: 4,
					width: 28,
					borderRadius: 99,
					backgroundColor: color,
				}}
			/>
			<Text
				style={{
					color: system.colors.muted,
					fontSize: 11,
					fontWeight: "700",
				}}
				numberOfLines={1}
			>
				{metric.label}
			</Text>
			<Text
				style={{
					color: system.colors.text,
					fontSize: compact ? 22 : 20,
					fontWeight: "800",
					fontVariant: ["tabular-nums"],
				}}
			>
				{metric.value}
			</Text>
		</View>
	);
}

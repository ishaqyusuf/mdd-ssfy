import { Text, View } from "react-native";
import type { PreviewStatus } from "../data/sample-data";
import type { ResolvedPreviewDesignSystem } from "../design-systems/types";

const statusLabel: Record<PreviewStatus, string> = {
	ready: "Ready",
	pending: "Pending",
	blocked: "Blocked",
	complete: "Complete",
};

export function PreviewStatusPill({
	status,
	system,
}: {
	status: PreviewStatus;
	system: ResolvedPreviewDesignSystem;
}) {
	const color = system.colors[status];

	return (
		<View
			style={{
				borderRadius: system.radius.pill,
				backgroundColor: `${color}18`,
				paddingHorizontal: 9,
				paddingVertical: 5,
			}}
		>
			<Text style={{ color, fontSize: 11, fontWeight: "700" }}>
				{statusLabel[status]}
			</Text>
		</View>
	);
}

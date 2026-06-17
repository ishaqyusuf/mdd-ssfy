import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text, View } from "react-native";
import type { PreviewRecord } from "../data/sample-data";
import type { ResolvedPreviewDesignSystem } from "../design-systems/types";
import { PreviewStatusPill } from "./preview-status";

export function PreviewRecordCard({
	record,
	system,
	dense = false,
}: {
	record: PreviewRecord;
	system: ResolvedPreviewDesignSystem;
	dense?: boolean;
}) {
	return (
		<Pressable
			transition
			style={{
				borderRadius: system.radius.card,
				borderWidth: 1,
				borderColor: system.colors.border,
				backgroundColor: system.colors.surface,
				padding: dense ? 13 : 15,
				gap: 12,
				overflow: "hidden",
			}}
		>
			<View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
				<View
					style={{
						height: dense ? 36 : 40,
						width: dense ? 36 : 40,
						borderRadius: system.radius.control,
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: system.colors.surfaceMuted,
					}}
				>
					<Icon name="Briefcase" color={system.colors.primary} size={18} />
				</View>

				<View style={{ flex: 1, gap: 4 }}>
					<View
						style={{
							flexDirection: "row",
							alignItems: "flex-start",
							justifyContent: "space-between",
							gap: 8,
						}}
					>
						<Text
							style={{
								color: system.colors.text,
								flex: 1,
								fontSize: dense ? 14 : 15,
								fontWeight: "800",
							}}
							numberOfLines={1}
						>
							{record.title}
						</Text>
						<PreviewStatusPill status={record.status} system={system} />
					</View>
					<Text
						style={{
							color: system.colors.muted,
							fontSize: 12,
							lineHeight: 17,
						}}
						numberOfLines={2}
					>
						{record.subtitle}
					</Text>
				</View>
			</View>

			<View
				style={{
					borderTopColor: system.colors.border,
					borderTopWidth: 1,
					flexDirection: "row",
					flexWrap: "wrap",
					gap: 10,
					paddingTop: 11,
				}}
			>
				{record.meta.map((item) => (
					<View
						key={`${record.id}-${item.label}`}
						style={{ alignItems: "center", flexDirection: "row", gap: 4 }}
					>
						<Icon name={item.icon} color={system.colors.muted} size={13} />
						<Text style={{ color: system.colors.muted, fontSize: 11 }}>
							{item.label}
						</Text>
					</View>
				))}
			</View>
		</Pressable>
	);
}

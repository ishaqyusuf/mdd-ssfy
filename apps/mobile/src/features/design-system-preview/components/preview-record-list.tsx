import { Text, View } from "react-native";
import type { PreviewRecord } from "../data/sample-data";
import type { ResolvedPreviewDesignSystem } from "../design-systems/types";
import { PreviewRecordCard } from "./preview-card";

export function PreviewRecordList({
	dense = false,
	emptyCopy,
	onSelect,
	records,
	subtitle,
	system,
	title,
}: {
	dense?: boolean;
	emptyCopy: string;
	onSelect: (record: PreviewRecord) => void;
	records: PreviewRecord[];
	subtitle: string;
	system: ResolvedPreviewDesignSystem;
	title: string;
}) {
	return (
		<View style={{ gap: 10 }}>
			<View
				style={{
					alignItems: "flex-end",
					flexDirection: "row",
					gap: 12,
					justifyContent: "space-between",
				}}
			>
				<View style={{ flex: 1, gap: 3 }}>
					<Text
						style={{
							color: system.colors.text,
							fontSize: 17,
							fontWeight: "900",
						}}
					>
						{title}
					</Text>
					<Text
						style={{
							color: system.colors.muted,
							fontSize: 12,
							lineHeight: 17,
						}}
					>
						{subtitle}
					</Text>
				</View>
				<Text
					style={{
						color: system.colors.muted,
						fontSize: 12,
						fontWeight: "800",
					}}
				>
					{records.length}
				</Text>
			</View>

			{records.map((record) => (
				<PreviewRecordCard
					dense={dense}
					key={record.id}
					onPress={() => onSelect(record)}
					record={record}
					system={system}
				/>
			))}

			{records.length === 0 ? (
				<View
					style={{
						alignItems: "center",
						backgroundColor: system.colors.surface,
						borderColor: system.colors.border,
						borderRadius: system.radius.card,
						borderWidth: 1,
						gap: 6,
						paddingHorizontal: 24,
						paddingVertical: 32,
					}}
				>
					<Text
						style={{
							color: system.colors.text,
							fontSize: 15,
							fontWeight: "800",
						}}
					>
						Nothing matches
					</Text>
					<Text
						style={{
							color: system.colors.muted,
							fontSize: 12,
							lineHeight: 17,
							textAlign: "center",
						}}
					>
						{emptyCopy}
					</Text>
				</View>
			) : null}
		</View>
	);
}

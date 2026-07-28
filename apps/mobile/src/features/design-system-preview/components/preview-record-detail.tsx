import { Icon, type IconKeys } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text, View } from "react-native";
import type { PreviewRecord } from "../data/sample-data";
import type { ResolvedPreviewDesignSystem } from "../design-systems/types";
import {
	type PreviewDetailMode,
	getPreviewDetailContent,
} from "../utils/preview-detail-content";
import { PreviewDetailTabs } from "./preview-detail-tabs";
import { PreviewStatusPill } from "./preview-status";

export function PreviewRecordDetail({
	activeTab,
	mode,
	onBack,
	onTabSelect,
	record,
	system,
	tabs,
}: {
	activeTab: string;
	mode: PreviewDetailMode;
	onBack: () => void;
	onTabSelect: (tab: string) => void;
	record: PreviewRecord;
	system: ResolvedPreviewDesignSystem;
	tabs: string[];
}) {
	const content = getPreviewDetailContent(record, mode, activeTab);

	return (
		<View style={{ flex: 1, gap: 16 }}>
			<Pressable
				accessibilityLabel="Back to current workspace tab"
				accessibilityRole="button"
				onPress={onBack}
				style={{
					alignItems: "center",
					alignSelf: "flex-start",
					flexDirection: "row",
					gap: 8,
					minHeight: 44,
					paddingHorizontal: 4,
					paddingVertical: 4,
				}}
			>
				<Icon name="ArrowLeft" size={16} color={system.colors.muted} />
				<Text style={{ color: system.colors.muted, fontWeight: "700" }}>
					Back to workspace
				</Text>
			</Pressable>

			<View
				style={{
					backgroundColor: system.colors.surface,
					borderColor: system.colors.border,
					borderRadius: system.radius.card,
					borderWidth: 1,
					gap: 10,
					padding: 16,
				}}
			>
				<View
					style={{
						alignItems: "flex-start",
						flexDirection: "row",
						gap: 12,
						justifyContent: "space-between",
					}}
				>
					<View style={{ flex: 1, gap: 5 }}>
						<Text
							style={{
								color: system.colors.muted,
								fontSize: 11,
								fontWeight: "800",
								textTransform: "uppercase",
							}}
						>
							{record.id}
						</Text>
						<Text
							style={{
								color: system.colors.text,
								fontSize: 23,
								fontWeight: "900",
							}}
						>
							{record.title}
						</Text>
					</View>
					<PreviewStatusPill status={record.status} system={system} />
				</View>
				<Text
					style={{
						color: system.colors.muted,
						fontSize: 13,
						lineHeight: 19,
					}}
				>
					{record.subtitle}
				</Text>
				{record.amount ? (
					<Text
						style={{
							color: system.colors.text,
							fontSize: 21,
							fontVariant: ["tabular-nums"],
							fontWeight: "900",
						}}
					>
						{record.amount}
					</Text>
				) : null}
			</View>

			<PreviewDetailTabs
				activeTab={activeTab}
				onTabSelect={onTabSelect}
				system={system}
				tabs={tabs}
			/>

			<View style={{ gap: 12 }}>
				<Text
					style={{
						color: system.colors.text,
						fontSize: 16,
						fontWeight: "900",
					}}
				>
					{content.title}
				</Text>
				<Text
					style={{
						color: system.colors.muted,
						fontSize: 12,
						lineHeight: 18,
					}}
				>
					{content.description}
				</Text>
				{content.rows.map((row) => (
					<DetailRow
						icon={row.icon}
						key={`${activeTab}-${row.label}-${row.value}`}
						label={row.label}
						system={system}
						value={row.value}
					/>
				))}
			</View>
		</View>
	);
}

function DetailRow({
	icon,
	label,
	system,
	value,
}: {
	icon: IconKeys;
	label: string;
	system: ResolvedPreviewDesignSystem;
	value: string;
}) {
	return (
		<View
			style={{
				alignItems: "center",
				backgroundColor: system.colors.surface,
				borderColor: system.colors.border,
				borderRadius: system.radius.control,
				borderWidth: 1,
				flexDirection: "row",
				gap: 12,
				padding: 13,
			}}
		>
			<View
				style={{
					alignItems: "center",
					backgroundColor: system.colors.surfaceMuted,
					borderRadius: 12,
					height: 38,
					justifyContent: "center",
					width: 38,
				}}
			>
				<Icon color={system.colors.primary} name={icon} size={17} />
			</View>
			<View style={{ flex: 1, gap: 2 }}>
				<Text
					style={{
						color: system.colors.muted,
						fontSize: 10,
						fontWeight: "800",
						textTransform: "uppercase",
					}}
				>
					{label}
				</Text>
				<Text
					style={{
						color: system.colors.text,
						fontSize: 13,
						fontWeight: "700",
						lineHeight: 18,
					}}
				>
					{value}
				</Text>
			</View>
		</View>
	);
}

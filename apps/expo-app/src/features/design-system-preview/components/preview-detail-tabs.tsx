import { Pressable } from "@/components/ui/pressable";
import { ScrollView, Text, View } from "react-native";
import type { ResolvedPreviewDesignSystem } from "../design-systems/types";

export function PreviewDetailTabs({
	tabs,
	activeTab,
	onTabSelect,
	system,
}: {
	tabs: string[];
	activeTab: string;
	onTabSelect: (tab: string) => void;
	system: ResolvedPreviewDesignSystem;
}) {
	return (
		<View
			style={{
				borderBottomColor: system.colors.border,
				borderBottomWidth: 1,
				marginHorizontal: -16,
			}}
		>
			<ScrollView
				contentContainerStyle={{ gap: 24, paddingHorizontal: 16 }}
				horizontal
				showsHorizontalScrollIndicator={false}
			>
				{tabs.map((tab) => {
					const isActive = tab === activeTab;
					return (
						<Pressable
							accessibilityLabel={`${tab} detail`}
							accessibilityRole="button"
							accessibilityState={{ selected: isActive }}
							key={tab}
							onPress={() => onTabSelect(tab)}
							style={{
								borderBottomColor: isActive
									? system.colors.primary
									: "transparent",
								borderBottomWidth: 2,
								justifyContent: "center",
								minHeight: 44,
								paddingVertical: 12,
							}}
						>
							<Text
								style={{
									color: isActive ? system.colors.primary : system.colors.muted,
									fontSize: 13,
									fontWeight: isActive ? "800" : "600",
								}}
							>
								{tab}
							</Text>
						</Pressable>
					);
				})}
			</ScrollView>
		</View>
	);
}

import { Icon, type IconKeys } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { opsConsoleSystem } from "../design-systems/template-a-ops-console";
import { fieldFlowSystem } from "../design-systems/template-b-field-flow";
import { salesLedgerSystem } from "../design-systems/template-c-sales-ledger";
import {
	type ResolvedPreviewDesignSystem,
	usePreviewDesignSystem,
} from "../design-systems/types";

const templates: {
	href: Href;
	icon: IconKeys;
	systemKey: "ops" | "field" | "sales";
	useCase: string;
}[] = [
	{
		href: "/design-system-preview/template-a",
		icon: "LayoutDashboard",
		systemKey: "ops",
		useCase: "Admin, HRM, job queues, and sales dashboards",
	},
	{
		href: "/design-system-preview/template-b",
		icon: "Truck",
		systemKey: "field",
		useCase: "Driver, installer, warehouse, and packing workflows",
	},
	{
		href: "/design-system-preview/template-c",
		icon: "ReceiptText",
		systemKey: "sales",
		useCase: "Sales orders, invoice shells, and financial summaries",
	},
];

export function DesignSystemIndexScreen() {
	const router = useRouter();
	const opsSystem = usePreviewDesignSystem(opsConsoleSystem);
	const fieldSystem = usePreviewDesignSystem(fieldFlowSystem);
	const salesSystem = usePreviewDesignSystem(salesLedgerSystem);
	const systems: Record<string, ResolvedPreviewDesignSystem> = {
		ops: opsSystem,
		field: fieldSystem,
		sales: salesSystem,
	};
	const pageSystem = opsSystem;

	return (
		<View style={{ backgroundColor: pageSystem.colors.background, flex: 1 }}>
			<View
				style={{
					alignItems: "center",
					flexDirection: "row",
					gap: 12,
					paddingBottom: 14,
					paddingHorizontal: 16,
					paddingTop: 54,
				}}
			>
				<Pressable
					noRipple
					onPress={() => router.back()}
					style={{
						alignItems: "center",
						backgroundColor: pageSystem.colors.surface,
						borderRadius: 999,
						height: 40,
						justifyContent: "center",
						overflow: "hidden",
						width: 40,
					}}
				>
					<Icon name="ArrowLeft" color={pageSystem.colors.text} size={19} />
				</Pressable>
				<View style={{ flex: 1 }}>
					<Text
						style={{
							color: pageSystem.colors.muted,
							fontSize: 12,
							fontWeight: "800",
						}}
					>
						Mobile Preview
					</Text>
					<Text
						style={{
							color: pageSystem.colors.text,
							fontSize: 24,
							fontWeight: "900",
						}}
					>
						Design Systems
					</Text>
				</View>
			</View>

			<ScrollView
				contentContainerStyle={{
					gap: 14,
					padding: 16,
					paddingBottom: 40,
				}}
			>
				<Text
					style={{
						color: pageSystem.colors.muted,
						fontSize: 13,
						lineHeight: 19,
					}}
				>
					Compare three clean mobile directions before promoting one into the
					shared Expo design system.
				</Text>

				{templates.map((template) => {
					const system = systems[template.systemKey];

					return (
						<Pressable
							key={system.id}
							onPress={() => router.push(template.href)}
							transition
							style={{
								backgroundColor: system.colors.surface,
								borderColor: system.colors.border,
								borderRadius: 18,
								borderWidth: 1,
								padding: 16,
								gap: 14,
								overflow: "hidden",
							}}
						>
							<View
								style={{
									alignItems: "flex-start",
									flexDirection: "row",
									gap: 12,
								}}
							>
								<View
									style={{
										alignItems: "center",
										backgroundColor: `${system.colors.primary}20`,
										borderRadius: 14,
										height: 44,
										justifyContent: "center",
										width: 44,
									}}
								>
									<Icon
										name={template.icon}
										color={system.colors.primary}
										size={22}
									/>
								</View>
								<View style={{ flex: 1, gap: 4 }}>
									<Text
										style={{
											color: system.colors.text,
											fontSize: 17,
											fontWeight: "900",
										}}
									>
										{system.name}
									</Text>
									<Text
										style={{
											color: system.colors.muted,
											fontSize: 12,
											lineHeight: 17,
										}}
									>
										{system.summary}
									</Text>
								</View>
								<Icon
									name="ChevronRight"
									color={system.colors.muted}
									size={20}
								/>
							</View>

							<View
								style={{
									backgroundColor: system.colors.surfaceMuted,
									borderRadius: 12,
									padding: 11,
								}}
							>
								<Text
									style={{
										color: system.colors.muted,
										fontSize: 11,
										fontWeight: "800",
									}}
								>
									BEST FOR
								</Text>
								<Text
									style={{
										color: system.colors.text,
										fontSize: 13,
										fontWeight: "700",
										marginTop: 3,
									}}
								>
									{template.useCase}
								</Text>
							</View>
						</Pressable>
					);
				})}
			</ScrollView>
		</View>
	);
}

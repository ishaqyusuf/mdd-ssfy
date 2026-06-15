import { Icon, type IconKeys } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { opsConsoleSystem } from "../design-systems/template-a-ops-console";
import { fieldFlowSystem } from "../design-systems/template-b-field-flow";
import { salesLedgerSystem } from "../design-systems/template-c-sales-ledger";
import type { PreviewDesignSystem } from "../design-systems/types";

const templates: {
	href: Href;
	icon: IconKeys;
	system: PreviewDesignSystem;
	useCase: string;
}[] = [
	{
		href: "/design-system-preview/template-a",
		icon: "LayoutDashboard",
		system: opsConsoleSystem,
		useCase: "Admin, HRM, job queues, and sales dashboards",
	},
	{
		href: "/design-system-preview/template-b",
		icon: "Truck",
		system: fieldFlowSystem,
		useCase: "Driver, installer, warehouse, and packing workflows",
	},
	{
		href: "/design-system-preview/template-c",
		icon: "ReceiptText",
		system: salesLedgerSystem,
		useCase: "Sales orders, invoice shells, and financial summaries",
	},
];

export function DesignSystemIndexScreen() {
	const router = useRouter();

	return (
		<View style={{ backgroundColor: "#f3f5f8", flex: 1 }}>
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
					onPress={() => router.back()}
					style={{
						alignItems: "center",
						backgroundColor: "#ffffff",
						borderRadius: 999,
						height: 40,
						justifyContent: "center",
						width: 40,
					}}
				>
					<Icon name="ArrowLeft" color="#172026" size={19} />
				</Pressable>
				<View style={{ flex: 1 }}>
					<Text style={{ color: "#687383", fontSize: 12, fontWeight: "800" }}>
						Mobile Preview
					</Text>
					<Text style={{ color: "#172026", fontSize: 24, fontWeight: "900" }}>
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
				<Text style={{ color: "#5f6b7a", fontSize: 13, lineHeight: 19 }}>
					Compare three clean mobile directions before promoting one into the
					shared Expo design system.
				</Text>

				{templates.map((template) => (
					<Pressable
						key={template.system.id}
						onPress={() => router.push(template.href)}
						transition
						style={{
							backgroundColor: template.system.colors.surface,
							borderColor: template.system.colors.border,
							borderRadius: 18,
							borderWidth: 1,
							padding: 16,
							gap: 14,
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
									backgroundColor: `${template.system.colors.primary}14`,
									borderRadius: 14,
									height: 44,
									justifyContent: "center",
									width: 44,
								}}
							>
								<Icon
									name={template.icon}
									color={template.system.colors.primary}
									size={22}
								/>
							</View>
							<View style={{ flex: 1, gap: 4 }}>
								<Text
									style={{
										color: template.system.colors.text,
										fontSize: 17,
										fontWeight: "900",
									}}
								>
									{template.system.name}
								</Text>
								<Text
									style={{
										color: template.system.colors.muted,
										fontSize: 12,
										lineHeight: 17,
									}}
								>
									{template.system.summary}
								</Text>
							</View>
							<Icon
								name="ChevronRight"
								color={template.system.colors.muted}
								size={20}
							/>
						</View>

						<View
							style={{
								backgroundColor: template.system.colors.surfaceMuted,
								borderRadius: 12,
								padding: 11,
							}}
						>
							<Text
								style={{
									color: template.system.colors.muted,
									fontSize: 11,
									fontWeight: "800",
								}}
							>
								BEST FOR
							</Text>
							<Text
								style={{
									color: template.system.colors.text,
									fontSize: 13,
									fontWeight: "700",
									marginTop: 3,
								}}
							>
								{template.useCase}
							</Text>
						</View>
					</Pressable>
				))}
			</ScrollView>
		</View>
	);
}

import { Icon, type IconKeys } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import type { PreviewDesignSystem } from "../design-systems/types";

export function PreviewShell({
	children,
	eyebrow,
	system,
	title,
}: {
	children: ReactNode;
	eyebrow: string;
	system: PreviewDesignSystem;
	title: string;
}) {
	const router = useRouter();
	const lightHeader = system.colors.header.toLowerCase() === "#ffffff";
	const headerText = lightHeader ? system.colors.text : "#ffffff";
	const headerMuted = lightHeader
		? system.colors.muted
		: "rgba(255,255,255,0.68)";
	const headerControl = lightHeader
		? system.colors.surfaceMuted
		: "rgba(255,255,255,0.12)";
	const headerSearch = lightHeader
		? system.colors.surface
		: "rgba(255,255,255,0.1)";
	const headerSearchText = lightHeader
		? system.colors.muted
		: "rgba(255,255,255,0.72)";

	return (
		<View style={{ backgroundColor: system.colors.background, flex: 1 }}>
			<View
				style={{
					backgroundColor: system.colors.header,
					borderBottomLeftRadius: 24,
					borderBottomRightRadius: 24,
					paddingBottom: 18,
					paddingHorizontal: 16,
					paddingTop: 52,
				}}
			>
				<View
					style={{
						alignItems: "center",
						flexDirection: "row",
						gap: 12,
						justifyContent: "space-between",
					}}
				>
					<Pressable
						onPress={() => router.back()}
						style={{
							alignItems: "center",
							backgroundColor: headerControl,
							borderRadius: 999,
							height: 40,
							justifyContent: "center",
							width: 40,
						}}
					>
						<Icon name="ArrowLeft" color={headerText} size={19} />
					</Pressable>
					<View style={{ flex: 1 }}>
						<Text
							style={{
								color: headerMuted,
								fontSize: 11,
								fontWeight: "800",
								letterSpacing: 0,
								textTransform: "uppercase",
							}}
						>
							{eyebrow}
						</Text>
						<Text
							style={{ color: headerText, fontSize: 22, fontWeight: "900" }}
						>
							{title}
						</Text>
					</View>
					<View
						style={{
							alignItems: "center",
							backgroundColor: system.colors.primary,
							borderRadius: 999,
							height: 38,
							justifyContent: "center",
							width: 38,
						}}
					>
						<Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "900" }}>
							DS
						</Text>
					</View>
				</View>

				<View
					style={{
						alignItems: "center",
						backgroundColor: headerSearch,
						borderColor: lightHeader ? system.colors.border : "transparent",
						borderWidth: lightHeader ? 1 : 0,
						borderRadius: system.radius.control,
						flexDirection: "row",
						gap: 8,
						marginTop: 16,
						paddingHorizontal: 12,
						paddingVertical: 11,
					}}
				>
					<Icon name="Search" color={headerSearchText} size={17} />
					<Text style={{ color: headerSearchText, flex: 1, fontSize: 13 }}>
						Search jobs, orders, routes
					</Text>
					<View
						style={{
							alignItems: "center",
							backgroundColor: lightHeader
								? system.colors.surfaceMuted
								: "rgba(255,255,255,0.14)",
							borderRadius: 10,
							height: 30,
							justifyContent: "center",
							width: 34,
						}}
					>
						<Icon name="SlidersHorizontal" color={headerText} size={16} />
					</View>
				</View>
			</View>

			<ScrollView
				contentContainerStyle={{
					gap: 16,
					padding: 16,
					paddingBottom: 40,
				}}
			>
				{children}
			</ScrollView>
		</View>
	);
}

export function PreviewBottomNav({
	active,
	items,
	system,
}: {
	active: string;
	items: { icon: IconKeys; label: string }[];
	system: PreviewDesignSystem;
}) {
	return (
		<View
			style={{
				alignItems: "center",
				backgroundColor: system.colors.surface,
				borderColor: system.colors.border,
				borderRadius: 22,
				borderWidth: 1,
				flexDirection: "row",
				justifyContent: "space-between",
				paddingHorizontal: 14,
				paddingVertical: 12,
			}}
		>
			{items.map((item) => {
				const isActive = item.label === active;
				return (
					<View key={item.label} style={{ alignItems: "center", gap: 4 }}>
						<Icon
							name={item.icon}
							color={isActive ? system.colors.primary : system.colors.muted}
							size={18}
						/>
						<Text
							style={{
								color: isActive ? system.colors.primary : system.colors.muted,
								fontSize: 10,
								fontWeight: isActive ? "800" : "600",
							}}
						>
							{item.label}
						</Text>
					</View>
				);
			})}
		</View>
	);
}

import { Icon, type IconKeys } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { useColorScheme } from "@/hooks/use-color";
import {
	type ThemeOverride,
	getThemeOverride,
	setThemeOverride,
} from "@/lib/theme-preference";
import * as HugeIcons from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { type ReactNode, useEffect, useState } from "react";
import { ScrollView, Text, View, TextInput } from "react-native";
import type { ResolvedPreviewDesignSystem } from "../design-systems/types";

export function PreviewShell({
	bottomNavigation,
	children,
	eyebrow,
	system,
	title,
	searchValue,
	onSearchChange,
	onFilterPress,
	searchPlaceholder = "Search...",
}: {
	bottomNavigation?: ReactNode;
	children: ReactNode;
	eyebrow: string;
	system: ResolvedPreviewDesignSystem;
	title: string;
	searchValue?: string;
	onSearchChange?: (text: string) => void;
	onFilterPress?: () => void;
	searchPlaceholder?: string;
}) {
	const router = useRouter();
	const { colorScheme } = useColorScheme();
	const headerIsLight = isLightColor(system.colors.header);
	const headerIconsInverted = headerIsLight === (colorScheme === "dark");
	const headerText = headerIsLight ? system.colors.text : "#ffffff";
	const headerMuted = headerIsLight
		? system.colors.muted
		: "rgba(255,255,255,0.68)";
	const headerControl = headerIsLight
		? system.colors.surfaceMuted
		: "rgba(255,255,255,0.12)";
	const headerSearch = headerIsLight
		? system.colors.surface
		: "rgba(255,255,255,0.1)";
	const headerSearchText = headerIsLight
		? system.colors.muted
		: "rgba(255,255,255,0.72)";

	return (
		<View style={{ backgroundColor: system.colors.background, flex: 1 }}>
			<StatusBar
				backgroundColor={system.colors.header}
				style={headerIsLight ? "dark" : "light"}
			/>
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
						noRipple
						onPress={() => router.back()}
						style={{
							alignItems: "center",
							backgroundColor: headerControl,
							borderRadius: 999,
							height: 40,
							justifyContent: "center",
							overflow: "hidden",
							width: 40,
						}}
					>
						<Icon inverted={headerIconsInverted} name="ArrowLeft" size={19} />
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
					<PreviewHeaderThemeToggle
						backgroundColor={headerControl}
						iconColor={headerText}
					/>
				</View>

				<View
					style={{
						alignItems: "center",
						backgroundColor: headerSearch,
						borderColor: headerIsLight ? system.colors.border : "transparent",
						borderWidth: headerIsLight ? 1 : 0,
						borderRadius: system.radius.control,
						flexDirection: "row",
						gap: 8,
						marginTop: 16,
						overflow: "hidden",
						paddingHorizontal: 12,
						paddingVertical: 11,
					}}
				>
					<Icon
						className="text-muted-foreground"
						inverted={headerIconsInverted}
						name="Search"
						size={17}
					/>
					<TextInput
						placeholderTextColor={headerSearchText}
						placeholder={searchPlaceholder}
						value={searchValue}
						onChangeText={onSearchChange}
						style={{ color: headerSearchText, flex: 1, fontSize: 13 }}
					/>
					<Pressable
						onPress={onFilterPress}
						style={{
							alignItems: "center",
							backgroundColor: headerIsLight
								? system.colors.surfaceMuted
								: "rgba(255,255,255,0.14)",
							borderRadius: 10,
							height: 30,
							justifyContent: "center",
							overflow: "hidden",
							width: 34,
						}}
					>
						<Icon
							inverted={headerIconsInverted}
							name="SlidersHorizontal"
							size={16}
						/>
					</Pressable>
				</View>
			</View>

			<ScrollView
				style={{ flex: 1 }}
				contentContainerStyle={{
					gap: 16,
					padding: 16,
					paddingBottom: bottomNavigation ? 116 : 40,
				}}
			>
				{children}
			</ScrollView>
			{bottomNavigation ? (
				<View
					pointerEvents="box-none"
					style={{
						bottom: 0,
						left: 0,
						paddingBottom: 24,
						paddingHorizontal: 16,
						paddingTop: 8,
						position: "absolute",
						right: 0,
					}}
				>
					{bottomNavigation}
				</View>
			) : null}
		</View>
	);
}

function PreviewHeaderThemeToggle({
	backgroundColor,
	iconColor,
}: {
	backgroundColor: string;
	iconColor: string;
}) {
	const { colorScheme, setColorScheme } = useColorScheme();
	const [themeOverride, setThemeOverrideState] =
		useState<ThemeOverride>("system");

	useEffect(() => {
		void getThemeOverride().then(setThemeOverrideState);
	}, []);

	async function toggleColorScheme() {
		await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		const nextOverride: ThemeOverride =
			themeOverride === "dark"
				? "light"
				: themeOverride === "light"
					? "dark"
					: colorScheme === "dark"
						? "light"
						: "dark";

		setThemeOverrideState(nextOverride);
		await setThemeOverride(nextOverride);
		setColorScheme(nextOverride);
	}

	return (
		<Pressable
			noRipple
			onPress={toggleColorScheme}
			style={{
				alignItems: "center",
				backgroundColor,
				borderRadius: 999,
				height: 40,
				justifyContent: "center",
				overflow: "hidden",
				width: 40,
			}}
		>
			<HugeiconsIcon
				color={iconColor}
				icon={
					colorScheme === "dark" ? HugeIcons.Sun03Icon : HugeIcons.Moon02Icon
				}
				size={19}
				strokeWidth={1.9}
			/>
		</Pressable>
	);
}

function isLightColor(hexColor: string) {
	const normalized = hexColor.replace("#", "");
	const hex =
		normalized.length === 3
			? normalized
					.split("")
					.map((value) => value + value)
					.join("")
			: normalized;

	if (hex.length !== 6) {
		return false;
	}

	const red = Number.parseInt(hex.slice(0, 2), 16) / 255;
	const green = Number.parseInt(hex.slice(2, 4), 16) / 255;
	const blue = Number.parseInt(hex.slice(4, 6), 16) / 255;
	const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

	return luminance > 0.72;
}

export function PreviewBottomNav({
	active,
	items,
	system,
	onSelect,
}: {
	active: string;
	items: { icon: IconKeys; label: string }[];
	system: ResolvedPreviewDesignSystem;
	onSelect?: (label: string) => void;
}) {
	return (
		<View
			style={{
				alignItems: "center",
				backgroundColor: system.colors.surface,
				borderColor: system.colors.border,
				borderRadius: 22,
				borderWidth: 1,
				boxShadow: "0 12px 30px rgba(15, 23, 42, 0.14)",
				flexDirection: "row",
				justifyContent: "space-between",
				paddingHorizontal: 14,
				paddingVertical: 12,
			}}
		>
			{items.map((item) => {
				const isActive = item.label === active;
				return (
					<Pressable
						key={item.label}
						onPress={() => onSelect?.(item.label)}
						style={{ alignItems: "center", gap: 4 }}
					>
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
					</Pressable>
				);
			})}
		</View>
	);
}

import { FloatingBottomSheet } from "@/components/floating-bottom-sheet";
import { BottomSheetKeyboardAwareScrollView } from "@/components/ui/bottom-sheet-keyboard-aware-scroll-view";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PreviewFilterGroup } from "../data/template-tabs";
import type { ResolvedPreviewDesignSystem } from "../design-systems/types";
import type { PreviewFilterState } from "../utils/preview-filtering";

type PreviewBottomFilterSheetProps = {
	visible: boolean;
	onClose: () => void;
	onApply: (statuses: Set<string>, facets: Record<string, Set<string>>) => void;
	system: ResolvedPreviewDesignSystem;
	filters: PreviewFilterState;
	groups: PreviewFilterGroup[];
};

export function PreviewBottomFilterSheet({
	visible,
	onClose,
	onApply,
	system,
	filters,
	groups,
}: PreviewBottomFilterSheetProps) {
	const insets = useSafeAreaInsets();
	const [draft, setDraft] = useState(() => cloneSelections(filters));

	useEffect(() => {
		if (visible) setDraft(cloneSelections(filters));
	}, [filters, visible]);

	const toggleStatus = (status: string) => {
		setDraft((previous) => {
			const statuses = new Set(previous.statuses);
			if (statuses.has(status)) statuses.delete(status);
			else statuses.add(status);
			return { ...previous, statuses };
		});
	};

	const toggleFacet = (key: string, value: string) => {
		setDraft((previous) => {
			const selected = new Set(previous.facets[key] || []);
			if (selected.has(value)) selected.delete(value);
			else selected.add(value);
			return {
				...previous,
				facets: { ...previous.facets, [key]: selected },
			};
		});
	};

	const resetDraft = () => {
		setDraft({ statuses: new Set(), facets: {} });
	};

	const applyDraft = () => {
		onApply(draft.statuses, draft.facets);
		onClose();
	};

	return (
		<FloatingBottomSheet
			accessibilityLabel="Filter this preview workspace"
			bottomInset={Math.max(insets.bottom, 12)}
			enableDynamicSizing={false}
			onClose={onClose}
			snapPoints={["72%"]}
			visible={visible}
		>
			<BottomSheetKeyboardAwareScrollView
				bottomOffset={112}
				contentContainerStyle={{
					gap: 24,
					paddingBottom: 20,
					paddingHorizontal: 20,
				}}
				disableScrollOnKeyboardHide
				keyboardDismissMode="interactive"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View
					style={{
						alignItems: "center",
						flexDirection: "row",
						justifyContent: "space-between",
					}}
				>
					<View style={{ flex: 1, gap: 3 }}>
						<Text
							accessibilityRole="header"
							style={{
								color: system.colors.text,
								fontSize: 20,
								fontWeight: "900",
							}}
						>
							Filter this workspace
						</Text>
						<Text style={{ color: system.colors.muted, fontSize: 12 }}>
							Selections combine across sections.
						</Text>
					</View>
					<Pressable
						accessibilityLabel="Cancel filter changes"
						accessibilityRole="button"
						onPress={onClose}
						style={{
							alignItems: "center",
							backgroundColor: system.colors.surfaceMuted,
							borderRadius: 999,
							height: 44,
							justifyContent: "center",
							overflow: "hidden",
							width: 44,
						}}
					>
						<Icon name="X" color={system.colors.muted} size={18} />
					</Pressable>
				</View>

				<FilterGroup
					active={draft.statuses}
					label="Status"
					onToggle={toggleStatus}
					options={[
						{ label: "Ready", value: "ready" },
						{ label: "Pending", value: "pending" },
						{ label: "Blocked", value: "blocked" },
						{ label: "Complete", value: "complete" },
					]}
					system={system}
				/>
				{groups.map((group) => (
					<FilterGroup
						active={draft.facets[group.key] || new Set()}
						key={group.key}
						label={group.label}
						onToggle={(value) => toggleFacet(group.key, value)}
						options={group.options}
						system={system}
					/>
				))}

				<View style={{ flexDirection: "row", gap: 12 }}>
					<SheetButton
						label="Reset"
						onPress={resetDraft}
						system={system}
						variant="outline"
					/>
					<SheetButton
						label="Apply filters"
						onPress={applyDraft}
						system={system}
						variant="primary"
					/>
				</View>
			</BottomSheetKeyboardAwareScrollView>
		</FloatingBottomSheet>
	);
}

function cloneSelections(filters: PreviewFilterState) {
	return {
		statuses: new Set(filters.statuses),
		facets: Object.fromEntries(
			Object.entries(filters.facets).map(([key, values]) => [
				key,
				new Set(values),
			]),
		),
	};
}

function FilterGroup({
	active,
	label,
	onToggle,
	options,
	system,
}: {
	active: Set<string>;
	label: string;
	onToggle: (value: string) => void;
	options: { label: string; value: string }[];
	system: ResolvedPreviewDesignSystem;
}) {
	return (
		<View style={{ gap: 10 }}>
			<Text
				style={{
					color: system.colors.text,
					fontSize: 13,
					fontWeight: "800",
				}}
			>
				{label}
			</Text>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
				{options.map((option) => {
					const selected = active.has(option.value);
					return (
						<Pressable
							accessibilityLabel={`${label}: ${option.label}`}
							accessibilityRole="checkbox"
							accessibilityState={{ checked: selected }}
							key={option.value}
							onPress={() => onToggle(option.value)}
							style={{
								backgroundColor: selected
									? system.colors.primary
									: system.colors.surfaceMuted,
								borderColor: selected
									? system.colors.primary
									: system.colors.border,
								borderRadius: 999,
								borderWidth: 1,
								minHeight: 44,
								justifyContent: "center",
								overflow: "hidden",
								paddingHorizontal: 13,
								paddingVertical: 9,
							}}
						>
							<Text
								style={{
									color: selected
										? system.colors.primaryForeground
										: system.colors.text,
									fontSize: 12,
									fontWeight: selected ? "800" : "600",
								}}
							>
								{option.label}
							</Text>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}

function SheetButton({
	label,
	onPress,
	system,
	variant,
}: {
	label: string;
	onPress: () => void;
	system: ResolvedPreviewDesignSystem;
	variant: "outline" | "primary";
}) {
	const primary = variant === "primary";
	return (
		<Pressable
			accessibilityRole="button"
			onPress={onPress}
			style={{
				alignItems: "center",
				backgroundColor: primary
					? system.colors.primary
					: system.colors.surface,
				borderColor: primary ? system.colors.primary : system.colors.border,
				borderRadius: system.radius.control,
				borderWidth: 1,
				flex: 1,
				justifyContent: "center",
				minHeight: 48,
				overflow: "hidden",
				paddingVertical: 13,
			}}
		>
			<Text
				style={{
					color: primary ? system.colors.primaryForeground : system.colors.text,
					fontSize: 13,
					fontWeight: "800",
				}}
			>
				{label}
			</Text>
		</Pressable>
	);
}

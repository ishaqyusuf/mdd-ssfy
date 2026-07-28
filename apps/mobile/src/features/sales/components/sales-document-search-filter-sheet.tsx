import { FloatingBottomSheet } from "@/components/floating-bottom-sheet";
import { BottomSheetKeyboardAwareScrollView } from "@/components/ui/bottom-sheet-keyboard-aware-scroll-view";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import type { FilterItem } from "@/features/sales/types/sales.types";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";

type FilterSelection = Record<string, string | null | undefined>;

type SalesDocumentSearchFilterSheetProps = {
	visible: boolean;
	onClose: () => void;
	search: string;
	selectedFilters: FilterSelection;
	filters: FilterItem[];
	filtersEnabled: boolean;
	searchPlaceholder: string;
	title: string;
	onApply: (next: { search: string; filters: FilterSelection }) => void;
};

export function SalesDocumentSearchFilterSheet({
	visible,
	onClose,
	search,
	selectedFilters,
	filters,
	filtersEnabled,
	searchPlaceholder,
	title,
	onApply,
}: SalesDocumentSearchFilterSheetProps) {
	const [draftSearch, setDraftSearch] = useState(search);
	const [draftFilters, setDraftFilters] =
		useState<FilterSelection>(selectedFilters);
	const [activeFilter, setActiveFilter] = useState<FilterItem | null>(null);

	useEffect(() => {
		if (!visible) return;
		setDraftSearch(search);
		setDraftFilters(selectedFilters);
		setActiveFilter(null);
	}, [search, selectedFilters, visible]);

	const sheetTitle = activeFilter ? activeFilter.label : title;
	const canShowFilters = filtersEnabled && filters.length > 0;

	const activeFilterOptions = useMemo(
		() => activeFilter?.options || [],
		[activeFilter],
	);

	const handleClear = () => {
		setDraftSearch("");
		setDraftFilters({});
		setActiveFilter(null);
	};

	const handleApply = () => {
		onApply({ search: draftSearch, filters: draftFilters });
		onClose();
	};

	const handleBackOrClose = () => {
		if (activeFilter) {
			setActiveFilter(null);
			return;
		}
		onClose();
	};

	return (
		<FloatingBottomSheet
			visible={visible}
			onClose={onClose}
			accessibilityLabel={title}
		>
			<BottomSheetKeyboardAwareScrollView
				bottomOffset={132}
				disableScrollOnKeyboardHide
				keyboardDismissMode="interactive"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{
					paddingBottom: 20,
					paddingHorizontal: 20,
					paddingTop: 4,
				}}
			>
				<View className="mb-3 flex-row items-center justify-between">
					<Pressable
						haptic
						onPress={handleBackOrClose}
						className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
					>
						<Icon
							name={activeFilter ? "ChevronLeft" : "X"}
							className="text-foreground"
							size={20}
						/>
					</Pressable>
					<Text
						numberOfLines={1}
						className="max-w-[60%] text-base font-semibold text-foreground"
					>
						{sheetTitle}
					</Text>
					<Pressable
						haptic
						onPress={handleClear}
						className="h-11 items-center justify-center rounded-full px-3 active:bg-muted"
					>
						<Text className="text-xs font-semibold text-muted-foreground">
							Clear
						</Text>
					</Pressable>
				</View>

				{activeFilter ? (
					<View className="gap-2">
						{activeFilterOptions.map((option) => {
							const isSelected = draftFilters[activeFilter.value] === option.value;
							return (
								<Pressable
									haptic
									key={option.value}
									onPress={() => {
										setDraftFilters((prev) => ({
											...prev,
											[activeFilter.value]: isSelected ? null : option.value,
										}));
									}}
									className="min-h-[56px] rounded-xl border border-border bg-card px-4 py-3 active:opacity-90"
								>
									<View className="flex-row items-center justify-between gap-3">
										<Text className="min-w-0 flex-1 text-sm font-semibold text-foreground">
											{option.label}
										</Text>
										{isSelected ? (
											<Icon
												name="CircleCheck"
												className="text-primary"
												size={18}
											/>
										) : null}
									</View>
								</Pressable>
							);
						})}
						{activeFilterOptions.length === 0 ? (
							<View className="rounded-xl border border-border bg-card px-4 py-3">
								<Text className="text-sm text-muted-foreground">
									No options available for this filter.
								</Text>
							</View>
						) : null}
					</View>
				) : (
					<View className="gap-4">
						<View className="h-12 flex-row items-center rounded-xl border border-border bg-background px-3">
							<Icon
								name="Search"
								className="text-muted-foreground"
								size={18}
							/>
							<BottomSheetTextInput
								value={draftSearch}
								onChangeText={setDraftSearch}
								placeholder={searchPlaceholder}
								placeholderTextColor="#8A8A8A"
								returnKeyType="search"
								onSubmitEditing={handleApply}
								className="ml-2 flex-1 text-foreground"
							/>
						</View>

						{canShowFilters ? (
							<View className="gap-2">
								{filters.map((filter) => {
									const value = draftFilters[filter.value];
									const selectedLabel = filter.options?.find(
										(option) => option.value === value,
									)?.label;

									return (
										<Pressable
											haptic
											key={filter.value}
											onPress={() => setActiveFilter(filter)}
											className="min-h-[64px] border-b border-border/40 px-3 py-4 active:opacity-90"
										>
											<View className="flex-row items-center gap-3">
												<View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
													<Icon
														name="SlidersHorizontal"
														className="text-muted-foreground"
														size={18}
													/>
												</View>
												<View className="min-w-0 flex-1">
													<Text
														numberOfLines={1}
														className="text-[15px] font-semibold text-foreground"
													>
														{filter.label}
													</Text>
													<Text
														numberOfLines={1}
														className="mt-0.5 text-xs text-muted-foreground"
													>
														{selectedLabel || "Any"}
													</Text>
												</View>
												<Icon
													name="ChevronRight"
													className="text-muted-foreground"
													size={17}
												/>
											</View>
										</Pressable>
									);
								})}
							</View>
						) : null}
					</View>
				)}

				<View className="mt-5 flex-row gap-2">
					<Pressable
						haptic
						onPress={onClose}
						className="h-11 flex-1 items-center justify-center rounded-xl border border-border active:opacity-90"
					>
						<Text className="text-sm font-semibold text-foreground">Cancel</Text>
					</Pressable>
					<Pressable
						haptic
						onPress={handleApply}
						className="h-11 flex-1 items-center justify-center rounded-xl bg-primary active:opacity-90"
					>
						<Text className="text-sm font-semibold text-primary-foreground">
							Apply
						</Text>
					</Pressable>
				</View>
			</BottomSheetKeyboardAwareScrollView>
		</FloatingBottomSheet>
	);
}

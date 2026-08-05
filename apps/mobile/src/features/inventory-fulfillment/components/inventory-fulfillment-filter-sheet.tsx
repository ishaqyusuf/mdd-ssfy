import { FloatingBottomSheet } from "@/components/floating-bottom-sheet";
import { BottomSheetKeyboardAwareScrollView } from "@/components/ui/bottom-sheet-keyboard-aware-scroll-view";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import {
	type InventoryFulfillmentFilters,
	emptyInventoryFulfillmentFilters,
} from "../lib/inventory-fulfillment-filters";
import type { InventoryFulfillmentMode } from "../lib/inventory-fulfillment-model";
import { InventoryFulfillmentFilterOptions } from "./inventory-fulfillment-filter-options";

export function InventoryFulfillmentFilterSheet({
	visible,
	mode,
	filters,
	onClose,
	onApply,
}: {
	visible: boolean;
	mode: InventoryFulfillmentMode;
	filters: InventoryFulfillmentFilters;
	onClose: () => void;
	onApply: (filters: InventoryFulfillmentFilters) => void;
}) {
	const [draft, setDraft] = useState(filters);
	useEffect(() => {
		if (visible) setDraft(filters);
	}, [filters, visible]);

	return (
		<FloatingBottomSheet
			visible={visible}
			onClose={onClose}
			accessibilityLabel="Fulfillment filters"
		>
			<BottomSheetKeyboardAwareScrollView
				bottomOffset={110}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 20 }}
			>
				<View className="mb-4 flex-row items-center justify-between">
					<Pressable
						haptic
						onPress={onClose}
						className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
					>
						<Icon name="X" className="text-foreground" size={20} />
					</Pressable>
					<Text className="text-base font-semibold text-foreground">
						Search & filters
					</Text>
					<Pressable
						haptic
						onPress={() => setDraft(emptyInventoryFulfillmentFilters)}
						className="h-11 items-center justify-center rounded-full px-3 active:bg-muted"
					>
						<Text className="text-xs font-semibold text-muted-foreground">
							Clear
						</Text>
					</Pressable>
				</View>
				<View className="mb-5 h-12 flex-row items-center rounded-xl border border-border bg-background px-3">
					<Icon name="Search" className="text-muted-foreground" size={18} />
					<BottomSheetTextInput
						value={draft.q}
						onChangeText={(q) => setDraft((current) => ({ ...current, q }))}
						placeholder="Search order, customer, or line"
						placeholderTextColor="#8A8A8A"
						returnKeyType="search"
						className="ml-2 flex-1 text-foreground"
					/>
				</View>
				<InventoryFulfillmentFilterOptions
					mode={mode}
					draft={draft}
					onChange={setDraft}
				/>
				<View className="mt-6 flex-row gap-2">
					<Pressable
						haptic
						onPress={onClose}
						className="h-11 flex-1 items-center justify-center rounded-xl border border-border active:opacity-80"
					>
						<Text className="text-sm font-semibold text-foreground">
							Cancel
						</Text>
					</Pressable>
					<Pressable
						haptic
						onPress={() => {
							onApply(draft);
							onClose();
						}}
						className="h-11 flex-1 items-center justify-center rounded-xl bg-primary active:opacity-80"
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

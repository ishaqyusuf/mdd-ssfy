import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text, View } from "react-native";

export function InventoryFulfillmentEmptyState({
	hasFilters,
	onClearFilters,
}: {
	hasFilters: boolean;
	onClearFilters: () => void;
}) {
	return (
		<View className="mx-4 mt-10 items-center rounded-2xl border border-dashed border-border px-6 py-10">
			<View className="h-14 w-14 items-center justify-center rounded-full bg-muted">
				<Icon name="Warehouse" className="text-muted-foreground" size={25} />
			</View>
			<Text className="mt-4 text-lg font-semibold text-foreground">
				{hasFilters ? "No matching lines" : "No fulfillment lines"}
			</Text>
			<Text className="mt-1 text-center text-sm leading-5 text-muted-foreground">
				{hasFilters
					? "Try another search or clear the active filters."
					: "Backordered and partially available lines will appear here."}
			</Text>
			{hasFilters ? (
				<Pressable
					haptic
					onPress={onClearFilters}
					className="mt-5 min-h-11 items-center justify-center rounded-xl border border-border px-4 active:opacity-80"
				>
					<Text className="text-sm font-semibold text-foreground">
						Clear filters
					</Text>
				</Pressable>
			) : null}
		</View>
	);
}

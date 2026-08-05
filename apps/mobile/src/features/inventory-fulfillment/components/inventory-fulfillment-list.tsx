import { Pressable } from "@/components/ui/pressable";
import { LegendList } from "@legendapp/list";
import { ActivityIndicator, RefreshControl, Text, View } from "react-native";
import { emptyInventoryFulfillmentFilters } from "../lib/inventory-fulfillment-filters";
import type {
	InventoryFulfillmentItem,
	InventoryFulfillmentMode,
} from "../lib/inventory-fulfillment-model";
import { InventoryFulfillmentEmptyState } from "./inventory-fulfillment-empty-state";
import { InventoryFulfillmentListItem } from "./inventory-fulfillment-list-item";

export function InventoryFulfillmentList(props: {
	mode: InventoryFulfillmentMode;
	items: InventoryFulfillmentItem[];
	selectedCount: number;
	activeFilterCount: number;
	canManage: boolean;
	isPending: boolean;
	isRefetching: boolean;
	isFetchingNextPage: boolean;
	hasNextPage: boolean;
	error: unknown;
	isSelected: (key: string) => boolean;
	onToggleSelected: (key: string) => void;
	onOpen: (item: InventoryFulfillmentItem) => void;
	onToggleHold: (item: InventoryFulfillmentItem) => void;
	onShip: (item: InventoryFulfillmentItem) => void;
	onClearFilters: (filters: typeof emptyInventoryFulfillmentFilters) => void;
	onRefresh: () => unknown;
	onLoadMore: () => unknown;
}) {
	if (props.isPending) {
		return (
			<View className="flex-1 items-center justify-center">
				<ActivityIndicator />
			</View>
		);
	}
	if (props.error) {
		return (
			<View className="flex-1 items-center justify-center px-6">
				<Text className="text-center text-sm text-muted-foreground">
					Unable to load fulfillment lines right now.
				</Text>
				<Pressable
					haptic
					onPress={props.onRefresh}
					className="mt-4 min-h-11 items-center justify-center rounded-xl bg-primary px-5"
				>
					<Text className="text-sm font-semibold text-primary-foreground">
						Retry
					</Text>
				</Pressable>
			</View>
		);
	}
	return (
		<LegendList
			data={props.items}
			keyExtractor={(item) => item.key}
			recycleItems
			refreshControl={
				<RefreshControl
					refreshing={props.isRefetching}
					onRefresh={props.onRefresh}
				/>
			}
			contentContainerStyle={{ paddingBottom: props.selectedCount ? 176 : 28 }}
			renderItem={({ item }) => (
				<InventoryFulfillmentListItem
					item={item}
					selected={props.isSelected(item.key)}
					canManage={props.canManage}
					showHoldAction={props.mode === "partial-shipments"}
					onOpen={() => props.onOpen(item)}
					onToggleSelected={() => props.onToggleSelected(item.key)}
					onToggleHold={() => props.onToggleHold(item)}
					onShip={() => props.onShip(item)}
				/>
			)}
			ListEmptyComponent={
				<InventoryFulfillmentEmptyState
					hasFilters={props.activeFilterCount > 0}
					onClearFilters={() =>
						props.onClearFilters(emptyInventoryFulfillmentFilters)
					}
				/>
			}
			onEndReachedThreshold={0.3}
			onEndReached={() => {
				if (props.hasNextPage && !props.isFetchingNextPage) props.onLoadMore();
			}}
			ListFooterComponent={
				props.isFetchingNextPage ? (
					<View className="py-5">
						<ActivityIndicator />
					</View>
				) : null
			}
		/>
	);
}

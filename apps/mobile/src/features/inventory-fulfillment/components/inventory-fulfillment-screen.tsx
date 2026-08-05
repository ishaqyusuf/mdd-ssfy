import { SafeArea } from "@/components/safe-area";
import { useAuthContext } from "@/hooks/use-auth";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { useInventoryFulfillmentActions } from "../api/use-inventory-fulfillment-actions";
import { useInventoryFulfillmentSelection } from "../api/use-inventory-fulfillment-selection";
import type { InventoryFulfillmentFilters } from "../lib/inventory-fulfillment-filters";
import type {
	InventoryFulfillmentItem,
	InventoryFulfillmentMode,
} from "../lib/inventory-fulfillment-model";
import { canManageInventoryFulfillment } from "../lib/inventory-fulfillment-policy";
import { InventoryFulfillmentFilterSheet } from "./inventory-fulfillment-filter-sheet";
import { InventoryFulfillmentHeader } from "./inventory-fulfillment-header";
import { InventoryFulfillmentList } from "./inventory-fulfillment-list";
import { InventoryFulfillmentSelectionBar } from "./inventory-fulfillment-selection-bar";
import {
	type FulfillmentSummaryMetric,
	InventoryFulfillmentSummary,
} from "./inventory-fulfillment-summary";
import { InventoryShipmentSheet } from "./inventory-shipment-sheet";

type Props = {
	mode: InventoryFulfillmentMode;
	title: string;
	subtitle: string;
	filters: InventoryFulfillmentFilters;
	activeFilterCount: number;
	items: InventoryFulfillmentItem[];
	metrics: FulfillmentSummaryMetric[];
	isPending: boolean;
	isRefetching: boolean;
	isFetchingNextPage: boolean;
	hasNextPage: boolean;
	error: unknown;
	onFiltersChange: (filters: InventoryFulfillmentFilters) => void;
	onRefresh: () => unknown;
	onLoadMore: () => unknown;
};

export function InventoryFulfillmentScreen(props: Props) {
	const router = useRouter();
	const auth = useAuthContext();
	const canManage = canManageInventoryFulfillment(auth.profile?.can);
	const [filterOpen, setFilterOpen] = useState(false);
	const selection = useInventoryFulfillmentSelection(props.items);
	const actions = useInventoryFulfillmentActions();
	const busy = actions.isHolding || actions.isShipping;

	const openOrder = useCallback(
		(item: InventoryFulfillmentItem) => {
			if (!item.orderId) return;
			router.push({
				pathname: "/(sales)/orders/[orderNo]",
				params: { orderNo: item.orderId },
			});
		},
		[router],
	);
	const setHold = async (items: InventoryFulfillmentItem[], hold: boolean) => {
		try {
			await actions.setHold(items, hold);
			selection.clearSelection();
		} catch {}
	};

	return (
		<SafeArea>
			<View className="flex-1 bg-background">
				<InventoryFulfillmentHeader
					title={props.title}
					subtitle={props.subtitle}
					activeFilterCount={props.activeFilterCount}
					onOpenFilters={() => setFilterOpen(true)}
				/>
				<InventoryFulfillmentSummary metrics={props.metrics} />
				<InventoryFulfillmentList
					{...props}
					selectedCount={selection.selectedItems.length}
					canManage={canManage}
					isSelected={selection.isSelected}
					onToggleSelected={selection.toggleSelected}
					onOpen={openOrder}
					onToggleHold={(item) => setHold([item], !item.holdUntilComplete)}
					onShip={(item) => selection.setShipmentItems([item])}
					onClearFilters={props.onFiltersChange}
				/>
				<InventoryFulfillmentSelectionBar
					mode={props.mode}
					selectedCount={selection.selectedItems.length}
					canShip={selection.shipmentSelection.valid}
					disabled={busy || !canManage}
					onClear={selection.clearSelection}
					onHold={() => setHold(selection.selectedItems, true)}
					onAllowPartial={() => setHold(selection.selectedItems, false)}
					onShip={() => selection.setShipmentItems(selection.selectedItems)}
				/>
				<InventoryFulfillmentFilterSheet
					visible={filterOpen}
					mode={props.mode}
					filters={props.filters}
					onClose={() => setFilterOpen(false)}
					onApply={props.onFiltersChange}
				/>
				<InventoryShipmentSheet
					visible={selection.shipmentItems.length > 0}
					items={selection.shipmentItems}
					isSubmitting={actions.isShipping}
					onClose={() => selection.setShipmentItems([])}
					onSubmit={(input) =>
						actions
							.ship({ items: selection.shipmentItems, ...input })
							.then((result) => {
								selection.clearSelection();
								return result;
							})
					}
				/>
			</View>
		</SafeArea>
	);
}

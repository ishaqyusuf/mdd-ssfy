import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text, View } from "react-native";
import type { InventoryFulfillmentItem } from "../lib/inventory-fulfillment-model";
import { InventoryFulfillmentItemContent } from "./inventory-fulfillment-item-content";

export type InventoryFulfillmentListItemProps = {
	item: InventoryFulfillmentItem;
	selected: boolean;
	canManage: boolean;
	showHoldAction: boolean;
	onOpen: () => void;
	onToggleSelected: () => void;
	onToggleHold: () => void;
	onShip: () => void;
};

export function InventoryFulfillmentListItem(
	props: InventoryFulfillmentListItemProps,
) {
	return (
		<View className="mx-4 mb-3 rounded-2xl border border-border bg-card p-4">
			<View className="flex-row items-start gap-3">
				<Pressable
					haptic
					disabled={!props.item.lineItemId}
					onPress={props.onToggleSelected}
					className="h-11 w-11 items-center justify-center rounded-full active:bg-muted disabled:opacity-40"
				>
					<View
						className={
							props.selected
								? "h-6 w-6 items-center justify-center rounded-full bg-primary"
								: "h-6 w-6 rounded-full border-2 border-muted-foreground/50"
						}
					>
						{props.selected ? (
							<Icon
								name="CircleCheck"
								className="text-primary-foreground"
								size={16}
							/>
						) : null}
					</View>
				</Pressable>
				<Pressable
					haptic
					onPress={props.onOpen}
					className="min-h-11 min-w-0 flex-1 active:opacity-80"
				>
					<View className="flex-row items-start justify-between gap-2">
						<View className="min-w-0 flex-1">
							<Text
								numberOfLines={1}
								className="text-base font-bold text-foreground"
							>
								Order {props.item.orderId || props.item.salesOrderId || "N/A"}
							</Text>
							<Text
								numberOfLines={1}
								className="mt-0.5 text-xs text-muted-foreground"
							>
								{props.item.customerName}
							</Text>
						</View>
						<Icon
							name="ChevronRight"
							className="text-muted-foreground"
							size={18}
						/>
					</View>
				</Pressable>
			</View>
			<InventoryFulfillmentItemContent {...props} />
		</View>
	);
}

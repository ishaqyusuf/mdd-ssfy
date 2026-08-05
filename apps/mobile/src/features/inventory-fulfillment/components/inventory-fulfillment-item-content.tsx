import { Pressable } from "@/components/ui/pressable";
import { Text, View } from "react-native";
import {
	type InventoryFulfillmentItem,
	formatFulfillmentLabel,
	formatFulfillmentQty,
} from "../lib/inventory-fulfillment-model";
import type { InventoryFulfillmentListItemProps } from "./inventory-fulfillment-list-item";

const statusTone: Record<InventoryFulfillmentItem["status"], string> = {
	available_now: "border-emerald-200 bg-emerald-50",
	held_until_complete: "border-slate-300 bg-slate-100",
	awaiting_inbound: "border-amber-200 bg-amber-50",
	backordered: "border-rose-200 bg-rose-50",
	ready_to_ship_remaining: "border-blue-200 bg-blue-50",
};

export function InventoryFulfillmentItemContent({
	item,
	canManage,
	showHoldAction,
	onToggleHold,
	onShip,
}: InventoryFulfillmentListItemProps) {
	return (
		<>
			<View className="mt-3 flex-row flex-wrap gap-2">
				<View
					className={`rounded-full border px-2.5 py-1 ${statusTone[item.status]}`}
				>
					<Text className="text-[11px] font-semibold text-foreground">
						{formatFulfillmentLabel(item.status)}
					</Text>
				</View>
				<View className="rounded-full bg-muted px-2.5 py-1">
					<Text className="text-[11px] font-semibold text-muted-foreground">
						{formatFulfillmentLabel(item.deliveryMode)}
					</Text>
				</View>
				{item.holdUntilComplete ? (
					<View className="rounded-full bg-slate-200 px-2.5 py-1">
						<Text className="text-[11px] font-semibold text-slate-700">
							Hold until complete
						</Text>
					</View>
				) : null}
			</View>
			<Text
				numberOfLines={2}
				className="mt-3 text-sm font-semibold leading-5 text-foreground"
			>
				{item.title}
			</Text>
			<View className="mt-3 flex-row rounded-xl bg-muted/50 p-3">
				<Quantity label="Remaining" value={item.remainingQty} />
				<Quantity label="Available" value={item.availableToShipQty} />
				<Quantity label="Backorder" value={item.backorderedQty} />
			</View>
			<Text numberOfLines={1} className="mt-2 text-xs text-muted-foreground">
				{item.blockerLabel
					? `${item.blockerLabel}${item.blockerCount > 1 ? ` +${item.blockerCount - 1}` : ""}`
					: `Shipped ${formatFulfillmentQty(item.shippedQty)} of ${formatFulfillmentQty(item.orderedQty)}`}
			</Text>
			{canManage ? (
				<View className="mt-3 flex-row justify-end gap-2 border-t border-border/60 pt-3">
					{showHoldAction ? (
						<Action
							label={item.holdUntilComplete ? "Allow partial" : "Hold"}
							onPress={onToggleHold}
							disabled={!item.lineItemId}
							secondary
						/>
					) : null}
					<Action
						label="Ship available"
						onPress={onShip}
						disabled={
							!item.canShipNow || !item.salesOrderId || !item.lineItemId
						}
					/>
				</View>
			) : null}
		</>
	);
}

function Quantity({ label, value }: { label: string; value: number }) {
	return (
		<View className="flex-1">
			<Text className="text-[10px] text-muted-foreground">{label}</Text>
			<Text className="mt-1 font-mono text-sm font-bold text-foreground">
				{formatFulfillmentQty(value)}
			</Text>
		</View>
	);
}

function Action({
	label,
	onPress,
	disabled,
	secondary,
}: {
	label: string;
	onPress: () => void;
	disabled?: boolean;
	secondary?: boolean;
}) {
	return (
		<Pressable
			haptic
			disabled={disabled}
			onPress={onPress}
			className={`${secondary ? "border border-border bg-background" : "bg-primary"} min-h-11 items-center justify-center rounded-xl px-4 active:opacity-80 disabled:opacity-40`}
		>
			<Text
				className={
					secondary
						? "text-xs font-semibold text-foreground"
						: "text-xs font-semibold text-primary-foreground"
				}
			>
				{label}
			</Text>
		</Pressable>
	);
}

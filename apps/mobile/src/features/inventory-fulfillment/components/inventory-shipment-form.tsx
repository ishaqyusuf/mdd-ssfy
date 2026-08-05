import { BottomSheetKeyboardAwareScrollView } from "@/components/ui/bottom-sheet-keyboard-aware-scroll-view";
import { Pressable } from "@/components/ui/pressable";
import type { DeliveryOption } from "@gnd/utils/sales";
import { Text, View } from "react-native";
import {
	type InventoryFulfillmentItem,
	formatFulfillmentLabel,
	fulfillmentDeliveryModes,
} from "../lib/inventory-fulfillment-model";
import {
	InventoryShipmentAction,
	InventoryShipmentField,
	InventoryShipmentQuantity,
} from "./inventory-shipment-fields";

export function InventoryShipmentForm(props: {
	items: InventoryFulfillmentItem[];
	totals: { available: number; remaining: number; backorder: number };
	deliveryMode: DeliveryOption | null;
	deliveredTo: string;
	note: string;
	isSubmitting: boolean;
	onDeliveryModeChange: (mode: DeliveryOption) => void;
	onDeliveredToChange: (value: string) => void;
	onNoteChange: (value: string) => void;
	onCancel: () => void;
	onSubmit: () => void;
}) {
	return (
		<BottomSheetKeyboardAwareScrollView
			bottomOffset={120}
			keyboardShouldPersistTaps="handled"
			contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 20 }}
		>
			<Text className="text-lg font-bold text-foreground">
				Ship available inventory
			</Text>
			<Text className="mt-1 text-sm text-muted-foreground">
				{props.items.length} line{props.items.length === 1 ? "" : "s"} from
				order {props.items[0]?.orderId || props.items[0]?.salesOrderId || "N/A"}
			</Text>
			<View className="mt-4 flex-row rounded-xl bg-muted/50 p-3">
				<InventoryShipmentQuantity
					label="Available"
					value={props.totals.available}
				/>
				<InventoryShipmentQuantity
					label="Remaining"
					value={props.totals.remaining}
				/>
				<InventoryShipmentQuantity
					label="Backorder"
					value={props.totals.backorder}
				/>
			</View>
			<Text className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
				Delivery mode
			</Text>
			<View className="flex-row gap-2">
				{fulfillmentDeliveryModes.map((mode) => (
					<Pressable
						haptic
						key={mode}
						onPress={() => props.onDeliveryModeChange(mode)}
						className={
							props.deliveryMode === mode
								? "min-h-11 flex-1 items-center justify-center rounded-xl border border-primary bg-primary/10 px-2"
								: "min-h-11 flex-1 items-center justify-center rounded-xl border border-border px-2"
						}
					>
						<Text
							className={
								props.deliveryMode === mode
									? "text-xs font-semibold text-primary"
									: "text-xs font-semibold text-muted-foreground"
							}
						>
							{formatFulfillmentLabel(mode)}
						</Text>
					</Pressable>
				))}
			</View>
			<InventoryShipmentField
				label="Delivered to"
				value={props.deliveredTo}
				onChangeText={props.onDeliveredToChange}
				placeholder="Customer, carrier, or pickup contact"
				maxLength={500}
			/>
			<InventoryShipmentField
				label="Note"
				value={props.note}
				onChangeText={props.onNoteChange}
				placeholder="Shipment note"
				maxLength={2000}
				multiline
			/>
			<View className="mt-6 flex-row gap-2">
				<InventoryShipmentAction
					label="Cancel"
					onPress={props.onCancel}
					disabled={props.isSubmitting}
					secondary
				/>
				<InventoryShipmentAction
					label={props.isSubmitting ? "Shipping…" : "Confirm shipment"}
					onPress={props.onSubmit}
					disabled={props.isSubmitting}
				/>
			</View>
		</BottomSheetKeyboardAwareScrollView>
	);
}

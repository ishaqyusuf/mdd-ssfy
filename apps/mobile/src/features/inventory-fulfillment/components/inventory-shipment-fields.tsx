import { Pressable } from "@/components/ui/pressable";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Text, View } from "react-native";
import { formatFulfillmentQty } from "../lib/inventory-fulfillment-model";

export function InventoryShipmentQuantity({
	label,
	value,
}: {
	label: string;
	value: number;
}) {
	return (
		<View className="flex-1">
			<Text className="text-[10px] text-muted-foreground">{label}</Text>
			<Text className="mt-1 font-mono text-sm font-bold text-foreground">
				{formatFulfillmentQty(value)}
			</Text>
		</View>
	);
}

export function InventoryShipmentField(props: {
	label: string;
	value: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	maxLength: number;
	multiline?: boolean;
}) {
	return (
		<View className="mt-4">
			<Text className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
				{props.label}
			</Text>
			<BottomSheetTextInput
				{...props}
				className="min-h-12 rounded-xl border border-border bg-background px-3 py-3 text-foreground"
				placeholderTextColor="#8A8A8A"
			/>
		</View>
	);
}

export function InventoryShipmentAction({
	label,
	onPress,
	disabled,
	secondary,
}: {
	label: string;
	onPress: () => void;
	disabled: boolean;
	secondary?: boolean;
}) {
	return (
		<Pressable
			haptic
			disabled={disabled}
			onPress={onPress}
			className={`${secondary ? "border border-border" : "bg-primary"} h-11 flex-1 items-center justify-center rounded-xl disabled:opacity-50`}
		>
			<Text
				className={
					secondary
						? "text-sm font-semibold text-foreground"
						: "text-sm font-semibold text-primary-foreground"
				}
			>
				{label}
			</Text>
		</Pressable>
	);
}

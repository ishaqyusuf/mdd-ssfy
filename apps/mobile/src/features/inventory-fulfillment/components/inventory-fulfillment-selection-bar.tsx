import { Pressable } from "@/components/ui/pressable";
import { Text, View } from "react-native";
import type { InventoryFulfillmentMode } from "../lib/inventory-fulfillment-model";

export function InventoryFulfillmentSelectionBar({
	mode,
	selectedCount,
	canShip,
	disabled,
	onClear,
	onHold,
	onAllowPartial,
	onShip,
}: {
	mode: InventoryFulfillmentMode;
	selectedCount: number;
	canShip: boolean;
	disabled: boolean;
	onClear: () => void;
	onHold: () => void;
	onAllowPartial: () => void;
	onShip: () => void;
}) {
	if (!selectedCount) return null;
	return (
		<View className="absolute bottom-8 left-3 right-3 rounded-2xl border border-border bg-card p-3 shadow-lg shadow-black/10">
			<View className="mb-2 flex-row items-center justify-between">
				<Text className="text-sm font-semibold text-foreground">
					{selectedCount} selected
				</Text>
				<Pressable
					haptic
					onPress={onClear}
					className="min-h-11 items-center justify-center rounded-lg px-3 active:bg-muted"
				>
					<Text className="text-xs font-semibold text-muted-foreground">
						Deselect
					</Text>
				</Pressable>
			</View>
			<View className="flex-row gap-2">
				{mode === "partial-shipments" ? (
					<>
						<Action
							label="Hold"
							onPress={onHold}
							disabled={disabled}
							secondary
						/>
						<Action
							label="Allow partial"
							onPress={onAllowPartial}
							disabled={disabled}
							secondary
						/>
					</>
				) : null}
				<Action label="Ship" onPress={onShip} disabled={disabled || !canShip} />
			</View>
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
	disabled: boolean;
	secondary?: boolean;
}) {
	return (
		<Pressable
			haptic
			disabled={disabled}
			onPress={onPress}
			className={`${secondary ? "border border-border bg-background" : "bg-primary"} min-h-11 flex-1 items-center justify-center rounded-xl px-2 disabled:opacity-40`}
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

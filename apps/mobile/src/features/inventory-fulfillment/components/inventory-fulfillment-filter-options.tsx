import { Pressable } from "@/components/ui/pressable";
import type { DeliveryOption } from "@gnd/utils/sales";
import { Text, View } from "react-native";
import type { InventoryFulfillmentFilters } from "../lib/inventory-fulfillment-filters";
import {
	type InventoryFulfillmentMode,
	type InventoryFulfillmentStatus,
	backorderStatuses,
	formatFulfillmentLabel,
	fulfillmentDeliveryModes,
	partialShipmentStatuses,
} from "../lib/inventory-fulfillment-model";

function toggle<T>(items: T[], value: T) {
	return items.includes(value)
		? items.filter((item) => item !== value)
		: [...items, value];
}

export function InventoryFulfillmentFilterOptions({
	mode,
	draft,
	onChange,
}: {
	mode: InventoryFulfillmentMode;
	draft: InventoryFulfillmentFilters;
	onChange: (next: InventoryFulfillmentFilters) => void;
}) {
	const statuses =
		mode === "backorders" ? backorderStatuses : partialShipmentStatuses;
	return (
		<View className="gap-5">
			<FilterGroup label="Status">
				{statuses.map((status) => (
					<FilterChip
						key={status}
						label={formatFulfillmentLabel(status)}
						selected={draft.statuses.includes(status)}
						onPress={() =>
							onChange({
								...draft,
								statuses: toggle(
									draft.statuses,
									status as InventoryFulfillmentStatus,
								),
							})
						}
					/>
				))}
			</FilterGroup>
			<FilterGroup label="Delivery mode">
				{fulfillmentDeliveryModes.map((deliveryMode) => (
					<FilterChip
						key={deliveryMode}
						label={formatFulfillmentLabel(deliveryMode)}
						selected={draft.deliveryModes.includes(deliveryMode)}
						onPress={() =>
							onChange({
								...draft,
								deliveryModes: toggle(
									draft.deliveryModes,
									deliveryMode as DeliveryOption,
								),
							})
						}
					/>
				))}
			</FilterGroup>
			<FilterGroup label="Fulfillment hold">
				{(
					[
						[null, "Any"],
						[true, "Held until complete"],
						[false, "Partial allowed"],
					] as const
				).map(([value, label]) => (
					<FilterChip
						key={label}
						label={label}
						selected={draft.holdUntilComplete === value}
						onPress={() => onChange({ ...draft, holdUntilComplete: value })}
					/>
				))}
			</FilterGroup>
		</View>
	);
}

function FilterGroup({
	label,
	children,
}: { label: string; children: React.ReactNode }) {
	return (
		<View>
			<Text className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
				{label}
			</Text>
			<View className="flex-row flex-wrap gap-2">{children}</View>
		</View>
	);
}

function FilterChip({
	label,
	selected,
	onPress,
}: { label: string; selected: boolean; onPress: () => void }) {
	return (
		<Pressable
			haptic
			onPress={onPress}
			className={
				selected
					? "min-h-11 items-center justify-center rounded-full border border-primary bg-primary/10 px-3 active:opacity-80"
					: "min-h-11 items-center justify-center rounded-full border border-border bg-background px-3 active:opacity-80"
			}
		>
			<Text
				className={
					selected
						? "text-xs font-semibold text-primary"
						: "text-xs font-semibold text-muted-foreground"
				}
			>
				{label}
			</Text>
		</Pressable>
	);
}

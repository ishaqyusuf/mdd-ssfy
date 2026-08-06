import { Icon } from "@/components/ui/icon";
import type { DispatchOverviewItem } from "@/features/dispatch/types/dispatch.types";
import { Text, View } from "react-native";

type Props = {
	item: DispatchOverviewItem;
	compact?: boolean;
};

function quantityLabel(value?: {
	qty?: number | null;
	lh?: number | null;
	rh?: number | null;
	total?: number | null;
}) {
	const parts = [
		Number(value?.qty || 0) > 0 ? `Qty ${value?.qty}` : null,
		Number(value?.lh || 0) > 0 ? `LH ${value?.lh}` : null,
		Number(value?.rh || 0) > 0 ? `RH ${value?.rh}` : null,
	].filter(Boolean);
	return parts.join(" · ") || `Total ${Number(value?.total || 0)}`;
}
function FactRow({ label, value }: { label: string; value: string }) {
	return (
		<View className="flex-row items-start justify-between gap-4 border-b border-border/60 py-2.5 last:border-b-0">
			<Text className="text-xs font-semibold uppercase tracking-[0.8px] text-muted-foreground">
				{label}
			</Text>
			<Text className="max-w-[65%] text-right text-sm font-semibold text-foreground">
				{value}
			</Text>
		</View>
	);
}

export function ManifestItemFacts({ item, compact = false }: Props) {
	const inventoryLabel =
		item.executionMode === "inventory"
			? String(item.inventoryReadiness || "inventory_review")
					.split("_")
					.join(" ")
			: "Legacy fulfillment";
	if (compact) {
		return (
			<View className="mt-1.5 gap-1">
				<Text className="text-xs text-muted-foreground" numberOfLines={1}>
					{[item.itemType, item.size].filter(Boolean).join(" · ") ||
						"Item details unavailable"}
				</Text>
				<Text
					className={`text-xs font-semibold ${
						item.detailCompleteness === "complete"
							? "text-foreground"
							: "text-amber-700 dark:text-amber-300"
					}`}
					numberOfLines={1}
				>
					{item.handingLabel}
				</Text>
				<Text
					className={`text-xs font-semibold capitalize ${
						item.inventoryReadiness === "ready_to_load"
							? "text-emerald-700 dark:text-emerald-300"
							: item.executionMode === "inventory"
								? "text-amber-700 dark:text-amber-300"
								: "text-muted-foreground"
					}`}
				>
					{inventoryLabel}
				</Text>
			</View>
		);
	}

	return (
		<View className="mb-5 rounded-2xl border border-border bg-card p-4">
			<View className="mb-2 flex-row items-center gap-2">
				<Icon name="ClipboardCheck" className="text-primary" size={18} />
				<Text className="text-base font-bold text-foreground">Item Manifest</Text>
			</View>
			<FactRow label="Type" value={item.itemType || "Not recorded"} />
			<FactRow label="Product" value={item.productTitle || item.title} />
			{item.inventory?.sku ? (
				<FactRow label="SKU" value={item.inventory.sku} />
			) : null}
			<FactRow label="Inventory" value={inventoryLabel} />
			<FactRow label="Size" value={item.size || "Size not recorded"} />
			<FactRow label="Handing" value={item.handingLabel} />
			<FactRow label="Ordered" value={quantityLabel(item.orderedQty)} />
			<FactRow label="Packed" value={quantityLabel(item.packedQty)} />
			<FactRow label="Remaining" value={quantityLabel(item.remainingQty)} />
			{item.detailCompleteness !== "complete" ? (
				<View className="mt-3 flex-row items-start gap-2 rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30">
					<Icon
						name="TriangleAlert"
						className="mt-0.5 text-amber-700 dark:text-amber-300"
						size={16}
					/>
					<Text className="flex-1 text-xs leading-5 text-amber-800 dark:text-amber-200">
						{item.warnings?.[0] ||
							`Missing ${item.missingFields?.join(", ") || "item details"}. Confirm before loading.`}
					</Text>
				</View>
			) : null}
		</View>
	);
}

import { Text, View } from "react-native";
import { formatFulfillmentQty } from "../lib/inventory-fulfillment-model";

export type FulfillmentSummaryMetric = {
	label: string;
	value: number | null | undefined;
	tone?: "default" | "warning" | "success";
};

export function InventoryFulfillmentSummary({
	metrics,
}: {
	metrics: FulfillmentSummaryMetric[];
}) {
	return (
		<View className="mx-4 mb-3 flex-row flex-wrap gap-2">
			{metrics.map((metric) => (
				<View
					key={metric.label}
					className="min-h-[78px] min-w-[47%] flex-1 rounded-2xl border border-border bg-card p-3"
				>
					<Text className="text-xs font-medium text-muted-foreground">
						{metric.label}
					</Text>
					<Text
						className={
							metric.tone === "warning"
								? "mt-1 text-2xl font-bold text-amber-600"
								: metric.tone === "success"
									? "mt-1 text-2xl font-bold text-emerald-600"
									: "mt-1 text-2xl font-bold text-foreground"
						}
					>
						{metric.value == null ? "—" : formatFulfillmentQty(metric.value)}
					</Text>
				</View>
			))}
		</View>
	);
}

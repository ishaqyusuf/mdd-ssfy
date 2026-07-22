import { z } from "zod";

export const dealerDeliveryPricingSchema = z.object({
	enabled: z.boolean().default(false),
	deliveryBaseCost: z.number().min(0).max(100_000).default(0),
	shipBaseCost: z.number().min(0).max(100_000).default(0),
	freeDeliveryOrderMinimum: z
		.number()
		.min(0)
		.max(10_000_000)
		.optional()
		.nullable(),
});

export type DealerDeliveryPricingSettings = z.infer<
	typeof dealerDeliveryPricingSchema
>;

export function normalizeDealerDeliveryPricingSettings(value: unknown) {
	const parsed = dealerDeliveryPricingSchema.safeParse(value);
	return parsed.success ? parsed.data : dealerDeliveryPricingSchema.parse({});
}

export function resolveDealerDeliveryCostSuggestion({
	settings,
	deliveryOption,
	grandTotal,
}: {
	settings: DealerDeliveryPricingSettings;
	deliveryOption?: string | null;
	grandTotal?: number | null;
}) {
	if (!settings.enabled) return null;
	const mode = String(deliveryOption || "pickup").toLowerCase();
	if (mode !== "delivery" && mode !== "ship") return null;
	const orderTotal = Math.max(0, Number(grandTotal || 0));
	const minimum = Number(settings.freeDeliveryOrderMinimum);
	if (
		mode === "delivery" &&
		settings.freeDeliveryOrderMinimum != null &&
		Number.isFinite(minimum) &&
		orderTotal >= minimum
	) {
		return {
			cost: 0,
			reason: `Free delivery at ${minimum.toLocaleString("en-US", {
				style: "currency",
				currency: "USD",
			})} or more`,
			source: "sales_settings" as const,
		};
	}
	const cost =
		mode === "ship" ? settings.shipBaseCost : settings.deliveryBaseCost;
	return {
		cost,
		reason: `${mode === "ship" ? "Shipping" : "Delivery"} base cost`,
		source: "sales_settings" as const,
	};
}

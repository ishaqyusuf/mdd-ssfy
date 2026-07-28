import { createSalesFormCapabilities } from "@gnd/sales/sales-form";

export function useSalesFormCapabilities(type: "order" | "quote") {
	return createSalesFormCapabilities({
		customerSelector: true,
		customerProfiles: true,
		taxProfiles: true,
		paymentMethodReview: true,
		payments: true,
		printing: true,
		packing: type === "order",
		dispatch: type === "order",
		salesHistory: true,
		internalOverview: true,
		settings: true,
		dealerPricing: false,
		dealerBranding: false,
	});
}

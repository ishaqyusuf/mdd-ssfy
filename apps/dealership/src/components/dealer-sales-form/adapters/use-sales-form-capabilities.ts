import { createSalesFormCapabilities } from "@gnd/sales/sales-form";

export function useSalesFormCapabilities() {
	return createSalesFormCapabilities({
		customerSelector: true,
		customerProfiles: true,
		taxProfiles: false,
		paymentMethodReview: false,
		payments: false,
		printing: false,
		packing: false,
		dispatch: false,
		salesHistory: false,
		internalOverview: false,
		settings: false,
		dealerPricing: true,
		dealerBranding: true,
	});
}

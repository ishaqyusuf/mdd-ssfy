export type SalesFormCapabilities = {
	customerSelector: boolean;
	customerProfiles: boolean;
	taxProfiles: boolean;
	paymentMethodReview: boolean;
	payments: boolean;
	printing: boolean;
	packing: boolean;
	dispatch: boolean;
	salesHistory: boolean;
	internalOverview: boolean;
	settings: boolean;
	dealerPricing: boolean;
	dealerBranding: boolean;
};

export function createSalesFormCapabilities(
	patch: Partial<SalesFormCapabilities> = {},
): SalesFormCapabilities {
	return {
		customerSelector: false,
		customerProfiles: false,
		taxProfiles: false,
		paymentMethodReview: false,
		payments: false,
		printing: false,
		packing: false,
		dispatch: false,
		salesHistory: false,
		internalOverview: false,
		settings: false,
		dealerPricing: false,
		dealerBranding: false,
		...patch,
	};
}

export type CheckoutBuyerIdentity =
	| "sale-customer"
	| "payer-enters-at-checkout";

export function checkoutBuyerPrepopulatedData(input: {
	identity?: CheckoutBuyerIdentity;
	email?: string | null;
	phone?: string | null;
	address?: string | null;
}) {
	if (input.identity === "payer-enters-at-checkout") return undefined;

	return {
		buyerEmail: input.email || undefined,
		...(input.phone ? { buyerPhoneNumber: input.phone } : {}),
		buyerAddress: {
			addressLine1: input.address || undefined,
		},
	};
}

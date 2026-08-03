export type CustomerAddressFormValue = {
	addressId?: number | null;
	address1?: string | null;
	formattedAddress?: string | null;
	address2?: string | null;
	route?: string | null;
	zip_code?: string | null;
	lat?: number | null;
	lng?: number | null;
	placeId?: string | null;
	country?: string | null;
	state?: string | null;
	city?: string | null;
};

export function isShippingSameAsBilling(
	billingAddressId?: number | null,
	shippingAddressId?: number | null,
) {
	return (
		billingAddressId != null &&
		shippingAddressId != null &&
		billingAddressId === shippingAddressId
	);
}

export function createShippingDraft(
	billingAddress?: CustomerAddressFormValue | null,
): CustomerAddressFormValue {
	return {
		...(billingAddress || {}),
		addressId: null,
	};
}

import type { CustomerAddressFormValue } from "../../forms/customer-form/customer-address-state";

export function createSalesAddressPaneDraft({
	addressId,
	billingAddress,
	selectedAddress,
}: {
	addressId?: number | null;
	billingAddress?: CustomerAddressFormValue | null;
	selectedAddress?: CustomerAddressFormValue | null;
}) {
	return {
		name: "",
		address1: "",
		address2: "",
		city: "",
		country: "",
		formattedAddress: "",
		placeId: "",
		route: "",
		state: "",
		zip_code: "",
		...(selectedAddress || billingAddress || {}),
		addressId: addressId ?? undefined,
		addressOnly: true as const,
	};
}

type CurrentCustomerSelection = {
	customerId: number | null;
	customerProfileId: number | null;
	billingAddressId: number | null;
	shippingAddressId: number | null;
	paymentTerm: string | null;
	taxCode: string | null;
};

type SavedCustomerSelection = {
	customerId: number;
	profileId?: number | null;
	addressId?: number | null;
	billingAddressId?: number | null;
	shippingAddressId?: number | null;
	netTerm?: string | null;
	taxCode?: string | null;
};

export function resolveCustomerFormSelection({
	current,
	editedCustomerId,
	savedCustomer,
}: {
	current: CurrentCustomerSelection;
	editedCustomerId?: number | null;
	savedCustomer: SavedCustomerSelection;
}) {
	const savedAddressId = savedCustomer.addressId ?? null;
	const savedBillingAddressId =
		savedCustomer.billingAddressId ?? savedAddressId;
	const savedShippingAddressId =
		savedCustomer.shippingAddressId ?? savedBillingAddressId;
	const editedCurrentCustomer =
		editedCustomerId === current.customerId &&
		savedCustomer.customerId === current.customerId;

	if (!editedCurrentCustomer) {
		return {
			customerId: savedCustomer.customerId,
			customerProfileId: savedCustomer.profileId ?? null,
			billingAddressId: savedBillingAddressId,
			shippingAddressId: savedShippingAddressId,
			paymentTerm: savedCustomer.netTerm ?? null,
			taxCode: savedCustomer.taxCode ?? null,
		};
	}

	const hasExplicitSaleAddresses =
		savedCustomer.billingAddressId !== undefined ||
		savedCustomer.shippingAddressId !== undefined;
	if (hasExplicitSaleAddresses) {
		return {
			customerId: savedCustomer.customerId,
			customerProfileId: current.customerProfileId,
			billingAddressId:
				savedCustomer.billingAddressId ?? current.billingAddressId,
			shippingAddressId:
				savedCustomer.shippingAddressId ?? current.shippingAddressId,
			paymentTerm: current.paymentTerm,
			taxCode: current.taxCode,
		};
	}

	const primaryAddressId = savedAddressId ?? current.billingAddressId;
	const billingAddressId = current.billingAddressId ?? primaryAddressId;
	const shippingAddressId =
		current.shippingAddressId == null ||
		current.shippingAddressId === current.billingAddressId
			? primaryAddressId
			: current.shippingAddressId;

	return {
		customerId: savedCustomer.customerId,
		customerProfileId: current.customerProfileId,
		billingAddressId,
		shippingAddressId,
		paymentTerm: current.paymentTerm,
		taxCode: current.taxCode,
	};
}

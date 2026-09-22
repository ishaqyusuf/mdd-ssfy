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

type CustomerProfileOption = {
	id?: number | null;
	coefficient?: number | string | null;
};

export type CustomerProfileTransition =
	| {
			status: "ready";
			previousCoefficient: number | null;
			nextCoefficient: number | null;
	  }
	| { status: "unavailable" };

function resolveProfileCoefficient(
	profileId: number | null,
	profiles: readonly CustomerProfileOption[],
) {
	if (profileId == null) return null;
	const profile = profiles.find(
		(candidate) => Number(candidate.id) === Number(profileId),
	);
	if (!profile) return undefined;
	if (profile.coefficient == null) return null;
	const coefficient = Number(profile.coefficient);
	return Number.isFinite(coefficient) && coefficient > 0
		? coefficient
		: undefined;
}

export function resolveCustomerProfileTransition({
	currentProfileId,
	nextProfileId,
	profiles,
}: {
	currentProfileId: number | null;
	nextProfileId: number | null;
	profiles: readonly CustomerProfileOption[];
}): CustomerProfileTransition {
	const previousCoefficient = resolveProfileCoefficient(
		currentProfileId,
		profiles,
	);
	const nextCoefficient = resolveProfileCoefficient(nextProfileId, profiles);
	if (previousCoefficient === undefined || nextCoefficient === undefined) {
		return { status: "unavailable" };
	}
	return {
		status: "ready",
		previousCoefficient,
		nextCoefficient,
	};
}

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

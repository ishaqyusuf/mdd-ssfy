import { useMemo } from "react";
import { useCustomerProfilesQuery, useCustomerTaxProfilesQuery } from "../api";
import { useNewSalesFormStore } from "../store";

export function useSalesFormData() {
	const record = useNewSalesFormStore((state) => state.record);
	const customerProfiles = useCustomerProfilesQuery(true);
	const taxProfiles = useCustomerTaxProfilesQuery(true);

	return useMemo(
		() => ({
			record,
			customerProfiles: customerProfiles.data || [],
			taxProfiles: taxProfiles.data || [],
			isLoadingProfiles: customerProfiles.isPending || taxProfiles.isPending,
		}),
		[
			customerProfiles.data,
			customerProfiles.isPending,
			record,
			taxProfiles.data,
			taxProfiles.isPending,
		],
	);
}

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type {
	DealerSalesFormCustomer,
	DealerSalesFormProfile,
	DealerSalesFormRecord,
} from "../types";

export function useSalesFormData() {
	const trpc = useTRPC();
	const customers = useQuery(trpc.dealerPortal.customers.queryOptions());
	const salesProfiles = useQuery(
		trpc.dealerPortal.salesProfiles.queryOptions(),
	);

	return useMemo(
		() => ({
			customers: customers.data || [],
			salesProfiles: salesProfiles.data || [],
			isLoading: customers.isPending || salesProfiles.isPending,
		}),
		[
			customers.data,
			customers.isPending,
			salesProfiles.data,
			salesProfiles.isPending,
		],
	);
}

export function useDealerSalesFormData(input: {
	customers: DealerSalesFormCustomer[];
	profiles: DealerSalesFormProfile[];
	record: DealerSalesFormRecord | null;
	isLoading?: boolean;
}) {
	return useMemo(
		() => ({
			customers: input.customers,
			profiles: input.profiles,
			record: input.record,
			isLoading: Boolean(input.isLoading),
		}),
		[input.customers, input.isLoading, input.profiles, input.record],
	);
}

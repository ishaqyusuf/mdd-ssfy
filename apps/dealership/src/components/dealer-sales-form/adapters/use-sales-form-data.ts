import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

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

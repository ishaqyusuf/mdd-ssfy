import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useMemo, useState } from "react";

type CommunityInstallCostRateContextProps = ReturnType<
	typeof useCreateCommunityInstallCostRateContext
>;
const CommunityInstallCostRateContext = createContext<
	CommunityInstallCostRateContextProps | undefined
>(undefined);
export const CommunityInstallCostRateProvider =
	CommunityInstallCostRateContext.Provider;
export const useCreateCommunityInstallCostRateContext = () => {
	const trpc = useTRPC();
	const { data, isLoading } = useQuery(
		trpc.community.getCommunityInstallCostRates.queryOptions(undefined, {
			staleTime: 1000 * 60 * 10,
			gcTime: 1000 * 60 * 30,
		}),
	);
	const [editIndex, setEditIndex] = useState<number | null>(null);

	return useMemo(
		() => ({
			setEditIndex,
			editIndex,
			isLoading,
			communityInstallCostRates: data?.communityInstallCostRates || [],
			legacyCosts: data?.legacyCosts || [],
		}),
		[editIndex, isLoading, data?.communityInstallCostRates, data?.legacyCosts],
	);
};
export const useCommunityInstallCostRateContext = () => {
	const context = useContext(CommunityInstallCostRateContext);
	if (context === undefined) {
		throw new Error(
			"useCommunityInstallCostRateContext must be used within a CommunityInstallCostRateProvider",
		);
	}
	return context;
};

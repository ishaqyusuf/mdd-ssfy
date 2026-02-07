import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useState } from "react";

type CommunityInstallCostRateContextProps = ReturnType<
    typeof useCreateCommunityInstallCostRateContext
>;
export const CommunityInstallCostRateContext =
    createContext<CommunityInstallCostRateContextProps>(undefined as any);
export const CommunityInstallCostRateProvider =
    CommunityInstallCostRateContext.Provider;
export const useCreateCommunityInstallCostRateContext = () => {
    const { data } = useQuery(
        useTRPC().community.getCommunityInstallCostRates.queryOptions(),
    );
    const [editIndex, setEditIndex] = useState<number | null>(null);
    return {
        setEditIndex,
        editIndex,
        communityInstallCostRates: data?.communityInstallCostRates || [],
        legacyCosts: data?.legacyCosts || [],
    };
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


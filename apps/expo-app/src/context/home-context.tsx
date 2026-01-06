import { _trpc } from "@/components/static-trpc";
import { getSessionProfile } from "@/lib/session-store";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";

type HomeContextProps = ReturnType<typeof useCreateHomeContext>;
export const HomeContext = createContext<HomeContextProps>(undefined as any);
export const HomeProvider = HomeContext.Provider;
export const useCreateHomeContext = () => {
  const profile = getSessionProfile();
  const { data, isPending, isRefetching, refetch } = useQuery(
    _trpc.jobs.getJobs.queryOptions({
      size: 5,
      userId: profile.user.id,
    })
  );
  return {
    recentJobs: data?.data || [],
    isRefreshing: isRefetching,
    refresh() {
      refetch();
    },
  };
};
export const useHomeContext = () => {
  const context = useContext(HomeContext);
  if (context === undefined) {
    throw new Error("useHomeContext must be used within a HomeProvider");
  }
  return context;
};

import { _trpc } from "@/components/static-trpc";
import { getSessionProfile } from "@/lib/session-store";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";

type HomeContextProps = ReturnType<typeof useCreateJobsContext>;
export const JobsContext = createContext<HomeContextProps>(undefined as any);
export const JobsProvider = JobsContext.Provider;

export interface JobsProps {
  admin?: boolean;
  recent?: boolean;
}
export const useCreateJobsContext = (props: JobsProps) => {
  const profile = getSessionProfile();
  const { data, isPending, isRefetching, refetch } = useQuery(
    _trpc.jobs.getJobs.queryOptions({
      size: props.recent ? 5 : 20,
      userId: props.admin ? undefined : profile.user.id,
    })
  );
  return {
    items: data?.data || [],
    isRefreshing: isRefetching,
    isPending,
    refresh() {
      refetch();
    },
    ...props,
  };
};
export const useJobsContext = () => {
  const context = useContext(JobsContext);
  if (context === undefined) {
    throw new Error("useHomeContext must be used within a HomeProvider");
  }
  return context;
};

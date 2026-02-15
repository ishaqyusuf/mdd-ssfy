import { useInfiniteLoader } from "@/components/infinite-loader";
import { _trpc } from "@/components/static-trpc";
import { getSessionProfile } from "@/lib/session-store";
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
  const {
    data,
    ref: loadMoreRef,
    actions,
    state,
  } = useInfiniteLoader({
    // filter: ,
    route: _trpc?.jobs.getJobs,
    filter: {
      size: props.recent ? 5 : 20,
      userId: props.admin ? undefined : profile?.user?.id,
    },
  });
  // const { data, isPending, isRefetching, refetch } = useQuery(
  //   _trpc.jobs.getJobs.queryOptions({
  //     size: props.recent ? 5 : 20,
  //     userId: props.admin ? undefined : profile.user.id,
  //   })
  // );
  return {
    items: data || [],
    ...props,
    loadMoreRef,
    state,
    actions,
  };
};
export const useJobsContext = () => {
  const context = useContext(JobsContext);
  if (context === undefined) {
    throw new Error("useHomeContext must be used within a HomeProvider");
  }
  return context;
};

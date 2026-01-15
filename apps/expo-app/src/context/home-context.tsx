import { _trpc } from "@/components/static-trpc";
import { getSessionProfile } from "@/lib/session-store";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { JobsContext, JobsProps, useCreateJobsContext } from "./jobs-context";

type HomeContextProps = ReturnType<typeof useCreateHomeContext>;
export const HomeContext = createContext<HomeContextProps>(undefined as any);
export const HomeProvider = ({
  value,
  children,
}: {
  value: HomeContextProps;
  children;
}) => (
  <HomeContext.Provider value={value}>
    <JobsContext value={value.jobsCtx}>{children}</JobsContext>
  </HomeContext.Provider>
);
interface Props {
  jobsProps: JobsProps;
}
export const useCreateHomeContext = (props: Props) => {
  const profile = getSessionProfile();
  const jobsCtx = useCreateJobsContext(props.jobsProps);
  const { data, isPending, isRefetching, refetch } = useQuery(
    _trpc.jobs.getJobs.queryOptions({
      size: 5,
      userId: profile.user.id,
    })
  );
  return {
    // recentJobs: data?.data || [],
    jobsCtx,
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

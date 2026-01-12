import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";

export type JobContextProps = ReturnType<typeof useCreateJobContext>;
export const JobContext = createContext<JobContextProps>(undefined as any);
export const JobProvider = JobContext.Provider as any;
export interface JobOverviewProps {
  jobId;
  adminMode?: boolean;
}
export const useCreateJobContext = (props: JobOverviewProps) => {
  const { jobId } = props;
  const { data, isPending } = useQuery(
    _trpc.jobs.getJobs.queryOptions({
      jobId: Number(jobId),
    })
  );
  const job = data?.data?.[0];
  return {
    isPending,
    job,
    ...props,
  };
};
export const useJobContext = () => {
  const context = useContext(JobContext);
  if (context === undefined) {
    throw new Error("useJobContext must be used within a JobProvider");
  }
  return context;
};

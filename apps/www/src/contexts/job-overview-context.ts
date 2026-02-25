import { useJobParams } from "@/hooks/use-contractor-jobs-params";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";

type JobOverviewContextProps = ReturnType<typeof useCreateJobOverviewContext>;
export const JobOverviewContext = createContext<JobOverviewContextProps>(
    undefined as any,
);
export const JobOverviewProvider = JobOverviewContext.Provider;
export const useCreateJobOverviewContext = () => {
    const { openJobId } = useJobParams();
    const { data: overview, isPending: isLoading } = useSuspenseQuery(
        useTRPC().jobs.overview.queryOptions(
            {
                jobId: openJobId!,
            },
            {
                enabled:
                    !!openJobId &&
                    Number.isSafeInteger(openJobId) &&
                    Number(openJobId) > 0,
            },
        ),
    );
    return {
        overview,
    };
};
export const useJobOverviewContext = () => {
    const context = useContext(JobOverviewContext);
    if (context === undefined) {
        throw new Error(
            "useJobOverviewContext must be used within a JobOverviewProvider",
        );
    }
    return context;
};


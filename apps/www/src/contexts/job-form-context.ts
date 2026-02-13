import { useJobFormParams } from "@/hooks/use-job-form-params";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useState } from "react";

type JobFormContextProps = ReturnType<typeof useCreateJobFormContext>;
export const JobFormContext = createContext<JobFormContextProps>(
    undefined as any,
);
export const JobFormProvider = JobFormContext.Provider;
export const useCreateJobFormContext = () => {
    const { setParams, ...params } = useJobFormParams();
    const {
        data: defaultValues,
        isPending,
        refetch,
        fetchStatus,
        isFetching,
    } = useQuery(
        useTRPC().community.getJobForm.queryOptions(
            {
                unitId: params.unitId,
                taskId: params.taskId > 0 ? params.taskId : undefined,
                jobId: params.jobId,
                userId: params.userId,
                modelId: params.modelId,
            },
            {
                enabled:
                    !!params.unitId &&
                    !!params.taskId &&
                    !!params.userId &&
                    !!params.modelId,
                // enabled: false,
                // refetchOnMount: true,
                // !!params.unitId &&
                // !!params.taskId &&
                // !!params.userId &&
                // !!params.modelId,
            },
        ),
    );
    const [markAsComplete, setMarkAsComplete] = useState(false);
    return {
        defaultValues,
        markAsComplete,
        setMarkAsComplete,
    };
};
export const useJobFormContext = () => {
    const context = useContext(JobFormContext);
    if (context === undefined) {
        throw new Error(
            "useJobFormContext must be used within a JobFormProvider",
        );
    }
    return context;
};


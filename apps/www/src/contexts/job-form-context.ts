import { useJobFormParams } from "@/hooks/use-job-form-params";
import { useJobStepInfo } from "@/hooks/use-job-step-info";
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
	const { formType } = useJobStepInfo();
	const canLoadForm =
		!!params.unitId &&
		!!params.builderTaskId &&
		!!params.modelId &&
		(formType === "submit" || !!params.userId);
	const { data: defaultValues, isPending } = useQuery(
		useTRPC().community.getJobForm.queryOptions(
			{
				unitId: params.unitId,
				builderTaskId:
					params.builderTaskId > 0 ? params.builderTaskId : undefined,
				jobId: params.jobId,
				userId: params.userId,
				modelId: params.modelId,
			},
			{
				enabled: canLoadForm,
			},
		),
	);
	const [markAsComplete, setMarkAsComplete] = useState(false);
	return {
		defaultValues,
		isPending,
		markAsComplete,
		setMarkAsComplete,
	};
};
export const useJobFormContext = () => {
	const context = useContext(JobFormContext);
	if (context === undefined) {
		throw new Error("useJobFormContext must be used within a JobFormProvider");
	}
	return context;
};

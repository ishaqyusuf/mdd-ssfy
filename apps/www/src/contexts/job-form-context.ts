import { useJobFormParams } from "@/hooks/use-job-form-params";
import { useJobRole } from "@/hooks/use-job-role";
import { useJobStepInfo } from "@/hooks/use-job-step-info";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useMemo, useState } from "react";

type JobFormContextProps = ReturnType<typeof useCreateJobFormContext>;
export const JobFormContext = createContext<JobFormContextProps>(
	undefined as any,
);
export const JobFormProvider = JobFormContext.Provider;
export const useCreateJobFormContext = () => {
	const { ...params } = useJobFormParams();
	const { formType } = useJobStepInfo();
	const { isAdmin } = useJobRole();
	const trpc = useTRPC();
	const canLoadForm =
		!!params.unitId &&
		!!params.builderTaskId &&
		!!params.modelId &&
		(formType === "submit" || !!params.userId);
	const { data: defaultValues, isPending } = useQuery(
		trpc.community.getJobForm.queryOptions(
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
	const { data: jobSettings } = useQuery(trpc.settings.getJobSettings.queryOptions());
	const [markAsComplete, setMarkAsComplete] = useState(false);
	const state = useMemo(
		() => ({
			showTaskQty: isAdmin || !!jobSettings?.meta?.showTaskQty,
			allowCustomJobs: isAdmin || !!jobSettings?.meta?.allowCustomJobs,
		}),
		[isAdmin, jobSettings?.meta?.allowCustomJobs, jobSettings?.meta?.showTaskQty],
	);

	return {
		defaultValues,
		isPending,
		jobSettings,
		state,
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

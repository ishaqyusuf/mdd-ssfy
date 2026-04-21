import { useJobFormParams } from "@/hooks/use-job-form-params";
import { useJobRole } from "@/hooks/use-job-role";
import { useJobStepInfo } from "@/hooks/use-job-step-info";
import { useAuth } from "@/hooks/use-auth";
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
	const auth = useAuth();
	const trpc = useTRPC();
	const isDirectCustomJob = params.builderTaskId === -1;
	const canLoadForm =
		(!isDirectCustomJob &&
			!!params.unitId &&
			!!params.builderTaskId &&
			!!params.modelId) &&
		(formType === "submit" || !!params.userId);
	const { data: queriedDefaultValues, isPending } = useQuery(
		trpc.community.getJobForm.queryOptions(
			{
				unitId: params.unitId ?? null,
				builderTaskId:
					params.builderTaskId > 0 ? params.builderTaskId : undefined,
				jobId: params.jobId,
				userId: params.userId,
				modelId: params.modelId ?? null,
			},
			{
				enabled: canLoadForm,
			},
		),
	);
	const { data: jobSettings } = useQuery(trpc.settings.getJobSettings.queryOptions());
	const [markAsComplete, setMarkAsComplete] = useState(formType === "submit");
	const customDefaultValues = useMemo(
		() =>
			isDirectCustomJob
				? {
						unit: undefined,
						user: {
							id: params.userId ?? auth.id ?? undefined,
							name: auth.name ?? undefined,
						},
						builderTaskId: undefined,
						job: {
							tasks: [],
							id: params.jobId ?? undefined,
							amount: 0,
							description: "",
							meta: {
								addonPercent: 0,
								addon: 0,
								additional_cost: null,
							},
							title: "Custom Job",
							subtitle: null,
							adminNote: null,
							isCustom: true,
							status: "Assigned",
						},
				  }
				: undefined,
		[auth.id, auth.name, isDirectCustomJob, params.jobId, params.userId],
	);
	const defaultValues = customDefaultValues ?? queriedDefaultValues;
	const state = useMemo(
		() => ({
			showTaskQty: isAdmin || !!jobSettings?.meta?.showTaskQty,
			allowCustomJobs:
				isAdmin ||
				!!jobSettings?.meta?.allowCustomJobs ||
				!!auth.can?.submitCustomJob,
		}),
		[
			auth.can?.submitCustomJob,
			isAdmin,
			jobSettings?.meta?.allowCustomJobs,
			jobSettings?.meta?.showTaskQty,
		],
	);

	return {
		defaultValues,
		isPending: isDirectCustomJob ? false : isPending,
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

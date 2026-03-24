import { useJobFormContext } from "@/contexts/job-form-context";
import { useJobFormParams } from "@/hooks/use-job-form-params";
import { useJobStepInfo } from "@/hooks/use-job-step-info";
import { useTRPC } from "@/trpc/client";
import type { JobFormSchema } from "@community/schema";
import type { Button } from "@gnd/ui/button";
import { SubmitButton } from "@gnd/ui/submit-button";
import { percentageValue, sum } from "@gnd/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import type React from "react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

interface Props {
	// className?: string;
	submitAsTaskRequest?: boolean;
	form: UseFormReturn<JobFormSchema>;
	Trigger?;
}

export function JobSubmitButton({
	// className,
	submitAsTaskRequest,
	form,
	Trigger,
	...buttonProps
}: Props & Omit<React.ComponentProps<typeof Button>, "form">) {
	const { defaultValues, markAsComplete } = useJobFormContext();
	const { setParams, userId, projectId, unitId, builderTaskId, modelId } =
		useJobFormParams();
	const { formType } = useJobStepInfo();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const isConfigRequestedStatus =
		String(defaultValues?.job?.status || "").toLowerCase() ===
		"config requested";
	const isSubmitMode = formType === "submit";
	const { mutate: saveJob, isPending: isSaving } = useMutation(
		trpc.community.saveJobForm.mutationOptions({
			async onSuccess(data, args) {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.getJobs.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.overview.pathKey(),
					}),
				]);
				setParams(null);
				if (args?.requestTaskConfig) {
					toast.success("Configuration requested and job saved.", {
						description:
							"Admin will review it and notify you when this job is ready.",
					});
				}
			},
			onError(error, variables, onMutateResult, context) {
				console.log("Failed to save job details", {
					error,
					variables,
					onMutateResult,
					context,
				});
			},
			meta: {
				toastTitle: {
					error: "Failed to save job details",
					success: "Job details saved",
					loading: "Saving job details...",
					show: true,
				},
			},
		}),
	);
	return (
		<form
			{...form}
			onSubmit={form.handleSubmit(
				// @ts-ignore
				(values: JobFormSchema) => {
					if (isConfigRequestedStatus) return;
					const normalizedValues = structuredClone(values) as JobFormSchema;
					normalizedValues.user = {
						id:
							normalizedValues.user?.id ??
							userId ??
							defaultValues?.user?.id ??
							null,
					};
					normalizedValues.unit = {
						id: normalizedValues.unit?.id ?? unitId ?? 0,
						projectId: normalizedValues.unit?.projectId ?? projectId ?? 0,
					};
					normalizedValues.builderTaskId =
						normalizedValues.builderTaskId ?? builderTaskId ?? undefined;
					normalizedValues.modelId = normalizedValues.modelId ?? modelId ?? 0;
					const defaultMeta = defaultValues?.job?.meta || {};
					const addonPercent =
						Number(normalizedValues.job?.meta?.addonPercent) ||
						Number(defaultMeta?.addonPercent) ||
						0;
					const projectAddon =
						Number(defaultValues?.unit?.projectAddon || 0) || 0;
					const addon = percentageValue(projectAddon, addonPercent) || 0;
					const isCustom = !!normalizedValues.job?.isCustom;
					const taskTotal = sum(
						(normalizedValues.job?.tasks || []).map(
							(task) => Number(task?.qty || 0) * Number(task?.rate || 0),
						),
					);
					const extraCost = isCustom
						? Number(normalizedValues.job?.meta?.additional_cost || 0) || 0
						: 0;
					normalizedValues.job.meta = {
						...(normalizedValues.job.meta || {}),
						addonPercent,
						addon,
						additional_cost: isCustom ? extraCost : null,
					};
					normalizedValues.job.amount = sum([taskTotal, addon, extraCost]);
					normalizedValues.requestTaskConfig = submitAsTaskRequest;
					if (normalizedValues.requestTaskConfig) {
						normalizedValues.action = "request-task-config";
					} else {
						normalizedValues.action =
							isSubmitMode || markAsComplete ? "submit" : "re-assign";
					}
					saveJob(normalizedValues);
					// Here you would typically call a mutation to save the job details
					// For example: trpc.community.updateJob.mutate(values)
					// setParams({
					//     step: 3, // Move to the next step, e.g., review/confirm
					// });
				},
				(e) => {
					console.log("Form Errors:", e);
					console.log("default values", defaultValues);
				},
			)}
		>
			<SubmitButton
				isSubmitting={isSaving}
				disabled={isConfigRequestedStatus}
				{...buttonProps}
			>
				{Trigger ? (
					Trigger
				) : (
					<div className="flex gap-2 items-center">
						<CheckCircle2 className="size-4" />
						<span>
							{isConfigRequestedStatus
								? "Configuration Requested"
								: isSubmitMode || markAsComplete
									? "Submit"
									: "Assign"}
						</span>
					</div>
				)}
			</SubmitButton>
		</form>
	);
}

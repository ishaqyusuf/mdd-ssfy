import { useJobFormContext } from "@/contexts/job-form-context";
import { useJobStepInfo } from "@/hooks/use-job-step-info";
import { useTRPC } from "@/trpc/client";
import type { JobFormSchema } from "@community/schema";
import type { Button } from "@gnd/ui/button";
import { SubmitButton } from "@gnd/ui/submit-button";
import { useMutation } from "@tanstack/react-query";
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
	const { formType } = useJobStepInfo();
	const isConfigRequestedStatus =
		String(defaultValues?.job?.status || "").toLowerCase() ===
		"config requested";
	const isSubmitMode = formType === "submit";
	const { mutate: saveJob, isPending: isSaving } = useMutation(
		useTRPC().community.saveJobForm.mutationOptions({
			onSuccess(data, args) {
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
					values.requestTaskConfig = submitAsTaskRequest;
					if (values.requestTaskConfig) {
						values.action = "request-task-config";
					} else {
						values.action =
							isSubmitMode || markAsComplete ? "submit" : "re-assign";
					}
					// return;
					saveJob(values);
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

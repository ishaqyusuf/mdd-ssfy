import { useJobFormContext } from "@/contexts/job-form-context";
import { useTRPC } from "@/trpc/client";
import { JobFormSchema } from "@community/schema";
import { Button } from "@gnd/ui/button";
import { SubmitButton } from "@gnd/ui/submit-button";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import React from "react";
import { UseFormReturn } from "react-hook-form";

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
    const { mutate: saveJob, isPending: isSaving } = useMutation(
        useTRPC().community.saveJobForm.mutationOptions({
            onSuccess() {},
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
                    // console.log("Form Submitted with values:", values);
                    // console.log("default values", defaultValues);
                    values.requestTaskConfig = submitAsTaskRequest;
                    if (markAsComplete) values.job.status = "Submitted";
                    if (values.requestTaskConfig)
                        values.job.status = "In Progress";
                    saveJob(values as any);
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
            <SubmitButton isSubmitting={isSaving} {...buttonProps}>
                {Trigger ? (
                    Trigger
                ) : (
                    <div className="flex gap-2 items-center">
                        <CheckCircle2 className="size-4" />
                        <span>{markAsComplete ? "Submit" : "Assign"}</span>
                    </div>
                )}
            </SubmitButton>
        </form>
    );
}


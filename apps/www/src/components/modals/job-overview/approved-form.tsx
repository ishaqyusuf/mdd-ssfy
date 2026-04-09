import { Icons } from "@gnd/ui/icons";
import { useJobOverviewContext } from "@/contexts/job-overview-context";
import { useTRPC } from "@/trpc/client";
import { Card } from "@gnd/ui/namespace";
import { SubmitButton } from "@gnd/ui/submit-button";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import React from "react";

export function ApprovedForm() {
    const ctx = useJobOverviewContext();
    const { overview: job } = ctx;
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const [pendingAction, setPendingAction] = React.useState<
        "cancel" | "reject" | null
    >(null);

    const reviewMutation = useMutation(
        trpc.jobs.jobReview.mutationOptions({
            onSuccess: async (_, variables) => {
                await Promise.all([
                    queryClient.invalidateQueries({
                        queryKey: trpc.jobs.overview.queryKey({
                            jobId: job.id,
                        }),
                    }),
                    queryClient.invalidateQueries({
                        queryKey: trpc.jobs.getJobs.pathKey(),
                    }),
                ]);
                toast({
                    title:
                        variables.note === "Approval cancelled by reviewer."
                            ? "Approval cancelled"
                            : "Job rejected",
                    variant: "success",
                });
            },
            onError: () => {
                toast({
                    title: "Unable to update job review.",
                    variant: "destructive",
                });
            },
            onSettled: () => {
                setPendingAction(null);
            },
        }),
    );

    const handleCancelApproval = () => {
        setPendingAction("cancel");
        reviewMutation.mutate({
            action: "reject",
            jobId: job.id,
            note: "Approval cancelled by reviewer.",
        });
    };

    const handleReject = () => {
        setPendingAction("reject");
        reviewMutation.mutate({
            action: "reject",
            jobId: job.id,
            note: "Job rejected after approval review.",
        });
    };

    if (job.status !== "Approved") return null;

    return (
        <Card className="animate-in slide-in-from-top-2">
            <Card.Header className="flex flex-row items-start gap-4">
                <div className="shrink-0 rounded-lg bg-muted p-2 text-primary">
                    <Icons.CheckCircle2 className="h-6 w-6" />
                </div>

                <div className="space-y-1">
                    <Card.Title className="text-lg">Job Approved</Card.Title>
                    <Card.Description>
                        This job has been approved for payment. You can revert
                        this approval or reject the job entirely if new
                        discrepancies are found.
                    </Card.Description>
                </div>
            </Card.Header>

            <Card.Content>
                <div className="flex gap-3">
                    <SubmitButton
                        variant="outline"
                        onClick={handleCancelApproval}
                        className="flex-1"
                        isSubmitting={pendingAction === "cancel"}
                    >
                        <div className="flex gap-1 items-center">
                            <Icons.RotateCcw className="mr-2 h-4 w-4" />
                            Cancel Approval
                        </div>
                    </SubmitButton>

                    <SubmitButton
                        variant="destructive"
                        onClick={handleReject}
                        className="flex-1"
                        isSubmitting={pendingAction === "reject"}
                    >
                        <div className="flex gap-1 items-center">
                            <Icons.Ban className="mr-2 h-4 w-4" />
                            Reject Job
                        </div>
                    </SubmitButton>
                </div>
            </Card.Content>
        </Card>
    );
}

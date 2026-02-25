import { useJobOverviewContext } from "@/contexts/job-overview-context";
import { Card } from "@gnd/ui/namespace";
import { SubmitButton } from "@gnd/ui/submit-button";
import { ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import React from "react";

export function ApprovalForm() {
    const ctx = useJobOverviewContext();
    const { overview: job } = ctx;
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const [actionNote, setActionNote] = React.useState("");
    const [pendingAction, setPendingAction] = React.useState<
        "approve" | "reject" | null
    >(null);
    const reviewMutation = useMutation(
        trpc.jobs.jobReview.mutationOptions({
            onSuccess: async (_, variables) => {
                if (!variables) return;
                queryClient.invalidateQueries({
                    queryKey: trpc.jobs.overview.queryKey({
                        jobId: job.id,
                    }),
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.jobs.getJobs.pathKey(),
                });
                toast({
                    title:
                        variables.action === "approve"
                            ? "Job approved"
                            : "Job rejected",
                    variant: "success",
                });
                if (variables.action === "reject") {
                    setActionNote("");
                }
            },
            onError: () => {
                toast({
                    title: "Failed to submit review. Please try again.",
                    variant: "destructive",
                });
            },
            onSettled: () => {
                setPendingAction(null);
            },
        }),
    );

    const handleApprove = () => {
        setPendingAction("approve");
        reviewMutation.mutate({
            action: "approve",
            jobId: job.id,
            note: actionNote || undefined,
        });
    };
    const handleReject = () => {
        if (!actionNote.trim()) return;
        setPendingAction("reject");
        reviewMutation.mutate({
            action: "reject",
            jobId: job.id,
            note: actionNote.trim(),
        });
    };

    if (job.status !== "Submitted") return null;

    return (
        <Card className="animate-in slide-in-from-top-2">
            <Card.Header className="flex flex-row items-start gap-4">
                <div className="rounded-lg bg-muted p-2 text-primary">
                    <ShieldAlert className="h-6 w-6" />
                </div>

                <div className="space-y-1">
                    <Card.Title className="text-lg">
                        Approval Required
                    </Card.Title>
                    <Card.Description>
                        This job has been submitted by the contractor and is
                        awaiting your review.
                    </Card.Description>
                </div>
            </Card.Header>

            <Card.Content className="space-y-4">
                <Textarea
                    placeholder="Add a note for the contractor (required for rejection)..."
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    className="min-h-[80px]"
                />

                <div className="flex gap-3">
                    <SubmitButton
                        onClick={handleApprove}
                        className=""
                        isSubmitting={pendingAction === "approve"}
                    >
                        <div className="flex gap-1 items-center">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Approve Payment
                        </div>
                    </SubmitButton>

                    <SubmitButton
                        variant="destructive"
                        onClick={handleReject}
                        disabled={!actionNote.trim()}
                        isSubmitting={pendingAction === "reject"}
                    >
                        <div className="flex gap-1 items-center">
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject & Return
                        </div>
                    </SubmitButton>
                </div>
            </Card.Content>
        </Card>
    );
}


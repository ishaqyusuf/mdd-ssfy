import { useJobOverviewContext } from "@/contexts/job-overview-context";
import { useTRPC } from "@/trpc/client";
import { Card } from "@gnd/ui/namespace";
import { SubmitButton } from "@gnd/ui/submit-button";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import React from "react";
import { XCircle, CheckCircle2, Ban } from "lucide-react";

export function RejectedForm() {
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
                        variables.action === "approve"
                            ? "Job approved"
                            : "Rejection updated",
                    variant: "success",
                });
                if (variables.action === "reject") {
                    setActionNote("");
                }
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

    if (job.status !== "Rejected") return null;

    return (
        <Card className="animate-in slide-in-from-top-2">
            <Card.Header className="flex flex-row items-start gap-4">
                <div className="rounded-lg bg-muted p-2 text-primary">
                    <XCircle className="h-6 w-6" />
                </div>

                <div className="space-y-1">
                    <Card.Title className="text-lg">Job Rejected</Card.Title>
                    <Card.Description>
                        This job was rejected and returned to the contractor.
                        You can approve it now or keep it rejected with an
                        updated note.
                    </Card.Description>
                </div>
            </Card.Header>

            <Card.Content className="space-y-4">
                <Textarea
                    placeholder="Add/update rejection note..."
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    className="min-h-[80px]"
                />

                <div className="flex gap-3">
                    <SubmitButton
                        onClick={handleApprove}
                        isSubmitting={pendingAction === "approve"}
                    >
                        <div className="flex gap-1 items-center">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Approve Job
                        </div>
                    </SubmitButton>

                    <SubmitButton
                        variant="destructive"
                        onClick={handleReject}
                        disabled={!actionNote.trim()}
                        isSubmitting={pendingAction === "reject"}
                    >
                        <div className="flex gap-1 items-center">
                            <Ban className="mr-2 h-4 w-4" />
                            Keep Rejected
                        </div>
                    </SubmitButton>
                </div>
            </Card.Content>
        </Card>
    );
}

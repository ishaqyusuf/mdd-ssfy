import { useJobOverviewContext } from "@/contexts/job-overview-context";
import { Card } from "@gnd/ui/namespace";
import { SubmitButton } from "@gnd/ui/submit-button";
import { ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { Textarea } from "@gnd/ui/textarea";
import React from "react";
export function ApprovalForm() {
    const ctx = useJobOverviewContext();
    const { overview: job } = ctx;
    const handleApprove = () => {};
    const handleReject = () => {};
    const {} = useMutation(
        useTRPC().jobs.jobReview.mutationOptions({
            onSuccess() {},
            onError() {
                // toast.error("Failed to submit review. Please try again.");
            },
        }),
    );
    const [actionNote, setActionNote] = React.useState("");
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
                    <SubmitButton onClick={handleApprove} className="">
                        <div className="flex gap-1 items-center">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Approve Payment
                        </div>
                    </SubmitButton>

                    <SubmitButton
                        variant="destructive"
                        onClick={handleReject}
                        disabled={!actionNote}
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


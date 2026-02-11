import { useJobOverviewContext } from "@/contexts/job-overview-context";
import { useTRPC } from "@/trpc/client";
import { Card } from "@gnd/ui/composite";
import { SubmitButton } from "@gnd/ui/submit-button";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import React from "react";
import { CheckCircle2, RotateCcw, Ban } from "lucide-react";

export function ApprovedForm() {
    const ctx = useJobOverviewContext();
    const { overview: job } = ctx;
    const handleCancelApproval = () => {};
    const handleReject = () => {};
    return (
        <Card className="animate-in slide-in-from-top-2">
            <Card.Header className="flex flex-row items-start gap-4">
                <div className="shrink-0 rounded-lg bg-muted p-2 text-primary">
                    <CheckCircle2 className="h-6 w-6" />
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
                    >
                        <div className="flex gap-1 items-center">
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Cancel Approval
                        </div>
                    </SubmitButton>

                    <SubmitButton
                        variant="destructive"
                        onClick={handleReject}
                        className="flex-1"
                    >
                        <div className="flex gap-1 items-center">
                            <Ban className="mr-2 h-4 w-4" />
                            Reject Job
                        </div>
                    </SubmitButton>
                </div>
            </Card.Content>
        </Card>
    );
}


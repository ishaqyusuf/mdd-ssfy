import { useJobOverviewContext } from "@/contexts/job-overview-context";
import { useTRPC } from "@/trpc/client";
import { Card } from "@gnd/ui/namespace";
import { SubmitButton } from "@gnd/ui/submit-button";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import React from "react";
import { CircleDollarSign, XCircle } from "lucide-react";

export function PaidForm() {
    const ctx = useJobOverviewContext();
    const { overview: job } = ctx;
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const [reason, setReason] = React.useState("");

    const cancelPayment = useMutation(
        trpc.jobs.cancelPayment.mutationOptions({
            onSuccess: async () => {
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
                    title: "Payment cancelled",
                    variant: "success",
                });
                setReason("");
            },
            onError: (error) => {
                toast({
                    title: error.message || "Unable to cancel payment.",
                    variant: "destructive",
                });
            },
        }),
    );

    const handleCancelPayment = () => {
        cancelPayment.mutate({
            jobId: job.id,
            note: reason.trim() || undefined,
        });
    };

    if (job.status !== "Paid") return null;

    return (
        <Card className="animate-in slide-in-from-top-2">
            <Card.Header className="flex flex-row items-start gap-4">
                <div className="rounded-lg bg-muted p-2 text-primary">
                    <CircleDollarSign className="h-6 w-6" />
                </div>

                <div className="space-y-1">
                    <Card.Title className="text-lg">Job Paid</Card.Title>
                    <Card.Description>
                        This job has been paid. You can cancel this payment if
                        it was created in error.
                    </Card.Description>
                </div>
            </Card.Header>

            <Card.Content className="space-y-4">
                <Textarea
                    placeholder="Optional reason for payment cancellation..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="min-h-[80px]"
                />

                <div className="flex gap-3">
                    <SubmitButton
                        variant="destructive"
                        onClick={handleCancelPayment}
                        isSubmitting={cancelPayment.isPending}
                    >
                        <div className="flex gap-1 items-center">
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel Payment
                        </div>
                    </SubmitButton>
                </div>
            </Card.Content>
        </Card>
    );
}

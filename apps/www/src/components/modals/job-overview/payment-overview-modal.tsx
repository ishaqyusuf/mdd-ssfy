import { useTRPC } from "@/trpc/client";
import { formatDate } from "@gnd/utils/dayjs";
import { useQuery } from "@gnd/ui/tanstack";
import { CustomModal } from "../custom-modal";
import { Card } from "@gnd/ui/namespace";
import { Progress } from "@gnd/ui/custom/progress";

interface PaymentOverviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    paymentId: number | null;
}

const formatCurrency = (value?: number | null) =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(Number(value || 0));

export function PaymentOverviewModal(props: PaymentOverviewModalProps) {
    const { open, onOpenChange, paymentId } = props;
    const trpc = useTRPC();
    const { data, isPending, error } = useQuery(
        trpc.jobs.paymentOverview.queryOptions(
            {
                paymentId: paymentId || 0,
            },
            {
                enabled: open && !!paymentId,
            },
        ),
    );

    return (
        <CustomModal
            open={open}
            onOpenChange={onOpenChange}
            size="4xl"
            title={paymentId ? `Payment Batch #${paymentId}` : "Payment Batch"}
            description={
                paymentId
                    ? "Overview of payment details and all jobs in this batch."
                    : "No payment batch found for this job."
            }
        >
            <CustomModal.Content className="relative -mx-0 max-h-[70vh]">
                {!paymentId && (
                    <div className="p-2 text-sm text-muted-foreground">
                        This job is not currently linked to a payment batch.
                    </div>
                )}

                {paymentId && isPending && (
                    <div className="p-2 text-sm text-muted-foreground">
                        Loading payment details...
                    </div>
                )}

                {paymentId && error && (
                    <div className="p-2 text-sm text-destructive">
                        Unable to load payment details.
                    </div>
                )}

                {paymentId && data && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <Card>
                                <Card.Header>
                                    <Card.Title className="text-base">
                                        Payment Summary
                                    </Card.Title>
                                </Card.Header>
                                <Card.Content className="space-y-1 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">
                                            Amount
                                        </span>
                                        <span className="font-medium">
                                            {formatCurrency(data.amount)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">
                                            Subtotal
                                        </span>
                                        <span className="font-medium">
                                            {formatCurrency(data.subTotal)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">
                                            Charges
                                        </span>
                                        <span className="font-medium">
                                            {formatCurrency(data.charges)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">
                                            Method
                                        </span>
                                        <span className="font-medium">
                                            {data.paymentMethod || "N/A"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">
                                            Check No
                                        </span>
                                        <span className="font-medium">
                                            {data.checkNo || "N/A"}
                                        </span>
                                    </div>
                                </Card.Content>
                            </Card>

                            <Card>
                                <Card.Header>
                                    <Card.Title className="text-base">
                                        Participants
                                    </Card.Title>
                                </Card.Header>
                                <Card.Content className="space-y-1 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">
                                            Assigned To
                                        </span>
                                        <span className="font-medium">
                                            {data.user?.name || "N/A"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">
                                            Paid By
                                        </span>
                                        <span className="font-medium">
                                            {data.payer?.name || "N/A"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">
                                            Created
                                        </span>
                                        <span className="font-medium">
                                            {data.createdAt
                                                ? formatDate(data.createdAt)
                                                : "N/A"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">
                                            Jobs in Batch
                                        </span>
                                        <span className="font-medium">
                                            {data.jobs.length}
                                        </span>
                                    </div>
                                </Card.Content>
                            </Card>
                        </div>

                        <Card>
                            <Card.Header>
                                <Card.Title className="text-base">
                                    Batch Jobs
                                </Card.Title>
                            </Card.Header>
                            <Card.Content>
                                <div className="space-y-2">
                                    {data.jobs.map((job) => (
                                        <div
                                            key={job.id}
                                            className="rounded-lg border border-border px-3 py-2"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <p className="font-medium text-sm">
                                                        {job.title}
                                                        {job.subtitle
                                                            ? ` - ${job.subtitle}`
                                                            : ""}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Job #{job.id} •{" "}
                                                        {job.user?.name || "Unassigned"}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold">
                                                        {formatCurrency(
                                                            job.amount,
                                                        )}
                                                    </span>
                                                    <Progress.Status noDot badge>
                                                        {job.status}
                                                    </Progress.Status>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card.Content>
                        </Card>
                    </div>
                )}
            </CustomModal.Content>
        </CustomModal>
    );
}

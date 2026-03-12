import { useJobParams } from "@/hooks/use-contractor-jobs-params";
import { CustomModal } from "../custom-modal";
import { Skeleton } from "@gnd/ui/skeleton";
import {
    JobOverviewProvider,
    useCreateJobOverviewContext,
} from "@/contexts/job-overview-context";
import { Suspense } from "react";
import { Progress } from "@gnd/ui/custom/progress";
import { formatDate } from "@gnd/utils/dayjs";
import { ApprovalForm } from "./approval-form";
import { ApprovedForm } from "./approved-form";
import { RejectedForm } from "./rejected-form";
import { Building2, CreditCard, MapPin, MessageSquare } from "lucide-react";
import { Card } from "@gnd/ui/namespace";
import { JobScope } from "./job-scope";
import { FinancialSummary } from "./financial-summary";
import { Avatar } from "@/components/avatar";
import { JobActivities } from "./job-activities";
import { Button } from "@gnd/ui/button";
import { PaymentOverviewModal } from "./payment-overview-modal";
import React from "react";
import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { usePathname } from "next/navigation";

export function JobOverviewModal() {
    const { setParams, openJobId, opened } = useJobParams();

    return (
        <CustomModal
            className=""
            open={opened}
            onOpenChange={(open) => {
                if (!open) {
                    setParams({ openJobId: null });
                }
            }}
            // title="..."
            title={<span></span>}
            description={<span></span>}
            titleAsChild
            descriptionAsChild
            // title={`Job #${openJobId} Overview`}
            // description={`Details and information about Job #${openJobId}.`}
            size={"5xl"}
        >
            <CustomModal.Content className="max-h-[75vh] min-h-[75vh]  relative -mx-0">
                <Suspense fallback={<LoadingSkeleton />}>
                    <Content />
                </Suspense>
            </CustomModal.Content>
        </CustomModal>
    );
}
function Content() {
    const ctx = useCreateJobOverviewContext();
    const job = ctx.overview!;
    const pathname = usePathname();
    const { setParams: setCommunityInstallCostParams } =
        useCommunityInstallCostParams();
    const [isPaymentOverviewOpen, setIsPaymentOverviewOpen] =
        React.useState(false);
    const normalizedStatus = String(job?.status || "")
        .toLowerCase()
        .replace(/[_\s]+/g, "-");
    const isPaymentCancelled =
        normalizedStatus === "payment-cancelled" ||
        normalizedStatus === "payment-canceled";
    const canConfigure =
        !!job?.hasConfigRequested &&
        Number(job?.home?.communityTemplateId || 0) > 0 &&
        Number(job?.builderTaskId || 0) > 0;
    return (
        <JobOverviewProvider value={ctx}>
            <CustomModal.Title>
                <div className="flex gap-4 items-center">
                    <span>
                        {job?.title} - {job?.subtitle}
                    </span>
                    {isPaymentCancelled ? (
                        <>
                            <Progress.Status noDot badge>
                                Approved
                            </Progress.Status>
                            <Progress.Status noDot badge>
                                Payment Cancelled
                            </Progress.Status>
                        </>
                    ) : (
                        <Progress.Status noDot badge>
                            {job?.status}
                        </Progress.Status>
                    )}
                </div>
            </CustomModal.Title>
            <CustomModal.Description>
                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span className="font-mono">{job.jobId}</span>
                    <span>•</span>
                    <span>Created {formatDate(job.createdAt)}</span>
                </p>
            </CustomModal.Description>
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT COLUMN: Details & Tasks */}
                    <div className="lg:col-span-2 space-y-6">
                        {job?.status === "Submitted" && <ApprovalForm />}
                        {job?.status === "Approved" && <ApprovedForm />}
                        {job?.status === "Rejected" && <RejectedForm />}
                        {canConfigure && (
                            <Card>
                                <Card.Content className="p-5">
                                    <Button
                                        className="w-full"
                                        onClick={() => {
                                            const useSidebarView =
                                                pathname.includes(
                                                    "/community/community-template/",
                                                );
                                            setCommunityInstallCostParams({
                                                mode: "v2",
                                                view: useSidebarView
                                                    ? "template-edit"
                                                    : "template-list",
                                                editCommunityModelInstallCostId:
                                                    Number(
                                                        job?.home
                                                            ?.communityTemplateId,
                                                    ),
                                                selectedBuilderTaskId: Number(
                                                    job?.builderTaskId,
                                                ),
                                                requestBuilderTaskId: Number(
                                                    job?.builderTaskId,
                                                ),
                                                jobId: Number(job?.id),
                                                contractorId: Number(
                                                    job?.user?.id,
                                                ),
                                            });
                                        }}
                                    >
                                        Configure
                                    </Button>
                                </Card.Content>
                            </Card>
                        )}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Card>
                                <Card.Header>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Building2 className="h-4 w-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">
                                            Project & Builder
                                        </span>
                                    </div>
                                </Card.Header>
                                <Card.Content className="flex flex-col gap-3">
                                    <div>
                                        <p className="font-bold text-foreground">
                                            {job?.project?.title}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {job?.project?.builder?.name}
                                        </p>
                                    </div>
                                </Card.Content>
                            </Card>

                            <Card>
                                <Card.Header>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <MapPin className="h-4 w-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">
                                            Location
                                        </span>
                                    </div>
                                </Card.Header>
                                <Card.Content className="flex flex-col gap-3">
                                    <div>
                                        <p className="font-bold text-foreground">
                                            {job?.home?.modelName}
                                        </p>
                                        <p className="truncate text-sm text-muted-foreground">
                                            {job.home?.lotBlock}
                                        </p>
                                    </div>
                                </Card.Content>
                            </Card>
                        </div>
                        <JobScope />
                    </div>
                    {/* RIGHT COLUMN: Financials & History */}
                    <div className="space-y-6">
                        <FinancialSummary />
                        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <CreditCard className="h-4 w-4" />
                                <h4 className="text-xs font-bold uppercase tracking-wider">
                                    Payment Information
                                </h4>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">
                                    Batch Payment ID
                                </p>
                                <p className="font-bold text-foreground">
                                    {job.payment?.id
                                        ? `#${job.payment.id}`
                                        : "Not in a payment batch"}
                                </p>
                            </div>
                            {job.payment?.id && (
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">
                                        Batch Amount
                                    </p>
                                    <p className="font-bold text-foreground">
                                        $
                                        {Number(
                                            job.payment.amount || 0,
                                        ).toFixed(2)}
                                    </p>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Job payments are processed in batches. Click to
                                view all jobs in this payment.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => setIsPaymentOverviewOpen(true)}
                                disabled={!job.payment?.id}
                                className="w-full"
                            >
                                View Payment
                            </Button>
                        </div>
                        {/* Assigned To */}
                        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
                                Assigned Contractor
                            </h4>
                            <div className="flex items-center gap-3">
                                <Avatar name={job?.user?.name} />
                                <div>
                                    <p className="font-bold text-foreground text-sm">
                                        {job?.user?.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Contractor
                                    </p>
                                </div>
                                <button className="ml-auto p-2 hover:bg-muted rounded-full text-muted-foreground">
                                    <MessageSquare size={18} />
                                </button>
                            </div>
                        </div>
                        <JobActivities />
                    </div>
                </div>
            </div>
            <PaymentOverviewModal
                open={isPaymentOverviewOpen}
                onOpenChange={setIsPaymentOverviewOpen}
                paymentId={job.payment?.id ?? null}
            />
        </JobOverviewProvider>
    );
}
function LoadingSkeleton() {
    return (
        <>
            <div className="flex flex-col h-full bg-background overflow-hidden">
                <header className="px-6 py-4 border-b border-border bg-card flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-20" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Skeleton className="h-32 rounded-xl" />
                            <div className="grid grid-cols-2 gap-4">
                                <Skeleton className="h-24 rounded-xl" />
                                <Skeleton className="h-24 rounded-xl" />
                            </div>
                            <Skeleton className="h-64 rounded-xl" />
                        </div>
                        <div className="space-y-6">
                            <Skeleton className="h-48 rounded-xl" />
                            <Skeleton className="h-24 rounded-xl" />
                            <Skeleton className="h-64 rounded-xl" />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}


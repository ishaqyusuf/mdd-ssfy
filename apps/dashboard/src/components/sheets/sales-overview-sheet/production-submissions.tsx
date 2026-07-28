import { deleteSalesAssignmentSubmissionAction } from "@/actions/delete-sales-assignment-submission";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { formatDate } from "@/lib/use-day";
import { useAction } from "next-safe-action/hooks";

import { useAssignmentRow } from "./production-assignment-row";
import { useProductionItem } from "./production-tab";
import { QtyStatus } from "./qty-label";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

export function ProductionSubmissions({}) {
    const ctx = useAssignmentRow();
    const item = useProductionItem();
    const query = useSalesOverviewQuery();
    const { assignment } = ctx;

    const deleteSubmission = useAction(deleteSalesAssignmentSubmissionAction, {
        onSuccess(args) {
            toast.success("Deleted");
            item.queryCtx.salesQuery.assignmentSubmissionUpdated();
        },
        onError() {
            toast.error("Unable to complete");
        },
    });
    const toast = useLoadingToast();
    if (!assignment?.submissions?.length)
        return (
            <p className="py-1 text-center text-xs text-muted-foreground">
                No submissions yet
            </p>
        );
    return (
        <div className="space-y-2">
            {assignment.submissions.map((submission) => (
                <div
                    key={submission.id}
                    className="rounded-md border border-border bg-zinc-50 p-2 text-xs"
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center">
                                <p className="font-medium">
                                    {submission.submittedBy ||
                                        assignment.assignedTo}
                                </p>
                                <p className="ml-2 text-muted-foreground">
                                    {submission.submitDate
                                        ? formatDate(submission.submitDate)
                                        : "No date"}
                                </p>
                            </div>
                            <div className="mt-1 flex gap-2">
                                <QtyStatus
                                    as="badge"
                                    qty={submission.qty}
                                    label="qty"
                                />

                                <QtyStatus
                                    as="badge"
                                    qty={submission.qty}
                                    label="rh"
                                />

                                <QtyStatus
                                    as="badge"
                                    qty={submission.qty}
                                    label="lh"
                                />
                            </div>
                        </div>
                        <ConfirmBtn
                            disabled={
                                deleteSubmission.isExecuting ||
                                query.dispatchMode
                            }
                            onClick={(e) => {
                                if (submission.delivered) {
                                    toast.error("Cannot perform action", {
                                        description:
                                            "Submission cannot be delivered as it contains already shipped items.",
                                    });
                                    return;
                                }
                                toast.display({
                                    description: "Deleting...",
                                    duration: Number.POSITIVE_INFINITY,
                                });
                                deleteSubmission.execute({
                                    // assignmentId: assignment.id,
                                    salesId: item.item.salesId,
                                    submissionId: submission.id,
                                    itemUid: item.item.controlUid,
                                });
                            }}
                            trash
                            size="icon"
                        />
                    </div>
                    {submission.note && (
                        <p className="mt-1">{submission.note}</p>
                    )}
                </div>
            ))}
        </div>
    );
}

import { deleteSalesAssignmentSubmissionAction } from "@/actions/delete-sales-assignment-submission";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { getSalesOverviewDocumentStatus } from "@/components/sales-overview-system/lib/document-status";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { formatDate } from "@/lib/use-day";
import { cn } from "@/lib/utils";
import { useAction } from "next-safe-action/hooks";

import { useSaleOverview } from "./context";
import { useAssignmentRow } from "./production-assignment-row";
import { getProductionSubmissionDeleteRestriction } from "./production-delete-policy";
import { ProductionDeletionLockNotice } from "./production-deletion-lock-notice";
import { useProductionItem } from "./production-item-context";
import { QtyStatus } from "./qty-label";

export function ProductionSubmissions({
	presentation = "list",
}: {
	presentation?: "list" | "ledger";
}) {
	const ctx = useAssignmentRow();
	const item = useProductionItem();
	const query = useSalesOverviewQuery();
	const saleOverview = useSaleOverview();
	const { assignment } = ctx;
	const orderFulfilled =
		getSalesOverviewDocumentStatus(saleOverview.data).status === "fulfilled";

	const deleteSubmission = useAction(deleteSalesAssignmentSubmissionAction, {
		onSuccess(args) {
			toast.success("Deleted");
			ctx.refreshAssignments();
			item.queryCtx.salesQuery.assignmentSubmissionUpdated();
		},
		onError() {
			toast.error("Unable to complete");
		},
	});
	const toast = useLoadingToast();
	if (!assignment?.submissions?.length) {
		if (presentation === "ledger") return null;

		return (
			<p className="py-1 text-center text-xs text-muted-foreground">
				No submissions yet. Production can be submitted from this assignment.
			</p>
		);
	}

	return (
		<div className="flex flex-col">
			{assignment.submissions.map((submission) => {
				const deletionRestriction = getProductionSubmissionDeleteRestriction({
					deliveredQuantity: Number(submission.delivered || 0),
					dispatchMode: Boolean(query.dispatchMode),
				});

				return (
					<div
						key={submission.id}
						className="border-border border-b py-3 text-xs last:border-b-0"
					>
						{deletionRestriction && !orderFulfilled ? (
							<ProductionDeletionLockNotice>
								{deletionRestriction}
							</ProductionDeletionLockNotice>
						) : null}
						<div
							className={cn(
								"mt-3",
								!deletionRestriction && "mt-0",
								presentation === "ledger" &&
									"grid gap-3 md:grid-cols-[minmax(7.5rem,1.1fr)_minmax(5rem,0.65fr)_minmax(7rem,1fr)_auto] md:items-center md:pr-8",
							)}
						>
							<div className="min-w-0">
								<p className="font-medium">
									{submission.submittedBy || assignment.assignedTo}
								</p>
								<p className="mt-1 text-muted-foreground">
									{submission.submitDate
										? formatDate(submission.submitDate)
										: "No date"}
								</p>
							</div>
							<div className="flex flex-wrap gap-2">
								<QtyStatus as="badge" qty={submission.qty} label="qty" />
								<QtyStatus as="badge" qty={submission.qty} label="rh" />
								<QtyStatus as="badge" qty={submission.qty} label="lh" />
							</div>
							<p
								className={cn(
									"text-muted-foreground",
									!submission.note && "italic",
								)}
							>
								{submission.note || "No evidence note"}
							</p>
							<div className="flex items-center justify-between gap-2 md:justify-end">
								<ConfirmBtn
									disabled={
										deleteSubmission.isExecuting || Boolean(deletionRestriction)
									}
									onClick={() => {
										toast.display({
											description: "Deleting...",
											duration: Number.POSITIVE_INFINITY,
										});
										deleteSubmission.execute({
											salesId: item.item.salesId,
											submissionId: submission.id,
											itemUid: item.item.controlUid,
										});
									}}
									aria-label={`Delete submission by ${submission.submittedBy || assignment.assignedTo}`}
									title={deletionRestriction || "Delete submission"}
									trash
									size="icon"
									className="size-8 shrink-0"
								/>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}

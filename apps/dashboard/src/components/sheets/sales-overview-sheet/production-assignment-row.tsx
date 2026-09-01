import { deleteSalesAssignmentAction } from "@/actions/delete-sales-assignment";
import { updateAssignmentDueDateUseCase } from "@/app-deps/(clean-code)/(sales)/_common/use-case/sales-prod.use-case";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { DatePicker } from "@/components/_v1/date-range-picker";
import { getSalesOverviewDocumentStatus } from "@/components/sales-overview-system/lib/document-status";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { formatDate } from "@/lib/use-day";
import { cn } from "@/lib/utils";
import createContextFactory from "@/utils/context-factory";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

import { getProductionDispatchMutationPolicy } from "@gnd/sales/production-dispatch-policy";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@gnd/ui/accordion";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Icons } from "@gnd/ui/icons";
import { Separator } from "@gnd/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";
import {
	createProductionDueDate,
	productionCalendarPartsFromLocalDate,
} from "@sales/production-date";

import { AccessBased } from "./access-based";
import { useSaleOverview } from "./context";
import { useProductionAssignments } from "./production-assignments";
import { getProductionAssignmentDeleteRestriction } from "./production-delete-policy";
import { ProductionDeletionLockNotice } from "./production-deletion-lock-notice";
import { useProductionItem } from "./production-item-context";
import { ProductionSubmissions } from "./production-submissions";
import { ProductionSubmitForm } from "./production-submit-form";
import { getQuantityMatrixTotal } from "./production/v2/production-item-status";
import { hasPendingProductionQuantity } from "./production/v2/production-submission-selection";
import { QtyStatus } from "./qty-label";

const {
	useContext: useAssignmentRow,
	Provider: ProductionAssignmentRowProvider,
} = createContextFactory((index: number) => {
	const ctx = useProductionAssignments();
	const assignment = ctx?.data?.assignments[index];
	const [openSubmitForm, setOpenSubmitForm] = useState(false);

	return {
		assignment,
		pendingSubmissions: assignment?.pending?.qty,
		openSubmitForm,
		setOpenSubmitForm,
		refreshAssignments: ctx.refreshAssignments,
	};
});
export { ProductionAssignmentRowProvider, useAssignmentRow };
export function ProductionAssignmentRow({
	index,
	view = "assignments",
	showCreateAction = true,
	showRecordHeading = true,
	presentation = "card",
}: {
	index: number;
	view?: "assignments" | "submissions";
	showCreateAction?: boolean;
	showRecordHeading?: boolean;
	presentation?: "card" | "document";
}) {
	return (
		<ProductionAssignmentRowProvider args={[index]}>
			<Content
				view={view}
				showCreateAction={showCreateAction}
				showRecordHeading={showRecordHeading}
				presentation={presentation}
			/>
		</ProductionAssignmentRowProvider>
	);
}
function Content({
	view,
	showCreateAction,
	showRecordHeading,
	presentation,
}: {
	view: "assignments" | "submissions";
	showCreateAction: boolean;
	showRecordHeading: boolean;
	presentation: "card" | "document";
}) {
	const ctx = useAssignmentRow();
	const { assignment } = ctx;
	const queryCtx = useSalesOverviewQuery();
	const itemCtx = useProductionItem();
	const saleOverview = useSaleOverview();
	const deleteAction = useAction(deleteSalesAssignmentAction, {
		onSuccess() {
			toast.success("Deleted");
			ctx.refreshAssignments();
			queryCtx.salesQuery.assignmentUpdated();
		},
		onError() {
			toast.error("Unable to complete");
		},
	});
	const toast = useLoadingToast();
	const [date, setDate] = useState(assignment.dueDate);
	async function changeDueDate(e: Date | undefined) {
		if (!e) return;
		setDate(e);
		toast.loading("Updating....");
		const normalizedDueDate = createProductionDueDate(
			productionCalendarPartsFromLocalDate(e),
		);
		updateAssignmentDueDateUseCase(assignment.id, normalizedDueDate).then(
			() => {
				toast.success("Updated");
			},
		);
	}
	const hasPendingSubmissionQuantity = hasPendingProductionQuantity(
		assignment?.pending,
	);
	const mutationPolicy = getProductionDispatchMutationPolicy({
		dispatchMode: Boolean(queryCtx.dispatchMode),
		hasPendingAssignmentQuantity: false,
		hasPendingSubmissionQuantity,
	});
	const orderFulfilled =
		getSalesOverviewDocumentStatus(saleOverview.data).status === "fulfilled";
	const assignmentDeletionRestriction =
		getProductionAssignmentDeleteRestriction({
			orderFulfilled,
			dispatchMode: Boolean(queryCtx.dispatchMode),
		});
	if (view === "submissions") {
		const submittedQty = Number(assignment?.reported?.qty || 0);
		const assignedQty = Number(assignment?.qty?.qty || 0);
		return (
			<Collapsible open={ctx.openSubmitForm}>
				<div className="flex flex-col gap-4">
					{showRecordHeading ? (
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p className="text-sm font-medium">My submissions</p>
								<p className="text-xs text-muted-foreground">
									{submittedQty}/{assignedQty} submitted
								</p>
							</div>
							{showCreateAction ? (
								<Button
									type="button"
									size="sm"
									variant={ctx.openSubmitForm ? "outline" : "default"}
									disabled={!mutationPolicy.canSubmitExistingAssignment}
									onClick={() => ctx.setOpenSubmitForm(!ctx.openSubmitForm)}
								>
									{ctx.openSubmitForm ? "Cancel" : "Add submission"}
								</Button>
							) : null}
						</div>
					) : null}
					{showCreateAction ? (
						<CollapsibleContent>
							<ProductionSubmitForm />
						</CollapsibleContent>
					) : null}
					<ProductionSubmissions presentation="ledger" />
				</div>
			</Collapsible>
		);
	}
	if (presentation === "document") {
		const submittedQuantity = getQuantityMatrixTotal(assignment.reported);
		const assignedQuantity = getQuantityMatrixTotal(assignment.qty);
		const assignedWorkerLabel =
			assignment.assignedTo ||
			(assignment.assignedToId
				? "Assigned worker unavailable"
				: "Worker not assigned");
		const hasPendingReview = Number(assignment.pendingReview?.qty || 0) > 0;
		const assignmentComplete =
			assignment.status === "completed" || !hasPendingSubmissionQuantity;
		const canSubmit =
			mutationPolicy.canSubmitExistingAssignment &&
			!assignmentComplete &&
			!orderFulfilled;
		const dueDateDisabled =
			Boolean(queryCtx.assignedTo) ||
			Boolean(queryCtx.dispatchMode) ||
			orderFulfilled;
		const deleteDisabled =
			deleteAction.isExecuting || Boolean(assignmentDeletionRestriction);
		const submitTooltip = orderFulfilled
			? "Submissions are locked because this order is fulfilled."
			: assignmentComplete
				? "All assigned production quantity has been submitted."
				: ctx.openSubmitForm
					? "Close submission form"
					: "Add submission";
		const dueDateTooltip = orderFulfilled
			? "Due date is locked because this order is fulfilled."
			: queryCtx.dispatchMode
				? "Due date is locked while this order is in dispatch mode."
				: queryCtx.assignedTo
					? "Only an administrator can edit the assignment due date."
					: "Edit due date";
		const deleteTooltip = assignmentDeletionRestriction || "Delete assignment";

		return (
			<AccordionItem value={String(assignment.id)} className="bg-background">
				<AccordionTrigger
					className="min-h-16 gap-3 py-3 pl-2 pr-0 text-left hover:bg-muted/40 hover:no-underline focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/50 sm:pl-3 sm:pr-0"
					actions={
						<TooltipProvider delayDuration={100}>
							<Tooltip>
								<TooltipTrigger asChild>
									<div
										className={cn(
											"inline-flex",
											dueDateDisabled && "cursor-not-allowed",
										)}
									>
										<DatePicker
											disabled={dueDateDisabled}
											variant="ghost"
											className="size-8 min-w-0 justify-center overflow-hidden rounded-xl p-0 text-[0px] [&_svg]:m-0 [&_svg]:size-4"
											format="MMM DD, YYYY"
											setValue={changeDueDate}
											value={date}
										/>
									</div>
								</TooltipTrigger>
								<TooltipContent>{dueDateTooltip}</TooltipContent>
							</Tooltip>
							<AccessBased>
								<Tooltip>
									<TooltipTrigger asChild>
										<span
											className={cn(
												"inline-flex",
												deleteDisabled && "cursor-not-allowed",
											)}
										>
											<ConfirmBtn
												disabled={deleteDisabled}
												onClick={() => {
													toast.display({
														description: "Deleting...",
														duration: Number.POSITIVE_INFINITY,
													});
													deleteAction.execute({
														assignmentId: assignment.id,
														salesId: assignment.orderId,
														itemUid: itemCtx.item.controlUid,
													});
												}}
												aria-label="Delete assignment"
												title={deleteTooltip}
												trash
												size="icon"
												className="size-11 sm:size-8"
											/>
										</span>
									</TooltipTrigger>
									<TooltipContent>{deleteTooltip}</TooltipContent>
								</Tooltip>
							</AccessBased>
						</TooltipProvider>
					}
				>
					<div className="grid min-w-0 flex-1 grid-cols-1 items-start gap-3 pr-28 md:grid-cols-[minmax(9rem,1.25fr)_minmax(6rem,0.7fr)_minmax(7rem,0.85fr)]">
						<div className="min-w-0">
							<p className="break-words text-sm font-semibold uppercase sm:truncate">
								{assignedWorkerLabel}
							</p>
							<p className="mt-1 text-xs font-normal text-muted-foreground sm:truncate">
								Assigned by {assignment.assignedBy || "Unknown"}
								{assignment.assignedOn ? ` · ${assignment.assignedOn}` : ""}
							</p>
							<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 md:hidden">
								<span className="text-xs font-medium">
									Due {formatDate(date, "MMM DD, YYYY") || "Not set"}
								</span>
								<AssignmentQuantityProgress assignment={assignment} />
							</div>
						</div>
						<div className="hidden md:block">
							<p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
								Due
							</p>
							<p className="mt-1 text-xs font-medium">
								{formatDate(date, "MMM DD, YYYY") || "Not set"}
							</p>
						</div>
						<div className="hidden md:block">
							<p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
								Progress
							</p>
							<div className="mt-1 flex flex-wrap gap-x-2 gap-y-1">
								<AssignmentQuantityProgress assignment={assignment} />
								{hasPendingReview ? (
									<Badge
										variant="secondary"
										className="gap-1 whitespace-nowrap bg-amber-100 text-amber-900 [&>svg]:size-3"
									>
										<Icons.Clock />
										{assignment.pendingReview.qty} awaiting review
									</Badge>
								) : null}
							</div>
						</div>
					</div>
				</AccordionTrigger>
				<AccordionContent className="pb-0 pl-3 pr-0 sm:pl-4 sm:pr-0">
					{assignmentDeletionRestriction && !orderFulfilled ? (
						<div className="pr-8 pt-3 sm:pl-4">
							<ProductionDeletionLockNotice>
								{assignmentDeletionRestriction}
							</ProductionDeletionLockNotice>
						</div>
					) : null}
					<Collapsible
						open={ctx.openSubmitForm}
						onOpenChange={ctx.setOpenSubmitForm}
					>
						<div className="flex flex-col gap-4 border-l pl-4 pt-3 sm:ml-4 sm:pl-5">
							<div className="flex min-h-8 items-center justify-between gap-3 pr-8">
								<p className="text-sm font-semibold">
									Submissions ({submittedQuantity} of {assignedQuantity})
								</p>
								<TooltipProvider delayDuration={100}>
									<Tooltip>
										<TooltipTrigger asChild>
											<span
												className={cn(
													"inline-flex",
													!canSubmit && "cursor-not-allowed",
												)}
											>
												<CollapsibleTrigger asChild>
													<Button
														type="button"
														size="icon-sm"
														variant={ctx.openSubmitForm ? "outline" : "default"}
														disabled={!canSubmit}
														aria-label={submitTooltip}
														className="rounded-xl"
													>
														{ctx.openSubmitForm ? (
															<Icons.Close />
														) : (
															<Icons.Add />
														)}
													</Button>
												</CollapsibleTrigger>
											</span>
										</TooltipTrigger>
										<TooltipContent>{submitTooltip}</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
							<CollapsibleContent>
								<Separator />
								<ProductionSubmitForm presentation="inline" />
							</CollapsibleContent>
							<ProductionSubmissions presentation="ledger" />
						</div>
					</Collapsible>
				</AccordionContent>
			</AccordionItem>
		);
	}

	return (
		<Collapsible
			open={ctx.openSubmitForm}
			// onOpenChange={ctx.setOpenSubmitForm}
		>
			<div className="flex flex-col gap-3 border border-border p-3">
				{assignmentDeletionRestriction && !orderFulfilled ? (
					<ProductionDeletionLockNotice>
						{assignmentDeletionRestriction}
					</ProductionDeletionLockNotice>
				) : null}
				<div className="flex items-start gap-2">
					<div className="flex flex-col gap-2">
						<div className="flex gap-2 items-center">
							<p className="text-sm font-medium uppercase">
								{assignment.assignedTo}
							</p>
							{assignment.assignedTo && (
								<DatePicker
									disabled={!!queryCtx.assignedTo || queryCtx.dispatchMode}
									className="ml-2 h-6 w-auto rounded-sm p-0 px-1 text-xs"
									setValue={changeDueDate}
									value={date}
								/>
								// <TooltipProvider>
								//     <Tooltip>
								//         <TooltipTrigger asChild>
								//             <Badge
								//                 variant="outline"
								//                 className="ml-2 text-xs"
								//             >
								//                 <Clock className="mr-1 h-3 w-3" />
								//                 {formatDate(assignment.dueDate)}
								//             </Badge>
								//         </TooltipTrigger>
								//         <TooltipContent>
								//             <p>Due date</p>
								//         </TooltipContent>
								//     </Tooltip>
								// </TooltipProvider>
							)}
							<div className="flex gap-2">
								<QtyStatus
									qty={assignment.qty}
									done={assignment.completed}
									label="qty"
								/>
								<QtyStatus
									qty={assignment.qty}
									done={assignment.completed}
									label="rh"
								/>
								<QtyStatus
									qty={assignment.qty}
									done={assignment.completed}
									label="lh"
								/>
							</div>
						</div>

						<div className="text-xs items-center font-medium flex gap-1 uppercase">
							<span>Assigned by</span>
							<Badge>{assignment.assignedBy}</Badge>
							{" on "}
							<Badge>{assignment.assignedOn}</Badge>
						</div>
					</div>
					<div className="flex-1" />
					<CollapsibleTrigger disabled={!assignment?.pending?.qty} asChild>
						<Button
							disabled={!mutationPolicy.canSubmitExistingAssignment}
							onClick={() => {
								ctx.setOpenSubmitForm(!ctx.openSubmitForm);
							}}
							size="sm"
							variant="outline"
							className={cn("h-7 w-full", ctx.openSubmitForm && "hidden")}
						>
							<Icons.Send data-icon="inline-start" />
							Submit
						</Button>
					</CollapsibleTrigger>
					<Badge
						className="gap-1 [&>svg]:size-3"
						variant={
							assignment.status === "completed"
								? "success"
								: assignment.status === "in progress"
									? "default"
									: "outline"
						}
					>
						{assignment.status === "completed" ? (
							<Icons.CheckCircle />
						) : assignment.status === "in progress" ? (
							<Icons.Clock />
						) : (
							<Icons.ClipboardList />
						)}
						{assignment.status?.replace("-", " ")}
					</Badge>
					{Number(assignment.pendingReview?.qty || 0) > 0 ? (
						<Badge
							variant="secondary"
							className="gap-1 bg-amber-100 text-amber-900 [&>svg]:size-3"
						>
							<Icons.Clock />
							{assignment.pendingReview.qty} awaiting material review
						</Badge>
					) : null}
					<AccessBased>
						<ConfirmBtn
							disabled={
								deleteAction.isExecuting ||
								Boolean(assignmentDeletionRestriction)
							}
							onClick={() => {
								toast.display({
									description: "Deleting...",
									duration: Number.POSITIVE_INFINITY,
								});
								deleteAction.execute({
									assignmentId: assignment.id,
									salesId: assignment.orderId,
									itemUid: itemCtx?.item?.controlUid,
								});
							}}
							title={assignmentDeletionRestriction || "Delete assignment"}
							trash
							size="icon"
						/>
					</AccessBased>
				</div>
				<div className="flex flex-col gap-2 pt-2">
					<div className="flex items-center justify-between">
						<p className="text-xs font-medium">Submissions</p>
						{/* {expandedSubmitForms[assignment.id] && ( */}
						{ctx.openSubmitForm && (
							<Button
								size="sm"
								variant="destructive"
								onClick={() => {
									ctx.setOpenSubmitForm(false);
								}}
								className="h-6 px-2 text-xs"
							>
								Cancel
							</Button>
						)}
						{/* )} */}
					</div>
				</div>
				<CollapsibleContent>
					<ProductionSubmitForm />
				</CollapsibleContent>
				<ProductionSubmissions />
			</div>
		</Collapsible>
	);
}

type AssignmentRecord = NonNullable<
	ReturnType<typeof useAssignmentRow>["assignment"]
>;

function AssignmentQuantityProgress({
	assignment,
}: {
	assignment: AssignmentRecord;
}) {
	return (
		<>
			<QtyStatus qty={assignment.qty} done={assignment.completed} label="qty" />
			<QtyStatus qty={assignment.qty} done={assignment.completed} label="rh" />
			<QtyStatus qty={assignment.qty} done={assignment.completed} label="lh" />
		</>
	);
}

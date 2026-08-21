import { useState } from "react";
import { deleteSalesAssignmentAction } from "@/actions/delete-sales-assignment";
import { updateAssignmentDueDateUseCase } from "@/app-deps/(clean-code)/(sales)/_common/use-case/sales-prod.use-case";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { DatePicker } from "@/components/_v1/date-range-picker";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { cn } from "@/lib/utils";
import createContextFactory from "@/utils/context-factory";
import { useAction } from "next-safe-action/hooks";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Icons } from "@gnd/ui/icons";

import { AccessBased } from "./access-based";
import { useProduction } from "./context";
import { useProductionAssignments } from "./production-assignments";
import { ProductionSubmissions } from "./production-submissions";
import { ProductionSubmitForm } from "./production-submit-form";
import { useProductionItem } from "./production-tab";
import { isWorkerProductionItemSubmissionBlocked } from "./production-worker-policy";
import { QtyStatus } from "./qty-label";

const { useContext: useAssignmentRow, Provider: AssignmentRowProvider } =
    createContextFactory((index: number) => {
        const ctx = useProductionAssignments();
        const assignment = ctx?.data?.assignments[index];
        const [openSubmitForm, setOpenSubmitForm] = useState(false);

        return {
            assignment,
            pendingSubmissions: assignment?.pending?.qty,
            openSubmitForm,
            setOpenSubmitForm,
        };
    });
export { useAssignmentRow };
export function ProductionAssignmentRow({
    index,
    view = "assignments",
}: {
    index: number;
    view?: "assignments" | "submissions";
}) {
    return (
        <AssignmentRowProvider args={[index]}>
			<Content view={view} />
        </AssignmentRowProvider>
    );
}
function Content({ view }: { view: "assignments" | "submissions" }) {
    const ctx = useAssignmentRow();
    const { assignment } = ctx;
    const queryCtx = useSalesOverviewQuery();
    const itemCtx = useProductionItem();
	const production = useProduction();
    const deleteAction = useAction(deleteSalesAssignmentAction, {
        onSuccess() {
            toast.success("Deleted");
            queryCtx.salesQuery.assignmentUpdated();
        },
        onError() {
            toast.error("Unable to complete");
        },
    });
    const toast = useLoadingToast();
    const [date, setDate] = useState(assignment.dueDate);
    async function changeDueDate(e) {
        toast.loading("Updating....");
        updateAssignmentDueDateUseCase(assignment.id, e).then(() => {
            toast.success("Updated");
        });
    }
	const materialBlocked = isWorkerProductionItemSubmissionBlocked({
		itemId: itemCtx.item.itemId,
		readiness: production.readiness,
		readinessUnavailable: production.readinessUnavailable,
	});
	if (view === "submissions") {
		const submittedQty = Number(assignment?.completed?.qty || 0);
		const assignedQty = Number(assignment?.qty?.qty || 0);
		const hasPendingQty = Number(assignment?.pending?.qty || 0) > 0;
		return (
			<Collapsible open={ctx.openSubmitForm}>
				<div className="space-y-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p className="text-sm font-medium">My submissions</p>
							<p className="text-xs text-muted-foreground">
								{submittedQty}/{assignedQty} submitted
							</p>
						</div>
						<Button
							type="button"
							size="sm"
							variant={ctx.openSubmitForm ? "outline" : "default"}
							disabled={!hasPendingQty || materialBlocked || queryCtx.dispatchMode}
							onClick={() => ctx.setOpenSubmitForm(!ctx.openSubmitForm)}
						>
							{ctx.openSubmitForm ? "Cancel" : "Add submission"}
						</Button>
					</div>
					{materialBlocked ? (
						<div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-950">
							<Icons.AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-700" />
							<div>
								<p className="text-sm font-medium">Materials unavailable</p>
								<p className="mt-1 text-xs text-red-900">
									Submission is blocked until the required materials are
									available.
								</p>
							</div>
						</div>
					) : null}
					<CollapsibleContent>
						<ProductionSubmitForm />
					</CollapsibleContent>
					<ProductionSubmissions />
				</div>
			</Collapsible>
		);
	}
    return (
        <Collapsible
            open={ctx.openSubmitForm}
            // onOpenChange={ctx.setOpenSubmitForm}
        >
            <div className="space-y-3 border border-border p-3">
                <div className="flex items-start gap-2">
                    <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                            <p className="text-sm font-medium uppercase">
                                {assignment.assignedTo}
                            </p>
                            {assignment.assignedTo && (
                                <DatePicker
                                    disabled={
                                        !!queryCtx.assignedTo ||
                                        queryCtx.dispatchMode
                                    }
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
                    <CollapsibleTrigger
                        disabled={!assignment?.pending?.qty}
                        asChild
                    >
                        <div className="">
                            <Button
                                disabled={
                                    !assignment?.pending?.qty ||
                                    queryCtx.dispatchMode
                                }
                                onClick={(e) => {
                                    ctx.setOpenSubmitForm(!ctx.openSubmitForm);
                                }}
                                size="sm"
                                variant="outline"
                                className={cn(
                                    "h-7 w-full",
                                    ctx.openSubmitForm && "hidden"
                                )}
                            >
                                <Icons.Send className="mr-2 h-4 w-4" />
                                Submit
                            </Button>
                        </div>
                    </CollapsibleTrigger>
                    <Badge
                        variant={
                            assignment.status === "completed"
                                ? "success"
                                : assignment.status === "in progress"
                                ? "default"
                                : "outline"
                        }
                    >
                        {assignment.status === "completed" ? (
                            <Icons.CheckCircle className="mr-1 h-3 w-3" />
                        ) : assignment.status === "in progress" ? (
                            <Icons.Clock className="mr-1 h-3 w-3" />
                        ) : (
                            <Icons.ClipboardList className="mr-1 h-3 w-3" />
                        )}
                        {assignment.status?.replace("-", " ")}
                    </Badge>
                    <AccessBased>
                        <ConfirmBtn
                            disabled={
                                deleteAction.isExecuting ||
                                queryCtx.dispatchMode
                            }
                            onClick={(e) => {
                                if (assignment.submissionCount) {
                                    toast.error("Cannot perform action", {
                                        description:
                                            "Assignment cannot be deleted as it contains submitted items.",
                                    });
                                    return;
                                }
                                toast.display({
                                    description: "Deleting...",
                                    duration: Number.POSITIVE_INFINITY,
                                });
                                deleteAction.execute({
                                    assignmentId: assignment.id,
                                    itemUid: itemCtx?.item?.controlUid,
                                });
                            }}
                            trash
                            size="icon"
                        />
                    </AccessBased>
                </div>
                <div className="space-y-2 pt-2">
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

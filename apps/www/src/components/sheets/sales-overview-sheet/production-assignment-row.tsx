import {
    createContext as createContextBase,
    useContext as useContextBase,
    useState,
} from "react";
import { deleteSalesAssignmentAction } from "@/actions/delete-sales-assignment";
import { updateAssignmentDueDateUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/sales-prod.use-case";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { DatePicker } from "@/components/_v1/date-range-picker";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { formatDate } from "@/lib/use-day";
import { cn } from "@/lib/utils";
import { createContextFactory } from "@/utils/context-factory";
import { CheckCircle, ClipboardList, Clock, Send } from "lucide-react";
import { useAction } from "next-safe-action/hooks";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@gnd/ui/tooltip";

import { AccessBased } from "./access-based";
import { useProductionAssignments } from "./production-assignments";
import { ProductionSubmissions } from "./production-submissions";
import { ProductionSubmitForm } from "./production-submit-form";
import { useProductionItem } from "./production-tab";
import { QtyStatus } from "./qty-label";

const { useContext: useAssignmentRow, Provider: AssignmentRowProvider } =
    createContextFactory(function (index: number) {
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
export function ProductionAssignmentRow({ index }) {
    return (
        <AssignmentRowProvider args={[index]}>
            <Content />
        </AssignmentRowProvider>
    );
}
function Content() {
    const ctx = useAssignmentRow();
    const { assignment } = ctx;
    const queryCtx = useSalesOverviewQuery();
    const itemCtx = useProductionItem();
    const deleteAction = useAction(deleteSalesAssignmentAction, {
        onSuccess(args) {
            toast.success("Deleted");
            queryCtx._refreshToken();
        },
        onError() {
            toast.error("Unable to complete");
        },
    });
    const toast = useLoadingToast();
    const [date, setDate] = useState(assignment.dueDate);
    async function changeDueDate(e) {
        toast.loading("Updating....");
        updateAssignmentDueDateUseCase(assignment.id, e).then((resp) => {
            toast.success("Updated");
        });
    }
    return (
        <Collapsible
            open={ctx.openSubmitForm}
            // onOpenChange={ctx.setOpenSubmitForm}
        >
            <div className="space-y-3 border border-border p-3">
                <div className="flex items-center gap-2">
                    <div className="">
                        <div className="flex">
                            <p className="text-sm font-medium uppercase">
                                {assignment.assignedTo}
                            </p>
                            {assignment.assignedTo && (
                                <DatePicker
                                    disabled={!!queryCtx.assignedTo}
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
                        </div>
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
                    <div className="flex-1"></div>
                    <CollapsibleTrigger
                        disabled={!assignment?.pending?.qty}
                        asChild
                    >
                        <div className="">
                            <Button
                                disabled={!assignment?.pending?.qty}
                                onClick={(e) => {
                                    ctx.setOpenSubmitForm(!ctx.openSubmitForm);
                                }}
                                size="sm"
                                variant="outline"
                                className={cn(
                                    "h-7 w-full",
                                    ctx.openSubmitForm && "hidden",
                                )}
                            >
                                <Send className="mr-2 h-4 w-4" />
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
                            <CheckCircle className="mr-1 h-3 w-3" />
                        ) : assignment.status === "in progress" ? (
                            <Clock className="mr-1 h-3 w-3" />
                        ) : (
                            <ClipboardList className="mr-1 h-3 w-3" />
                        )}
                        {assignment.status?.replace("-", " ")}
                    </Badge>
                    <AccessBased>
                        <ConfirmBtn
                            disabled={deleteAction.isExecuting}
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

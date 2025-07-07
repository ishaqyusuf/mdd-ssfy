import { useState } from "react";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Icons } from "@/components/_v1/icons";
import { SecondaryTabSheet } from "@/components/(clean-code)/data-table/item-overview-sheet";
import { formatDate } from "@/lib/use-day";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";

import {
    deleteAssignmentSubmissionUseCase,
    deleteAssignmentUseCase,
} from "../../../use-case/sales-prod.use-case";
import {
    ItemAssignment,
    ItemAssignmentSubmission,
    LineItem,
} from "../item-view/sales-items-overview";
import { AssignForm } from "./assigne-form";
import SubmitProductionForm from "./submit-form";
import { ItemProdViewContext, useItemProdViewContext } from "./use-hooks";

export function ItemProdView({}) {
    const ctx = useItemProdViewContext();
    const { mainCtx, item } = ctx;
    return (
        <ItemProdViewContext.Provider value={ctx}>
            <div className="secondary-tab flex flex-col">
                <SecondaryTabSheet
                    title={`${item?.title}`}
                    onBack={() => mainCtx.setTabData(null)}
                />
                <ScrollArea className="o-scrollable-content-area ">
                    <div className="p-4 sm:p-8">
                        <div className={cn("")}>
                            <LineItem item={item} />
                        </div>

                        <AssignForm />
                        <div className="">
                            {item.assignments.length ? (
                                <div className="my-2 mt-4">
                                    <Label>Assignments</Label>
                                </div>
                            ) : (
                                <></>
                            )}
                            {item.assignments.map((assignment) => (
                                <Assignment
                                    key={assignment.id}
                                    assignment={assignment}
                                />
                            ))}
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </ItemProdViewContext.Provider>
    );
}
function Assignment({ assignment }: { assignment: ItemAssignment }) {
    const ctx = useItemProdViewContext();
    const { mainCtx, item } = ctx;
    const [showSubmit, setShowSubmit] = useState(false);
    async function deleteAssignment() {
        await deleteAssignmentUseCase(
            assignment.id,
            item.analytics.control.produceable,
        );
        toast.success("Deleted");
        mainCtx.refresh();
    }
    return (
        <div className="bg-white" key={assignment.id}>
            <div>
                <div className="flex items-center gap-4">
                    <div className="p-2">
                        <Label className="text-base leading-relaxed">
                            {assignment.assignedTo}
                        </Label>
                        <div className="flex items-center gap-2 text-sm">
                            <Icons.calendar className="size-4" />
                            <span>{formatDate(assignment.dueDate)}</span>
                        </div>
                    </div>
                    <div>
                        {item.hasSwing ? (
                            <>
                                <Badge
                                    className={cn(
                                        !assignment.qty.rh && "hidden",
                                    )}
                                    variant="outline"
                                >
                                    {assignment.submitted?.rh}
                                    {" / "}
                                    {assignment.qty.rh}
                                    {" RH"}
                                </Badge>
                                <Badge
                                    className={cn(
                                        !assignment.qty.lh && "hidden",
                                    )}
                                    variant="outline"
                                >
                                    {assignment.submitted?.lh}
                                    {" / "}
                                    {assignment.qty.lh}
                                    {" LH"}
                                </Badge>
                            </>
                        ) : (
                            <>
                                <Badge className={cn()} variant="outline">
                                    {assignment.submitted?.qty}
                                    {" / "}
                                    {assignment.qty.qty}
                                    {" QTY"}
                                </Badge>
                            </>
                        )}
                    </div>
                    {/* <div>{JSON.parse(assignment.)}</div> */}
                    <div className="flex-1"></div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => {
                                setShowSubmit(true);
                            }}
                            disabled={showSubmit || !assignment.pending.total}
                            size="sm"
                            className="h-8"
                        >
                            Submit
                        </Button>
                        <ConfirmBtn
                            size="icon"
                            trash
                            onClick={deleteAssignment}
                        />
                    </div>
                </div>
                {showSubmit && <SubmitProductionForm assignment={assignment} />}
                <div className="border-t pl-4">
                    {assignment.submissions?.map((s) => (
                        <AssignmentSubmissionLine submission={s} key={s.id} />
                    ))}
                </div>
            </div>
        </div>
    );
}
function AssignmentSubmissionLine({
    submission,
}: {
    submission: ItemAssignmentSubmission;
}) {
    const ctx = useItemProdViewContext();
    async function _deleteSubmission() {
        await deleteAssignmentSubmissionUseCase(
            submission.id,
            ctx.item.analytics.control.produceable,
        );
        toast.error("Deleted");
        ctx.mainCtx.refresh();
    }
    return (
        <div className="flex items-center justify-between">
            <div className="font-mono text-sm text-muted-foreground">
                {`${submission.qty?.total} submitted on ${formatDate(
                    submission.date,
                )}`}
            </div>
            <div>
                <ConfirmBtn onClick={_deleteSubmission} size="icon" trash />
            </div>
        </div>
    );
}

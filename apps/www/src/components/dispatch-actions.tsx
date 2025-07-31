import { usePacking } from "@/hooks/use-sales-packing";
import { Progress } from "./(clean-code)/progress";
import { Button } from "@gnd/ui/button";
import { CheckCircle, MoreHorizontal, Play, X } from "lucide-react";
import { Icons } from "@gnd/ui/custom/icons";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@gnd/ui/alert-dialog";
import { DispatchDeleteConfirmDialog } from "./dispatch-delete-confirm-dialog";
import { DispatchCancelConfirmDialog } from "./dispatch-cancel-confirm-dialog";
import { DispatchClearPackingConfirmDialog } from "./dispatch-clear-packing-confirm-dialog";
import { Menu } from "./(clean-code)/menu";

export function DispatchActions({}) {
    const { data, ...ctx } = usePacking();
    const { dispatch, order, address } = data;

    return (
        <>
            <div className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/20 rounded-lg border">
                {/* Status and Primary Actions */}
                <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                            Status:
                        </span>
                        <Progress>
                            <Progress.Status>
                                {dispatch?.status}
                            </Progress.Status>
                        </Progress>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Primary Actions based on status */}
                    {ctx.isQueue && (
                        <Button
                            onClick={ctx.onStartDispatch}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Play className="h-4 w-4 mr-2" />
                            Start Dispatch
                        </Button>
                    )}

                    {ctx.isInProgress && (
                        <div className="flex items-center gap-2">
                            {/* Always show Complete Dispatch button when in progress */}
                            <Button
                                onClick={ctx.onCompleteDispatch}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Complete Dispatch
                            </Button>

                            {/* Show Unstart button only if not all items are packed */}
                            {/* {!allItemsPacked && (
                                     <Button
                                         variant="outline"
                                         onClick={onUnstartDispatch}
                                         className="border-orange-500 text-orange-600 hover:bg-orange-50 bg-transparent"
                                     >
                                         <X className="h-4 w-4 mr-2" />
                                         Unstart
                                     </Button>
                                 )} */}
                        </div>
                    )}

                    {/* Print Actions */}
                    <Button variant="outline" onClick={ctx.onPrintPacking}>
                        <Icons.print className="h-4 w-4 mr-2" />
                        Print Packing List
                    </Button>

                    {/* More Actions Dropdown */}
                    <Menu noSize Icon={MoreHorizontal}>
                        <Menu.Label>Dispatch Actions</Menu.Label>
                        <Menu.Item
                            onClick={(e) => {
                                ctx.onResetSalesStat();
                            }}
                            Icon={MoreHorizontal}
                        >
                            Update Packing Availability
                        </Menu.Item>
                    </Menu>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <DispatchDeleteConfirmDialog />
            {/* Cancel Confirmation Dialog */}
            <DispatchCancelConfirmDialog />

            {/* Clear Packing Confirmation Dialog */}
            <DispatchClearPackingConfirmDialog />

            {/* Unstart Confirmation Dialog */}
        </>
    );
}


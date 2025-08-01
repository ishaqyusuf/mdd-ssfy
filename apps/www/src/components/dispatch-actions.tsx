import { usePacking } from "@/hooks/use-sales-packing";
import { Progress } from "./(clean-code)/progress";
import { Button } from "@gnd/ui/button";
import {
    AlertTriangle,
    CheckCircle,
    Group,
    MoreHorizontal,
    Play,
    Printer,
    Trash2,
    X,
} from "lucide-react";
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
import {
    DropdownMenuItem,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
} from "@gnd/ui/dropdown-menu";

export function DispatchActions({}) {
    const { data, ...ctx } = usePacking();
    const { dispatch, order, address } = data;
    const { isCancelled, isInProgress, isQueue, onClearPacking } = ctx;
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
                            disabled={ctx.isStarting}
                            onClick={ctx.onStartDispatch}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Play className="h-4 w-4 mr-2" />
                            Start Dispatch
                        </Button>
                    )}
                    {/* <span>abc-{dispatch?.status}</span> */}
                    {ctx.isInProgress && (
                        <div className="flex items-center gap-2">
                            {/* Always show Complete Dispatch button when in progress */}
                            <Button
                                onClick={() => {
                                    ctx.setMainTab("finalize");
                                }}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Complete Dispatch
                            </Button>

                            <Button
                                variant="outline"
                                disabled={ctx.isCancelling}
                                onClick={ctx.onUnstartDispatch}
                                className="border-orange-500 text-orange-600 hover:bg-orange-50 bg-transparent"
                            >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                        </div>
                    )}

                    {/* Print Actions */}
                    <Button
                        size="icon"
                        variant="outline"
                        onClick={ctx.onPrintPacking}
                    >
                        <Icons.print className="h-4 w-4" />
                    </Button>

                    {/* More Actions Dropdown */}
                    <Menu className="w-[200px]" noSize Icon={MoreHorizontal}>
                        <Menu.Label>Dispatch Actions</Menu.Label>
                        <Menu.Item
                            onClick={(e) => {
                                ctx.onResetSalesStat();
                            }}
                            Icon={MoreHorizontal}
                        >
                            Refresh Packing
                        </Menu.Item>
                        <DropdownMenuItem
                            onClick={onClearPacking}
                            className="text-orange-600"
                            disabled={!isQueue}
                        >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Clear All Packing
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <Menu.Item Icon={Group}>Batch Packing</Menu.Item>
                        <Menu.Item Icon={Printer}>Print Packing Slip</Menu.Item>
                        <Menu.Item Icon={Printer}>Print Order</Menu.Item>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={ctx.onDeleteDispatch}
                            className="text-red-600"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Dispatch
                        </DropdownMenuItem>
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


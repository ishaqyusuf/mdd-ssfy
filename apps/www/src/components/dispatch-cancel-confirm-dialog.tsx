import { usePacking } from "@/hooks/use-sales-packing";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@gnd/ui/alert-dialog";
import { useState } from "react";

export function DispatchCancelConfirmDialog({}) {
    const ctx = usePacking();

    const [showCancelDialog, setShowCancelDialog] = useState(false);
    return (
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Dispatch</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to cancel dispatch{" "}
                        {ctx.data.dispatch.dispatchNumber}? This will stop the
                        current delivery process and notify the driver.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Keep Active</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            ctx.onCancelDispatch();
                            setShowCancelDialog(false);
                        }}
                        className="bg-orange-600 hover:bg-orange-700"
                    >
                        Cancel Dispatch
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}


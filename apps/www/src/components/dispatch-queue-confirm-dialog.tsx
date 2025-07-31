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

export function DispatchQueueConfirmDialog({}) {
    const ctx = usePacking();

    const [showUnstartDialog, setShowUnstartDialog] = useState(false);
    return (
        <AlertDialog
            open={showUnstartDialog}
            onOpenChange={setShowUnstartDialog}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Unstart Dispatch</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to unstart dispatch{" "}
                        {ctx.data.dispatch.dispatchNumber}? This will return the
                        dispatch to queue status and preserve all packing data.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Keep Active</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            ctx.onUnstartDispatch();
                            setShowUnstartDialog(false);
                        }}
                        className="bg-orange-600 hover:bg-orange-700"
                    >
                        Unstart Dispatch
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}


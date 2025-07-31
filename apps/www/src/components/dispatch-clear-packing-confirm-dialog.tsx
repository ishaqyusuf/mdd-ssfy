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

export function DispatchClearPackingConfirmDialog({}) {
    const ctx = usePacking();

    const [showClearPackingDialog, setShowClearPackingDialog] = useState(false);
    return (
        <>
            <AlertDialog
                open={showClearPackingDialog}
                onOpenChange={setShowClearPackingDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear All Packing</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to clear all packing data?
                            This will reset all packed quantities to zero and
                            remove all packing history.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep Packing Data</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                ctx.onClearPacking();
                                setShowClearPackingDialog(false);
                            }}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            Clear All Packing
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}


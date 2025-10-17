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

export function DispatchDeleteConfirmDialog({}) {
    const ctx = usePacking();

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    return (
        <>
            <AlertDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Dispatch</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete dispatch{" "}
                            {ctx.data.dispatch.dispatchNumber}? This action
                            cannot be undone and will permanently remove all
                            packing data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                ctx.onDeleteDispatch();
                                setShowDeleteDialog(false);
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete Dispatch
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

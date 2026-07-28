"use client";

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

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    packedCount: number;
    pendingCount: number;
    isLoading?: boolean;
    onCompletePacked: () => void;
    onPackAllComplete: () => void;
}

export function DispatchCompletionDecisionModal(props: Props) {
    const {
        open,
        onOpenChange,
        packedCount,
        pendingCount,
        isLoading,
        onCompletePacked,
        onPackAllComplete,
    } = props;

    return (
        <AlertDialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (isLoading) return;
                onOpenChange(nextOpen);
            }}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Complete Dispatch With Pending Packings
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Some items are not packed yet. Completing now can open
                        back-order for unpacked items.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="rounded-md border p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Packed</span>
                        <span className="font-medium">{packedCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Pending</span>
                        <span className="font-medium text-amber-600">
                            {pendingCount}
                        </span>
                    </div>
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        disabled={isLoading}
                        onClick={onCompletePacked}
                    >
                        Complete with packed ({packedCount})
                    </AlertDialogAction>
                    <AlertDialogAction
                        disabled={isLoading}
                        onClick={onPackAllComplete}
                    >
                        {isLoading ? "Completing..." : "Pack all and complete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

"use client";

import { Button } from "@gnd/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";
import { useCallback, useRef, useState } from "react";

export type OrderInboundStatus = "AVAILABLE" | "ORDERED" | "PENDING ORDER";

type InStockStatusDialogProps = {
    open: boolean;
    onSelectStatus: (status: OrderInboundStatus) => void;
};

export function InStockStatusDialog({
    open,
    onSelectStatus,
}: InStockStatusDialogProps) {
    return (
        <Dialog open={open}>
            <DialogContent
                className="max-w-md"
                hideClose
                onEscapeKeyDown={(event) => event.preventDefault()}
                onInteractOutside={(event) => event.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>Is all product in stock?</DialogTitle>
                    <DialogDescription>
                        Confirm the order inventory status before saving.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-2">
                    <Button
                        type="button"
                        onClick={() => onSelectStatus("AVAILABLE")}
                    >
                        All product is in stock
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onSelectStatus("ORDERED")}
                    >
                        Not in stock, already ordered
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onSelectStatus("PENDING ORDER")}
                    >
                        Not in stock, pending order
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function useInStockStatusPrompt() {
    const [open, setOpen] = useState(false);
    const resolverRef = useRef<((status: OrderInboundStatus) => void) | null>(
        null,
    );

    const promptForInboundStatus = useCallback(
        (currentStatus?: string | null) => {
            if (currentStatus) {
                return Promise.resolve(currentStatus as OrderInboundStatus);
            }

            setOpen(true);
            return new Promise<OrderInboundStatus>((resolve) => {
                resolverRef.current = resolve;
            });
        },
        [],
    );

    const handleSelectStatus = useCallback((status: OrderInboundStatus) => {
        const resolve = resolverRef.current;
        resolverRef.current = null;
        setOpen(false);
        resolve?.(status);
    }, []);

    return {
        inStockStatusDialog: (
            <InStockStatusDialog
                open={open}
                onSelectStatus={handleSelectStatus}
            />
        ),
        promptForInboundStatus,
    };
}

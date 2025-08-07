"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";

import { ScrollArea } from "@gnd/ui/scroll-area";
import { cn } from "@gnd/ui/cn";
import { useSalesPrintParams } from "../../hooks/use-sales-print-params";
import { SalesInvoiceView } from "../sales-printer";

export function SalesInvoicePreviewModal({}) {
    const ctx = useSalesPrintParams();

    return (
        <Dialog
            onOpenChange={(e) => {
                ctx.close();
            }}
            open={ctx.params?.modal}
        >
            <DialogContent className="w-[800px]s max-w-4xl">
                <DialogHeader>
                    <DialogTitle></DialogTitle>
                </DialogHeader>
                <ScrollArea
                    className={cn(
                        "h-[90vh] overflow-auto",
                        // !inboundCtx?.params?.inboundOrderId || "pb-24",
                    )}
                >
                    <SalesInvoiceView />
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

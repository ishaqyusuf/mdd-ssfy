"use client";

import { getCustomerTransactionOverviewAction } from "@/actions/get-customer-transaction-overview";
import { useTransactionOverviewModal } from "@/hooks/use-tx-overview-modal";
import { useAsyncMemo } from "use-async-memo";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";

export function TransactionOverviewModal({}) {
    const ctx = useTransactionOverviewModal();

    const txData = useAsyncMemo(async () => {
        return await getCustomerTransactionOverviewAction(ctx.transactionId);
    }, [ctx.transactionId]);
    return (
        <Dialog
            open={!!ctx.transactionId}
            onOpenChange={() => ctx.setParams(null)}
        >
            <DialogContent className="min-w-max max-w-xl">
                <DialogTitle>Transaction Detail</DialogTitle>
                <DialogDescription></DialogDescription>
            </DialogContent>
        </Dialog>
    );
}

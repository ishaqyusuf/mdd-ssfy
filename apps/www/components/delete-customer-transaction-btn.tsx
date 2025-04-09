import { useEffect, useState } from "react";
import { deleteCustomerTransactionAction } from "@/actions/delete-customer-transaction-action";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useAction } from "next-safe-action/hooks";

import { useToast } from "@gnd/ui/use-toast";

import ConfirmBtn, { ConfirmBtnProps } from "./_v1/confirm-btn";
import { revalidateTable } from "./(clean-code)/data-table/use-infinity-data-table";

interface Props {
    transactionId?;
    btnProps?: ConfirmBtnProps;
    onDelete?;
}
export function DeleteCustomerTxBtn({
    transactionId,
    onDelete,
    btnProps,
}: Props) {
    const toast = useLoadingToast();
    const deleteFn = useAction(deleteCustomerTransactionAction, {
        onSuccess(args) {
            toast.display({
                title: "Deleted",
                duration: 2000,
                variant: "destructive",
            });
            revalidateTable();
            onDelete?.();
        },
        onExecute(args) {
            toast.display({
                title: "Unable to complete",
                duration: 2000,
                variant: "error",
            });
        },
    });

    return (
        <ConfirmBtn
            disabled={!!status}
            trash
            size="xs"
            {...(btnProps || {})}
            onClick={(e) => {
                toast.display({
                    title: "Deleting...",
                    variant: "spinner",
                    duration: Number.POSITIVE_INFINITY,
                });
                deleteFn.execute({
                    transactionId,
                });
            }}
        />
    );
}

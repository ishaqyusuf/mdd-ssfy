import { useEffect, useState } from "react";
import { deleteCustomerTransactionAction } from "@/actions/delete-customer-transaction-action";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useAction } from "next-safe-action/hooks";

import { useToast } from "@gnd/ui/use-toast";

import ConfirmBtn from "./_v1/confirm-btn";

export function DeleteCustomerTxBtn({ transactionId }) {
    const toast = useLoadingToast();
    const deleteFn = useAction(deleteCustomerTransactionAction, {
        onSuccess(args) {},
    });

    return (
        <ConfirmBtn
            disabled={!!status}
            trash
            size="xs"
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

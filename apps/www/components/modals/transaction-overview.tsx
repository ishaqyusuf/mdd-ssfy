import { getCustomerTransactionOverviewAction } from "@/actions/get-customer-transaction-overview";
import { getSalesCustomerTxOverviewAction } from "@/actions/get-sales-transactions";
import { parseAsInteger, useQueryState, useQueryStates } from "nuqs";
import { useAsyncMemo } from "use-async-memo";

import { Dialog, DialogContent } from "@gnd/ui/dialog";

export function useTransactionOverviewModal() {
    const [params, setParams] = useQueryStates({
        transactionId: parseAsInteger,
    });

    return {
        ...params,
        setParams,
        viewTx(transactionId) {
            setParams({
                transactionId,
            });
        },
    };
}

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
            <DialogContent className="min-w-max max-w-xl"></DialogContent>
        </Dialog>
    );
}

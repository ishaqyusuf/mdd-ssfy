import { getCustomerTransactionsAction } from "@/actions/get-customer-tx-action";

import { EmptyState } from "@/components/empty-state";
import { SalesPaymentForm } from "@/components/sales-payment-form";
import { CustomerTxDataTable } from "@/components/tables/sales-accounting/table.customer-transaction";
import {
    DataSkeletonProvider,
    useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { Button } from "@gnd/ui/button";
import { Collapsible } from "@gnd/ui/namespace";

interface Props {
    accountNo?: string;
    salesId?: string;
}
export function TransactionsTab({ accountNo, salesId }: Props) {
    const loader = async () => {
        const resp = await getCustomerTransactionsAction({
            orderNo: salesId,
            // "account.no": accountNo,
        });
        return {
            status: "Loaded",
            transactions: resp.data,
        };
    };
    const skel = useCreateDataSkeletonCtx({
        loader,
        autoLoad: true,
    });
    const data = skel?.data;
    const toast = useLoadingToast();

    return (
        <div className="flex flex-col">
            {/* <SalesPaymentForm /> */}
            <EmptyState
                empty={data?.status && data?.transactions?.length == 0}
                title="Empty Transactions"
                description={
                    salesId
                        ? `No transactions found for ${salesId}`
                        : `No transactions found for ${accountNo}`
                }
            >
                <DataSkeletonProvider value={skel}>
                    <div className="flex flex-col w-full gap-4 overflow-auto">
                        <CustomerTxDataTable
                            data={(data?.transactions as any) || []}
                        />
                    </div>
                </DataSkeletonProvider>
            </EmptyState>
        </div>
    );
}

import { getCustomerTransactionsAction } from "@/actions/get-customer-tx-action";

import { EmptyState } from "@/components/empty-state";
import { CustomerTxDataTable } from "@/components/tables/sales-accounting/table.customer-transaction";
import {
    DataSkeletonProvider,
    useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";
import { useLoadingToast } from "@/hooks/use-loading-toast";

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
                <div className="flex flex-col w-full overflow-auto">
                    <CustomerTxDataTable
                        data={(data?.transactions as any) || []}
                    />
                </div>
            </DataSkeletonProvider>
        </EmptyState>
    );
}

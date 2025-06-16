import { cancelSalesPaymentAction } from "@/actions/cancel-sales-payment";
import { getCustomerTransactionsAction } from "@/actions/get-customer-tx-action";
import { getSalesPaymentsAction } from "@/actions/get-sales-payment";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { revalidateTable } from "@/components/(clean-code)/data-table/use-infinity-data-table";
import { CancelSalesTransactionAction } from "@/components/cancel-sales-transaction";
import { DataSkeleton } from "@/components/data-skeleton";
import { EmptyState } from "@/components/empty-state";
import { CustomerTxDataTable } from "@/components/tables/sales-accounting/table.customer-transaction";
import {
    DataSkeletonProvider,
    useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { formatDate } from "@/lib/use-day";
import { cn } from "@/lib/utils";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { useAction } from "next-safe-action/hooks";

interface Props {
    accountNo?: string;
    salesId?: string;
}
export function TransactionsTab({ accountNo, salesId }: Props) {
    const loader = async () => {
        const resp = await getCustomerTransactionsAction({
            "order.no": salesId,
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
                    <CustomerTxDataTable data={data?.transactions || []} />
                </div>
            </DataSkeletonProvider>
        </EmptyState>
    );
}

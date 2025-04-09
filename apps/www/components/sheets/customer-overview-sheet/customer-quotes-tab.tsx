"use client";

import { getCustomerQuoteList } from "@/actions/get-customer-quotes-list";
import { getCustomerTransactionsAction } from "@/actions/get-customer-tx-action";
import { getSalesOrdersDta } from "@/app/(clean-code)/(sales)/_common/data-access/sales-dta";
import { EmptyState } from "@/components/empty-state";
import {
    DataSkeletonProvider,
    useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";

import { SalesList } from "./sales-list";

export function CustomerQuotesTab({ accountNo }) {
    const loader = async () =>
        await getCustomerQuoteList({
            "account.no": accountNo,
            "sales.type": "quote",
        });
    const skel = useCreateDataSkeletonCtx({
        loader,
        autoLoad: true,
    });
    const data = skel?.data;

    return (
        <div className="space-y-4">
            <DataSkeletonProvider value={skel}>
                <EmptyState empty={data?.length == 0}>
                    <SalesList data={data} />
                </EmptyState>
            </DataSkeletonProvider>
        </div>
    );
}

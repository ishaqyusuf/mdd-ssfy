"use client";

import { getCustomerSalesList } from "@/actions/get-customer-sales-list";
import { EmptyState } from "@/components/empty-state";
import {
    DataSkeletonProvider,
    useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";

import { SalesList } from "./sales-list";

export function CustomerSalesTab({ accountNo }) {
    const loader = async () =>
        await getCustomerSalesList({
            "account.no": accountNo,
            "sales.type": "order",
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

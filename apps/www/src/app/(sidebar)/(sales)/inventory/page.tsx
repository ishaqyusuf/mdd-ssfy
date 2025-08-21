import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { ErrorFallback } from "@/components/error-fallback";
import { InventoryHeader } from "@/components/inventory-header";
import { DataTable } from "@/components/tables/inventory-products/data-table";

import { TableSkeleton } from "@/components/tables/skeleton";
import { loadInventoryFilterParams } from "@/hooks/use-inventory-filter-params";
import {
    batchPrefetch,
    getQueryClient,
    HydrateClient,
    trpc,
} from "@/trpc/server";
import { RouterInputs } from "@api/trpc/routers/_app";
import { InventorySummary } from "@sales/inventory";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { SearchParams } from "nuqs";
import { Suspense } from "react";

type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
    const searchParams = await props.searchParams;
    const filter = loadInventoryFilterParams(searchParams);
    batchPrefetch([
        trpc.inventories.inventoryProducts.infiniteQueryOptions({
            ...filter,
        }),
        ...(
            [
                "categories",
                "inventory_value",
                "stock_level",
                "total_products",
            ] as InventorySummary["type"][]
        ).map((type) =>
            trpc.inventories.inventorySummary.queryOptions({
                type,
            }),
        ),
    ]);
    return (
        <FPage title="Inventory">
            {/* <InventoryTabSwitch path="/inventory" /> */}
            <HydrateClient>
                <div className="flex flex-col gap-6">
                    <InventoryHeader />
                    <ErrorBoundary errorComponent={ErrorFallback}>
                        <Suspense fallback={<TableSkeleton />}>
                            <DataTable />
                        </Suspense>
                    </ErrorBoundary>
                </div>
            </HydrateClient>
        </FPage>
    );
}


import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { ErrorFallback } from "@/components/error-fallback";
import { InventoryHeader } from "@/components/inventory-header";
import { DataTable } from "@/components/tables/inventory-products/data-table";

import { TableSkeleton } from "@/components/tables/skeleton";
import { getQueryClient, HydrateClient } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { SearchParams } from "nuqs";
import { Suspense } from "react";

type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
    const queryClient = getQueryClient();
    const searchParams = await props.searchParams;

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

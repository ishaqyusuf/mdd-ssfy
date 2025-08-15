import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables/inventory-categories/data-table";

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
        <FPage title="Category">
            {/* <InventoryTabSwitch path="/inventory" /> */}
            <HydrateClient>
                <ErrorBoundary errorComponent={ErrorFallback}>
                    <Suspense fallback={<TableSkeleton />}>
                        <DataTable />
                    </Suspense>
                </ErrorBoundary>
            </HydrateClient>
        </FPage>
    );
}


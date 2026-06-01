import { CategoryHeader } from "@/components/category-header";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables/inventory-categories/data-table";

import { TableSkeleton } from "@/components/tables/skeleton";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { loadInventoryFilterParams } from "@/hooks/use-inventory-filter-params";

export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
    const queryClient = getQueryClient();
    const searchParams = await props.searchParams;
    const filter = {
        productKind: "inventory" as const,
        ...loadInventoryFilterParams(searchParams),
    };

    await queryClient.fetchInfiniteQuery(
        trpc.inventories.inventoryCategories.infiniteQueryOptions(
            filter,
        ) as any,
    );

    return (
        <PageShell>
            <PageTitle>Category</PageTitle>
            {/* <InventoryTabSwitch path="/inventory" /> */}
            <HydrateClient>
                <div className="flex flex-col gap-6">
                    <CategoryHeader />
                    <ErrorBoundary errorComponent={ErrorFallback}>
                        <Suspense fallback={<TableSkeleton />}>
                            <DataTable />
                        </Suspense>
                    </ErrorBoundary>
                </div>
            </HydrateClient>
        </PageShell>
    );
}

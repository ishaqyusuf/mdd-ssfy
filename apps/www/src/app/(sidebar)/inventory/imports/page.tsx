import { ErrorFallback } from "@/components/error-fallback";
import { InventoryImportControlCenter } from "@/components/inventory/inventory-import-control-center";
import { InventoryImportControlCenterSkeleton } from "@/components/inventory/inventory-import-control-center-skeleton";

import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
    const queryClient = getQueryClient();
    await props.searchParams;
    await queryClient.fetchQuery(
        trpc.inventories.inventoryImports.queryOptions({
            size: 200,
            scope: "active",
        }),
    );

    return (
        <PageShell>
            <PageTitle>Inventory Imports</PageTitle>
            <HydrateClient>
                <ErrorBoundary errorComponent={ErrorFallback}>
                    <Suspense
                        fallback={<InventoryImportControlCenterSkeleton />}
                    >
                        <InventoryImportControlCenter />
                    </Suspense>
                </ErrorBoundary>
            </HydrateClient>
        </PageShell>
    );
}

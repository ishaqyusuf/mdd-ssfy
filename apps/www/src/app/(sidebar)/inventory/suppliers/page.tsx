import { ErrorFallback } from "@/components/error-fallback";
import { InventorySuppliersPage } from "@/components/inventory/inventory-suppliers-page";
import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";

export const dynamic = "force-dynamic";

export default async function Page() {
    const queryClient = getQueryClient();

    await queryClient.fetchQuery(
        trpc.inventories.inventorySuppliers.queryOptions({
            q: null,
        }),
    );

    return (
        <PageShell>
            <PageTitle>Suppliers</PageTitle>
            <HydrateClient>
                <ErrorBoundary errorComponent={ErrorFallback}>
                    <InventorySuppliersPage />
                </ErrorBoundary>
            </HydrateClient>
        </PageShell>
    );
}

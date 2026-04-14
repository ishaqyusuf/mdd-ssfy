import { ErrorFallback } from "@/components/error-fallback";
import { InventorySuppliersPage } from "@/components/inventory/inventory-suppliers-page";
import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { HydrateClient } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";

export default function Page() {
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

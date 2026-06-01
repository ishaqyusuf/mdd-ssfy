import { ErrorFallback } from "@/components/error-fallback";

import { TableSkeleton } from "@/components/tables/skeleton";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { InboundReceivingPage } from "@/components/inventory/inbound-receiving-page";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
    const queryClient = getQueryClient();
    await props.searchParams;
    const suppliersPromise = queryClient.fetchQuery(
        trpc.inventories.inboundSuppliers.queryOptions(),
    );
    const shipmentsPromise = queryClient.fetchQuery(
        trpc.inventories.inboundShipments.queryOptions({}),
    );
    const demandQueuePromise = queryClient.fetchQuery(
        trpc.inventories.inboundDemandQueue.queryOptions({}),
    );

    const shipments = await shipmentsPromise;
    const firstInboundId = shipments[0]?.id;
    const firstInboundPromises = firstInboundId
        ? [
              queryClient.fetchQuery(
                  trpc.inventories.inboundShipmentDetail.queryOptions({
                      inboundId: firstInboundId,
                  }),
              ),
              queryClient.fetchQuery(
                  trpc.inventories.inboundDocuments.queryOptions({
                      inboundId: firstInboundId,
                  }),
              ),
              queryClient.fetchQuery(
                  trpc.inventories.inboundExtractions.queryOptions({
                      inboundId: firstInboundId,
                  }),
              ),
              queryClient.fetchQuery(
                  trpc.inventories.inboundActivity.queryOptions({
                      inboundId: firstInboundId,
                  }),
              ),
          ]
        : [];

    await Promise.all([
        suppliersPromise,
        demandQueuePromise,
        ...firstInboundPromises,
    ]);

    return (
        <PageShell>
            <PageTitle>Inventory Inbounds</PageTitle>
            <HydrateClient>
                <ErrorBoundary errorComponent={ErrorFallback}>
                    <Suspense fallback={<TableSkeleton />}>
                        <InboundReceivingPage />
                    </Suspense>
                </ErrorBoundary>
            </HydrateClient>
        </PageShell>
    );
}

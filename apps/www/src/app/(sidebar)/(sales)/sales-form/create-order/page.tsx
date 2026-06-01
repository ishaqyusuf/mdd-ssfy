import { LazyNewSalesForm } from "@/components/forms/new-sales-form/lazy-new-sales-form";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { unstable_noStore } from "next/cache";

import PageShell from "@/components/page-shell";
import { normalizeSalesFormInitialCustomerId } from "@gnd/sales/sales-form";
import { PageTitle } from "@gnd/ui/custom/page-title";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return constructMetadata({
        title: "Create Order - gndprodesk.com",
    });
}

type Props = {
    searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
    unstable_noStore();
    const searchParams = await props.searchParams;
    const customerId = normalizeSalesFormInitialCustomerId(
        searchParams.selectedCustomerId,
    );

    return (
        <PageShell>
            <PageTitle>Create Order</PageTitle>
            <Suspense fallback={<SalesFormLoading />}>
                <PrefetchedCreateOrderForm customerId={customerId} />
            </Suspense>
        </PageShell>
    );
}

async function PrefetchedCreateOrderForm({
    customerId,
}: {
    customerId: number | null;
}) {
    const queryClient = getQueryClient();
    await queryClient.fetchQuery(
        trpc.newSalesForm.bootstrap.queryOptions({
            type: "order",
            customerId,
        }),
    );

    return (
        <HydrateClient>
            <LazyNewSalesForm mode="create" type="order" />
        </HydrateClient>
    );
}

function SalesFormLoading() {
    return (
        <div className="rounded-lg border p-8 text-sm text-muted-foreground">
            Loading sales form...
        </div>
    );
}

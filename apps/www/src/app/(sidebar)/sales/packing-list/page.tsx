import PageShell from "@/components/page-shell";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";

import { LazyPackingListClient } from "./lazy-packing-list-client";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

type Props = {
    searchParams: Promise<SearchParams>;
};

export default async function PackingListPage({ searchParams }: Props) {
    const params = await searchParams;
    const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
    const tab = rawTab === "completed" ? "completed" : "current";
    const queryClient = getQueryClient();

    await queryClient.fetchQuery(
        trpc.dispatch.packingList.queryOptions({
            tab,
        }),
    );

    return (
        <PageShell className="overflow-x-hidden p-3 sm:p-4 md:p-6">
            <HydrateClient>
                <PageTitle>Packing List</PageTitle>

                <LazyPackingListClient />
            </HydrateClient>
        </PageShell>
    );
}

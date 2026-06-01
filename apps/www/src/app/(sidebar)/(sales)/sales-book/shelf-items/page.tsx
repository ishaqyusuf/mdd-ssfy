import PageShell from "@/components/page-shell";
import { LazyShelfItemsManager } from "@/components/sales-book/lazy-shelf-items-manager";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export default async function Page() {
    const queryClient = getQueryClient();

    await Promise.all([
        queryClient.fetchQuery(
            trpc.salesShelfItems.listProducts.queryOptions({
                query: "",
                categoryId: null,
                status: "active",
                page: 1,
                limit: 50,
            }),
        ),
        queryClient.fetchQuery(
            trpc.salesShelfItems.listCategories.queryOptions({}),
        ),
    ]);

    return (
        <PageShell>
            <HydrateClient>
                <LazyShelfItemsManager />
            </HydrateClient>
        </PageShell>
    );
}

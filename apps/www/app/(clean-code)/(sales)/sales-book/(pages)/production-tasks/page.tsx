import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import { composeFilter } from "@/components/(clean-code)/data-table/filter-command/filters";
import { dataOptions } from "@/components/(clean-code)/data-table/query-options";
import { searchParamsCache } from "@/components/(clean-code)/data-table/search-params";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { __isProd } from "@/lib/is-prod-server";
import { getQueryClient } from "@/providers/get-query-client";

import ProductionTasksPageClient from "../_components/production-tasks-page-client";

export async function generateMetadata({}) {
    return constructMetadata({
        title: `Sales Production - gndprodesk.com`,
    });
}
export default async function SalesBookPage({ searchParams }) {
    const search = searchParamsCache.parse(searchParams);
    const queryClient = getQueryClient();
    const props = composeFilter(
        "production-tasks",
        // await getSalesPageQueryDataDta()
    );
    const { queryKey, filterFields } = props;
    await queryClient.prefetchInfiniteQuery(dataOptions(search, queryKey));
    return (
        <AuthGuard can={["viewProduction"]}>
            <FPage className="" title="Productions">
                <ProductionTasksPageClient
                    queryKey={queryKey}
                    filterFields={filterFields}
                />
            </FPage>
        </AuthGuard>
    );
}

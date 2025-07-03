import { dataOptions } from "@/components/(clean-code)/data-table/query-options";
import { searchParamsCache } from "@/components/(clean-code)/data-table/search-params";

import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import DeliveryPageClient from "../../_components/dispatch-page-client";
import { composeFilter } from "@/components/(clean-code)/data-table/filter-command/filters";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { getQueryClient } from "@/trpc/server";
export async function generateMetadata({}) {
    return constructMetadata({
        title: `Sales Dispatch - gndprodesk.com`,
    });
}
export default async function DispatchPage({ searchParams }) {
    // const search = searchParamsCache.parse(searchParams);
    // const queryClient = getQueryClient();
    // const props = composeFilter(
    //     "sales-dispatch",
    //     // await getSalesPageQueryDataDta()
    // );
    // const { queryKey, filterFields } = props;
    // await queryClient.prefetchInfiniteQuery(dataOptions(search, queryKey));
    return (
        <FPage can={["viewOrders"]} title="Sales Dispatch">
            <DeliveryPageClient
                queryKey={"sales-dispatch"}
                filterFields={[]}
                // queryKey={queryKey}
                // filterFields={filterFields}
            />
        </FPage>
    );
}

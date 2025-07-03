import Portal from "@/components/_v1/portal";
import { composeFilter } from "@/components/(clean-code)/data-table/filter-command/filters";
import { dataOptions } from "@/components/(clean-code)/data-table/query-options";
import { searchParamsCache } from "@/components/(clean-code)/data-table/search-params";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import NewFeatureBtn from "@/components/common/new-feature-btn";
import TablePage from "@/components/tables/table-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

import CustomersPageClient from "../_(pages)/_components/customers-page-client";

export async function generateMetadata({}) {
    return constructMetadata({
        title: `Customers - gndprodesk.com`,
    });
}
export default async function CustomersPage({ searchParams }) {
    // const search = searchParamsCache.parse(searchParams);
    // const queryClient = getQueryClient();
    // const props = composeFilter("customers");

    // await queryClient.prefetchInfiniteQuery(
    //     dataOptions(search, props.queryKey)
    // );

    return (
        <FPage className="" title="Customers">
            <Portal nodeId={"navRightSlot"}>
                <NewFeatureBtn href="/sales/customers">Old Site</NewFeatureBtn>
            </Portal>
            {/* <CustomersPageClient {...props} /> */}
            <TablePage
                PageClient={CustomersPageClient}
                searchParams={searchParams}
                filterKey="customers"
            />
        </FPage>
    );
}

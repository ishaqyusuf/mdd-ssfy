import FPage from "@/components/(clean-code)/fikr-ui/f-page";

import QuotesPageClient from "../../_components/quote-page-client";

import { composeFilter } from "@/components/(clean-code)/data-table/filter-command/filters";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import Portal from "@/components/_v1/portal";
import NewFeatureBtn from "@/components/common/new-feature-btn";
import TablePage from "@/components/tables/table-page";
import { getSalesPageQueryData } from "@/actions/cached-queries";

export async function generateMetadata({ params }) {
    return constructMetadata({
        title: `Quotes List - gndprodesk.com`,
    });
}
export default async function SalesBookQuotePage(props) {
    const searchParams = await props.searchParams;
    // const search = searchParamsCache.parse(searchParams);
    // const queryClient = getQueryClient();
    // const { queryKey, filterFields } = composeFilter("quotes");
    // await queryClient.prefetchInfiniteQuery(dataOptions(search, queryKey));
    const [queryData] = await Promise.all([
        getSalesPageQueryData({
            "sales.type": "quote",
        }),
    ]);
    return (
        <FPage can={["viewEstimates"]} title="Quotes">
            <TablePage
                queryData={queryData}
                PageClient={QuotesPageClient}
                searchParams={searchParams}
                filterKey="quotes"
            />
        </FPage>
    );
}

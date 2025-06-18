import { EmptyState, NoResults } from "./empty-states";
import { DataTable } from "./table";
import { hasQuery } from "@/utils/has-query";
import { getCustomerTransactionsAction } from "@/actions/get-customer-tx-action";
import { salesAccountingFilterData } from "@/actions/cached-sales-accounting";
import { getSalesResolutions } from "@/actions/get-sales-resolutions";
import { salesPaymentResoltionFilters } from "@/actions/cached-sales-payment-resolution";

const pageSize = 25;
export async function ResolutionCenter({ query }) {
    const filterDataPromise = salesPaymentResoltionFilters();

    const loadMore = async (params?) => {
        "use server";
        return getSalesResolutions({
            ...query,
            ...(params || {}),
        });
    };
    const { data, meta } = await getSalesResolutions({
        ...query,
    });
    const nextMeta = meta?.next;

    if (!data?.length) {
        if (hasQuery(query)) {
            return <NoResults />;
        }

        return <EmptyState />;
    }
    return (
        <DataTable
            filterDataPromise={filterDataPromise}
            data={data}
            loadMore={loadMore}
            pageSize={pageSize}
            nextMeta={nextMeta}
            count={meta?.count}
        />
    );
}

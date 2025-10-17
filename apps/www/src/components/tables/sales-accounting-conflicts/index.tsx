import { employeesFilterData } from "@/actions/cached-hrm";
import { EmptyState, NoResults } from "./empty-states";
import { DataTable } from "./table";
import { hasQuery } from "@/utils/has-query";
import { getCustomerTransactionsAction } from "@/actions/get-customer-tx-action";
import { salesAccountingFilterData } from "@/actions/cached-sales-accounting";

const pageSize = 25;
export async function SalesAccountingConflictsTable({ query }) {
    const filterDataPromise = salesAccountingFilterData();

    const loadMore = async (params?) => {
        "use server";
        return getCustomerTransactionsAction({
            ...query,
            ...(params || {}),
        });
    };
    const { data, meta } = await getCustomerTransactionsAction({
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
        />
    );
}

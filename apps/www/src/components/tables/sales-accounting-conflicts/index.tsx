import { EmptyState, NoResults } from "./empty-states";
import { DataTable } from "./table";
import { hasQuery } from "@/utils/has-query";
import { getCustomerTransactionsAction } from "@/actions/get-customer-tx-action";
import { salesAccountingFilterData } from "@/actions/cached-sales-accounting";

export async function SalesAccountingConflictsTable({ query }) {
    const filterDataPromise = salesAccountingFilterData();

    const { data } = await getCustomerTransactionsAction({
        ...query,
    });

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
        />
    );
}

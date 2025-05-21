import { employeesFilterData } from "@/actions/cached-hrm";
import { getEmployees } from "@/actions/get-employees";
import { EmptyState, NoResults } from "./empty-states";
import { DataTable } from "./table";
import { hasQuery } from "@/utils/has-query";

const pageSize = 25;
export async function EmployeesTable({ query }) {
    const filterDataPromise = employeesFilterData();

    const loadMore = async (params?) => {
        "use server";
        return getEmployees({
            ...query,
            ...(params || {}),
        });
    };

    const { data, meta } = await getEmployees({
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
            // page={page}
        />
    );
}

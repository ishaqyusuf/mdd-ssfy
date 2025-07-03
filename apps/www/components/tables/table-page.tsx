import { getQueryClient } from "@/trpc/server";
import {
    composeFilter,
    QueryKeys,
} from "../(clean-code)/data-table/filter-command/filters";
import { dataOptions } from "../(clean-code)/data-table/query-options";
import {
    FilterKeys,
    searchParamsCache,
} from "../(clean-code)/data-table/search-params";

export default async function TablePage({
    searchParams,
    filterKey,
    PageClient,
    queryData,
}: {
    PageClient;
    searchParams;
    filterKey: QueryKeys;
    queryData?: Partial<{ [k in FilterKeys]: any }>;
}) {
    const search = searchParamsCache.parse(searchParams);
    const queryClient = getQueryClient();
    // const props = composeFilter(filterKey, queryData);
    // const { queryKey, filterFields } = props;
    // await queryClient.prefetchInfiniteQuery(dataOptions(search, queryKey));
    // return <PageClient queryKey={queryKey} filterFields={filterFields} />;
    return <></>;
}

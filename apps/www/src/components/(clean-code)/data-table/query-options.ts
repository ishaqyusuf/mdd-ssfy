// import { ColumnSchema } from "./schema";
import { SearchParamsType, searchParamsSerializer } from "./search-params";
import { infiniteQueryOptions, keepPreviousData } from "@tanstack/react-query";
import { Percentile } from "@/lib/request/percentile";

export type InfiniteQueryMeta = {
    totalRowCount: number;
    filterRowCount: number;
    totalFilters; //: MakeArray<ColumnSchema>;
    currentPercentiles: Record<Percentile, number>;
};

export const dataOptions = (search, queryKey, rnd?) => {
    return infiniteQueryOptions({
        queryKey: [
            queryKey,
            searchParamsSerializer({ ...search, uuid: null }),
        ].filter(Boolean), // remove uuid as it would otherwise retrigger a fetch
        // staleTime: 30 * 1000,
        // refetchInterval: 10 * 1000,
        // staleTime: 0,
        queryFn: async ({ pageParam = 0 }) => {
            const start = (pageParam as number) * search.size;
            const serialize = searchParamsSerializer({ ...search, start });
            const response = await fetch(
                `/api/infinite/${queryKey}${serialize}`
                // { headers: { "Cache-Control": "no-cache" } }
            );
            return response.json();
        },
        initialPageParam: 0,
        getNextPageParam: (_lastGroup, groups) => groups.length,
        refetchOnWindowFocus: false,
        placeholderData: keepPreviousData,
    });
};

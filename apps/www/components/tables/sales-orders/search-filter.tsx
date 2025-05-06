"use client";

import { searchParamsParser } from "@/components/(clean-code)/data-table/search-params";
import { MiddaySearchFilter } from "@/components/midday-search-filter/search-filter";
import { useQueryStates } from "nuqs";

interface Props {
    filterFields?: {
        options?: {}[];
        type: string;
        value: string;
    }[];
    // params;
    // setParams;
}
const defaultSearch = {};
export function SalesOrdersFitler({
    filterFields,
    // params: filters,
    // setParams: setFilters,
}: Props) {
    const queryParams = Object.fromEntries(
        Object.entries(searchParamsParser).filter(([k, v]) =>
            filterFields?.find((a) => a?.value === k),
        ),
    );
    const [filters, setFilters] = useQueryStates(queryParams, {
        shallow: false,
    });
    return (
        <MiddaySearchFilter
            defaultSearch={defaultSearch}
            filters={filters}
            setFilters={setFilters}
            filterList={filterFields}
        />
    );
}

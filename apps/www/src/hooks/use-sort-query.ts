"use client";

import { useSortParams } from "@/hooks/use-sort-params";

export function useSortQuery() {
    const { params, setParams } = useSortParams();
    const [sortColumn, sortValue] = params.sort?.[0]?.split(".") ?? [];

    const createSortQuery = (field: string) => {
        const nextValue =
            sortColumn !== field ? "asc" : sortValue === "asc" ? "desc" : null;

        setParams({
            sort: nextValue ? [`${field}.${nextValue}`] : null,
        });
    };

    return {
        sortColumn,
        sortValue,
        createSortQuery,
    };
}

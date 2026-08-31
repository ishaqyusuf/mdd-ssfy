"use client";

import { useSortParams } from "@/hooks/use-sort-params";
import { useCallback } from "react";

export function useSortQuery() {
	const { params, setParams } = useSortParams();
	const [sortColumn, sortValue] = params.sort?.[0]?.split(".") ?? [];

	const createSortQuery = useCallback(
		(field: string, defaultDirection: "asc" | "desc" = "asc") => {
			const oppositeDirection = defaultDirection === "asc" ? "desc" : "asc";
			const nextValue =
				sortColumn !== field
					? defaultDirection
					: sortValue === defaultDirection
						? oppositeDirection
						: null;

			void setParams({
				sort: nextValue ? [`${field}.${nextValue}`] : null,
			});
		},
		[setParams, sortColumn, sortValue],
	);
	const setSortQuery = useCallback(
		(sort: string[] | null) => void setParams({ sort }),
		[setParams],
	);

	return {
		sort: params.sort,
		sortColumn,
		sortValue,
		createSortQuery,
		setSortQuery,
	};
}

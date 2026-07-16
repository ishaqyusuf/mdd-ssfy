"use client";

import { useSortParams } from "@/hooks/use-sort-params";

export function useSortQuery() {
	const { params, setParams } = useSortParams();
	const [sortColumn, sortValue] = params.sort?.[0]?.split(".") ?? [];

	const createSortQuery = (
		field: string,
		defaultDirection: "asc" | "desc" = "asc",
	) => {
		const oppositeDirection = defaultDirection === "asc" ? "desc" : "asc";
		const nextValue =
			sortColumn !== field
				? defaultDirection
				: sortValue === defaultDirection
					? oppositeDirection
					: null;

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

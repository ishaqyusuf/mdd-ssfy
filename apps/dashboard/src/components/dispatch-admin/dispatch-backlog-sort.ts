export type DispatchBacklogSort = "createdAt.asc" | "createdAt.desc";

export function normalizeDispatchBacklogSort(
	sort: string[] | null | undefined,
): [DispatchBacklogSort] {
	const value = sort?.[0];
	return [value === "createdAt.desc" ? value : "createdAt.asc"];
}

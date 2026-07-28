export function getClearableFilterUpdate({
	filters,
	lockedKeys,
	searchKey,
}: {
	filters: Record<string, unknown>;
	lockedKeys: ReadonlySet<string>;
	searchKey: string;
}) {
	return Object.fromEntries(
		Object.keys(filters)
			.filter((key) => key === searchKey || !lockedKeys.has(key))
			.map((key) => [key, null]),
	);
}

export function hasActiveSearchValue(prompt: string, searchValue: unknown) {
	return (
		prompt.length > 0 ||
		(typeof searchValue === "string" && searchValue.length > 0)
	);
}

type FilterMenuVisibilityInput = {
	filterList: readonly unknown[] | undefined;
	loading: boolean;
	nonSearchDefinitionCount: number;
};

export function shouldShowFilterMenu({
	filterList,
	loading,
	nonSearchDefinitionCount,
}: FilterMenuVisibilityInput) {
	return (
		filterList === undefined || loading || nonSearchDefinitionCount > 0
	);
}

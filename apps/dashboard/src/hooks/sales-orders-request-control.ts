export type CancelQueries = (options: {
	queryKey: readonly unknown[];
}) => Promise<unknown>;

export async function cancelSupersededSalesOrdersRequests({
	cancelQueries,
	listQueryKey,
	summaryQueryKey,
}: {
	cancelQueries: CancelQueries;
	listQueryKey: readonly unknown[];
	summaryQueryKey: readonly unknown[];
}) {
	await Promise.all([
		cancelQueries({ queryKey: listQueryKey }),
		cancelQueries({ queryKey: summaryQueryKey }),
	]);
}

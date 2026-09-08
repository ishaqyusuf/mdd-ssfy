import type { QueryClient, QueryKey } from "@tanstack/react-query";

export type TableRefreshReceipt<T> = {
	data: T;
	completedAt: number;
	entityIds: ReadonlySet<number>;
};

/** Only network refetch of the loaded window can prove a row's departure. */
export function observeTableRefresh<T>(
	client: QueryClient,
	queryKey: QueryKey,
	inspect: (data: T) => {
		pageCount: number;
		entityIds: readonly number[];
		exhausted?: boolean;
	},
) {
	let receipt: TableRefreshReceipt<T> | undefined;
	let loadedPages = 0;
	const listeners = new Set<() => void>();
	return {
		getSnapshot: () => receipt,
		subscribe(listener: () => void) {
			listeners.add(listener);
			const unsubscribe = client.getQueryCache().subscribe((event) => {
				if (
					event.type !== "updated" ||
					event.query !== client.getQueryCache().find({ queryKey, exact: true })
				)
					return;
				if (event.action.type === "fetch") {
					loadedPages = event.query.state.data
						? inspect(event.query.state.data as T).pageCount
						: 0;
				}
				if (
					event.action.type !== "success" ||
					event.action.manual ||
					!loadedPages
				)
					return;
				const meta = event.query.state.fetchMeta as {
					fetchMore?: unknown;
				} | null;
				if (meta?.fetchMore || !event.query.state.data) return;
				const data = event.query.state.data as T;
				const window = inspect(data);
				if (window.pageCount < loadedPages && !window.exhausted) return;
				receipt = {
					data,
					completedAt: Date.now(),
					entityIds: new Set(window.entityIds),
				};
				for (const notify of listeners) notify();
			});
			return () => {
				listeners.delete(listener);
				unsubscribe();
			};
		},
	};
}

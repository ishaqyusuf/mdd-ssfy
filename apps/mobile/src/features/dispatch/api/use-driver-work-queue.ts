import { _trpc } from "@/components/static-trpc";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { DispatchListItem } from "../types/dispatch.types";

type DriverWorkQueueFilter = RouterInputs["dispatch"]["driverWorkQueue"];

export function useDriverWorkQueue(
	filter: DriverWorkQueueFilter = {},
	options?: { summaryFilter?: DriverWorkQueueFilter },
) {
	const normalizedFilter = useMemo(
		() => ({ size: 20, ...filter }),
		[filter],
	);
	const queue = useInfiniteQuery(
		_trpc.dispatch.driverWorkQueue.infiniteQueryOptions(normalizedFilter, {
			getNextPageParam: (lastPage) => lastPage?.meta?.cursor,
		}),
	);
	const summary = useQuery(
		_trpc.dispatch.driverWorkQueueSummary.queryOptions({
			...(options?.summaryFilter ?? filter),
			size: undefined,
			cursor: undefined,
		}),
	);
	const items = useMemo(() => {
		const pages = queue.data?.pages as unknown as
			| Array<{ data?: DispatchListItem[] }>
			| undefined;
		return pages?.flatMap((page) => page.data ?? []) ?? [];
	}, [queue.data]);

	return { ...queue, items, summary: summary.data, summaryQuery: summary };
}

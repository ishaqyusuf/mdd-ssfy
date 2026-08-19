import { _trpc } from "@/components/static-trpc";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { DispatchListItem } from "../types/dispatch.types";

type DriverWorkQueueFilter = RouterInputs["dispatch"]["driverManifest"];

export function useDriverWorkQueue(
	filter: DriverWorkQueueFilter = {},
	_options?: { summaryFilter?: DriverWorkQueueFilter },
) {
	const normalizedFilter = useMemo(() => ({ size: 50, ...filter }), [filter]);
	const query = useInfiniteQuery(
		_trpc.dispatch.driverManifest.infiniteQueryOptions(normalizedFilter, {
			getNextPageParam: (lastPage) => lastPage.queue.meta?.cursor,
		}),
	);
	const items = useMemo(() => {
		const pages = query.data?.pages as unknown as
			| Array<{ queue?: { data?: DispatchListItem[] } }>
			| undefined;
		return pages?.flatMap((page) => page.queue?.data ?? []) ?? [];
	}, [query.data]);
	const firstPage = query.data?.pages[0];
	return {
		...query,
		items,
		summary: firstPage?.summary,
		nextStop: firstPage?.nextStop as DispatchListItem | null | undefined,
		summaryQuery: query,
	};
}

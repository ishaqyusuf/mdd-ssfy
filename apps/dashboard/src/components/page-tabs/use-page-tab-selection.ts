"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { usePathname, useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { parseAsString } from "nuqs/server";
import { useEffect, useMemo } from "react";
import { normalizePagePath } from "./query-utils";
import { getPageTabSelection } from "./render-utils";
import type { PageTabItem } from "./types";

type Options = {
	page?: string;
	tabs?: PageTabItem[];
	isReady?: boolean;
};

export function usePageTabSelection({ page, tabs, isReady }: Options = {}) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const trpc = useTRPC();
	const resolvedPage = normalizePagePath(page || pathname);
	const shouldFetch = tabs === undefined;
	const { data, isSuccess } = useQuery({
		enabled: shouldFetch,
		...trpc.pageTabs.list.queryOptions({ page: resolvedPage }),
	});
	const pageTabs = tabs ?? data ?? [];
	const ready = isReady ?? (tabs !== undefined || isSuccess);
	const [tabName, setTabName] = useQueryState(
		"tabName",
		parseAsString.withOptions({ history: "replace", shallow: true }),
	);
	const selection = useMemo(
		() =>
			ready
				? getPageTabSelection({
						tabName,
						currentQuery: searchParams.toString(),
						tabs: pageTabs,
					})
				: { matchingTabIndex: -1, lockedKeys: [] as string[] },
		[pageTabs, ready, searchParams, tabName],
	);

	useEffect(() => {
		if (!ready || !tabName || selection.matchingTabIndex >= 0) return;
		void setTabName(null);
	}, [ready, selection.matchingTabIndex, setTabName, tabName]);

	return {
		...selection,
		isReady: ready,
		lockedKeys: new Set(selection.lockedKeys),
		pageTabs,
		selectedTab:
			selection.matchingTabIndex >= 0
				? pageTabs[selection.matchingTabIndex]
				: undefined,
		tabName,
	};
}

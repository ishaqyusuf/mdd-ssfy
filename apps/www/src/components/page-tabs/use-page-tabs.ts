"use client";

import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@gnd/ui/tanstack";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { createPageTabsInvalidation } from "./invalidation";

export function usePageTabsInvalidation() {
	const pathname = usePathname();
	const queryClient = useQueryClient();
	const trpc = useTRPC();

	return useMemo(
		() =>
			createPageTabsInvalidation({
				queryClient,
				trpc,
				currentPath: pathname,
			}),
		[pathname, queryClient, trpc],
	);
}

export function usePageTabs() {
	return usePageTabsInvalidation();
}

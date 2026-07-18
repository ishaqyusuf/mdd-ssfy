"use client";

import { useTRPC } from "@/trpc/context";
import { useQueryClient } from "@gnd/ui/tanstack";
import { consoleLog } from "@gnd/utils";
import { useEffect, useMemo } from "react";
import { createTypedQueryInvalidation, executeQueryEvent } from "./executor";
import { publishQueryEvent, subscribeQueryEvents } from "./transport";

export function QueryEventsRuntime() {
	const queryClient = useQueryClient();
	const trpc = useTRPC();

	useEffect(
		() =>
			subscribeQueryEvents(async (event) => {
				const results = await executeQueryEvent({
					event,
					queryClient,
					trpc,
				});
				const failures = results.filter(
					(result) => result.status === "rejected",
				);

				if (failures.length) {
					consoleLog("Query event invalidation failed", {
						event: event.name,
						failures,
					});
				}
			}),
		[queryClient, trpc],
	);

	return null;
}

export function useQueryEvents() {
	return useMemo(
		() => ({
			emit: publishQueryEvent,
		}),
		[],
	);
}

export function useTypedQueryInvalidation() {
	const queryClient = useQueryClient();
	const trpc = useTRPC();

	return useMemo(
		() =>
			createTypedQueryInvalidation({
				queryClient,
				trpc,
			}),
		[queryClient, trpc],
	);
}

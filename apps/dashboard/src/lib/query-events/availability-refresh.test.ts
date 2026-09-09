import { expect, test } from "bun:test";
import type { AppRouter } from "@gnd/api/trpc/routers/_app";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { createTRPCOptionsProxy } from "@gnd/ui/tanstack";
import { executeQueryEvent } from "./executor";
import { triggerMutationQueryEvents } from "./mutation-trigger";
import { subscribeQueryEvents } from "./transport";

for (const route of [
	"markProductionMaterialsAvailable",
	"applyCoveredProductionMaterials",
] as const) {
	test(`${route} refetches active calendar, summary and material queries through event transport`, async () => {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false, staleTime: Infinity } },
		});
		const trpc = createTRPCOptionsProxy<AppRouter>({
			client: {} as never,
			queryClient,
		});
		const dates = { from: "2026-09-07", to: "2026-09-13" };
		const keys = [
			trpc.sales.productionSummary.queryKey({ q: "TEST" }),
			trpc.sales.productionCalendar.queryKey(dates),
			trpc.sales.productionCalendarTasks.queryKey(dates),
			trpc.sales.productionAvailability.queryKey({ salesOrderId: 123 }),
			trpc.sales.coveredProductionMaterials.queryKey({ salesOrderId: 123 }),
		];
		let databaseVersion = 1;
		const unsubscribe: Array<() => void> = [];
		try {
			for (const queryKey of keys) {
				const options = { queryKey, queryFn: async () => databaseVersion };
				await queryClient.fetchQuery(options);
				unsubscribe.push(
					new QueryObserver(queryClient, options).subscribe(() => {}),
				);
			}
			unsubscribe.push(
				subscribeQueryEvents((event) =>
					executeQueryEvent({ event, queryClient, trpc }),
				),
			);
			databaseVersion = 2;
			await triggerMutationQueryEvents({
				mutationKey: [["sales", route]],
				data: { salesOrderId: 123 },
				variables: { salesOrderId: 123 },
			});
			for (const key of keys) expect(queryClient.getQueryData(key)).toBe(2);
		} finally {
			for (const stop of unsubscribe) stop();
			queryClient.clear();
		}
	});
}

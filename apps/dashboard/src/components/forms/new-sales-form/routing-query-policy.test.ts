import { describe, expect, test } from "bun:test";
import { QueryClient, QueryObserver, queryOptions } from "@tanstack/react-query";
import {
	getRoutingStaleTime,
	routingNeedsRevisionRefresh,
} from "./routing-query-policy";

describe("sales routing revision reuse", () => {
	test("shell and later picker share one load; invalidation still refreshes", async () => {
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		let calls = 0;
		const options = queryOptions({
			queryKey: ["routing"],
			queryFn: async () => ({ revision: ++calls }),
			staleTime: (query) => getRoutingStaleTime(true, query.state.data),
		});
		const shell = new QueryObserver(client, options);
		const stopShell = shell.subscribe(() => {});
		await client.fetchQuery(options);
		const picker = new QueryObserver(client, options);
		const stopPicker = picker.subscribe(() => {});
		expect(calls).toBe(1);
		expect(picker.getCurrentResult().isFetching).toBe(false);
		expect(
			routingNeedsRevisionRefresh(picker.getCurrentResult().data, 1, true),
		).toBe(false);
		await client.invalidateQueries({ queryKey: options.queryKey });
		expect(calls).toBe(2);
		expect(picker.getCurrentResult().data?.revision).toBe(2);
		stopPicker();
		stopShell();
		client.clear();
	});

	test("consumers without a revision observer refresh after one minute", async () => {
		const client = new QueryClient();
		const options = queryOptions({
			queryKey: ["routing"],
			queryFn: async () => ({ revision: 2 }),
			staleTime: (query) => getRoutingStaleTime(true, query.state.data),
		});
		client.setQueryData(options.queryKey, { revision: 1 }, {
			updatedAt: Date.now() - 60_001,
		});
		expect((await client.fetchQuery(options)).revision).toBe(2);
		client.clear();
	});

	test("retained and late-arriving older routes require refresh", () => {
		expect(routingNeedsRevisionRefresh({ revision: 4 }, 5, true)).toBe(true);
		expect(routingNeedsRevisionRefresh(undefined, 5, true)).toBe(false);
		expect(routingNeedsRevisionRefresh({ revision: 4 }, 5, false)).toBe(true);
		expect(routingNeedsRevisionRefresh({ revision: 5 }, 5, false)).toBe(false);
		expect(routingNeedsRevisionRefresh({ revision: 6 }, 5, false)).toBe(false);
	});

	test("cache-off and untagged server responses refetch on later consumption", async () => {
		for (const [enabled, data] of [
			[false, { revision: 1 }],
			[true, {}],
		] as const) {
			const client = new QueryClient();
			let calls = 0;
			const options = queryOptions({
				queryKey: ["routing"],
				queryFn: async () => {
					calls++;
					return data;
				},
				staleTime: (query) => getRoutingStaleTime(enabled, query.state.data),
			});
			await client.fetchQuery(options);
			await client.fetchQuery(options);
			expect(calls).toBe(2);
			client.clear();
		}
		expect(routingNeedsRevisionRefresh({}, 5, true)).toBe(true);
		expect(routingNeedsRevisionRefresh({}, 5, false)).toBe(false);
	});
});

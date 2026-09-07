import { describe, expect, it } from "bun:test";
import { QueryClient } from "@tanstack/react-query";

import { cancelSupersededSalesOrdersRequests } from "./sales-orders-request-control";

describe("Sales Orders request cancellation", () => {
	it("cancels both list and summary work before a filter transition", async () => {
		const cancelledQueryKeys: Array<readonly unknown[]> = [];
		const listQueryKey = [["sales", "getOrders"]] as const;
		const summaryQueryKey = [["sales", "getOrdersSummary"]] as const;

		await cancelSupersededSalesOrdersRequests({
			cancelQueries: async ({ queryKey }) => {
				cancelledQueryKeys.push(queryKey);
			},
			listQueryKey,
			summaryQueryKey,
		});

		expect(cancelledQueryKeys).toEqual([listQueryKey, summaryQueryKey]);
	});

	it("deduplicates the initial list and summary and aborts both before transition", async () => {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		const listQueryKey = [["sales", "getOrders"], { q: "APA" }] as const;
		const summaryQueryKey = [
			["sales", "getOrdersSummary"],
			{ q: "APA" },
		] as const;
		let listRequestCount = 0;
		let summaryRequestCount = 0;
		let listAborted = false;
		let summaryAborted = false;
		const waitForAbort = (
			signal: AbortSignal,
			onAbort: () => void,
		): Promise<never> =>
			new Promise((_resolve, reject) => {
				signal.addEventListener(
					"abort",
					() => {
						onAbort();
						reject(new Error("aborted"));
					},
					{ once: true },
				);
			});
		const listOptions = {
			queryKey: listQueryKey,
			initialPageParam: null,
			queryFn: ({ signal }: { signal: AbortSignal }) => {
				listRequestCount += 1;
				return waitForAbort(signal, () => {
					listAborted = true;
				});
			},
		};
		const summaryOptions = {
			queryKey: summaryQueryKey,
			queryFn: ({ signal }: { signal: AbortSignal }) => {
				summaryRequestCount += 1;
				return waitForAbort(signal, () => {
					summaryAborted = true;
				});
			},
		};

		const pendingRequests = [
			queryClient.fetchInfiniteQuery(listOptions).catch(() => undefined),
			queryClient.fetchInfiniteQuery(listOptions).catch(() => undefined),
			queryClient.fetchQuery(summaryOptions).catch(() => undefined),
			queryClient.fetchQuery(summaryOptions).catch(() => undefined),
		];
		await Promise.resolve();

		expect(listRequestCount).toBe(1);
		expect(summaryRequestCount).toBe(1);

		await cancelSupersededSalesOrdersRequests({
			cancelQueries: (options) => queryClient.cancelQueries(options),
			listQueryKey: [["sales", "getOrders"]],
			summaryQueryKey: [["sales", "getOrdersSummary"]],
		});
		await Promise.all(pendingRequests);

		expect(listAborted).toBe(true);
		expect(summaryAborted).toBe(true);
	});
});

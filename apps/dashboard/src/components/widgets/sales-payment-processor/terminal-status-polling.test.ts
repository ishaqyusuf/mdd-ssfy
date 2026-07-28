import { describe, expect, it } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import {
	fetchFreshTerminalPaymentStatus,
	getCompletedTerminalSaleReferences,
} from "./terminal-status-polling";

describe("fetchFreshTerminalPaymentStatus", () => {
	it("bypasses the dashboard query cache while a terminal checkout is pending", async () => {
		const queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					staleTime: 60_000,
				},
			},
		});
		const statuses = ["PENDING", "CANCELED"] as const;
		let requestCount = 0;
		const queryOptions = {
			queryKey: ["terminal-checkout", "checkout-1"],
			queryFn: async () => ({
				status: statuses[Math.min(requestCount++, statuses.length - 1)],
			}),
		};

		const pending = await fetchFreshTerminalPaymentStatus(
			queryClient,
			queryOptions,
		);
		const canceled = await fetchFreshTerminalPaymentStatus(
			queryClient,
			queryOptions,
		);

		expect(pending.status).toBe("PENDING");
		expect(canceled.status).toBe("CANCELED");
		expect(requestCount).toBe(2);
	});
});

describe("getCompletedTerminalSaleReferences", () => {
	it("rebuilds selected sale ids and order numbers for terminal completion", () => {
		expect(
			getCompletedTerminalSaleReferences(
				[
					{ id: 10, selected: true },
					{ id: 11, selected: false },
				],
				[
					{ id: 10, orderId: "ORD-10" },
					{ id: 11, orderId: "ORD-11" },
				],
			),
		).toEqual({
			salesIds: [10],
			orderNos: ["ORD-10"],
		});
	});
});

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { invalidateInboundStatusQueries } from "./inbound-status-invalidation";

function createInvalidationContext() {
	const invalidated: (readonly unknown[])[] = [];
	const queryClient = {
		invalidateQueries: async ({
			queryKey,
		}: {
			queryKey: readonly unknown[];
		}) => {
			invalidated.push(queryKey);
		},
	};
	const path = (name: string) => ({
		pathKey: () => [name],
	});
	const trpc = {
		sales: {
			getOrders: path("sales.getOrders"),
			getSaleOverview: path("sales.getSaleOverview"),
			inboundSummary: path("sales.inboundSummary"),
			inboundIndex: path("sales.inboundIndex"),
		},
		inventories: {
			salesInventoryOverview: path("inventories.salesInventoryOverview"),
			inboundDemandQueue: path("inventories.inboundDemandQueue"),
			inboundStatusDemandReconciliation: path(
				"inventories.inboundStatusDemandReconciliation",
			),
		},
		notes: {
			activityTree: path("notes.activityTree"),
		},
	};

	return { invalidated, queryClient, trpc };
}

describe("inbound status query invalidation", () => {
	it("runs the shared invalidation contract after the modal mutation succeeds", () => {
		const currentDir = dirname(fileURLToPath(import.meta.url));
		const modalSource = readFileSync(
			resolve(currentDir, "inbound-status-modal.tsx"),
			"utf8",
		);
		const successHandler = modalSource.match(
			/onSuccess:\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\},\n\s*onError/,
		)?.[1];

		expect(
			successHandler?.includes(
				"invalidateInboundStatusQueries(queryClient, trpc)",
			),
		).toBe(true);
	});

	it("refreshes the Sales Activity tree and Sales Inventory overview with existing inbound reads", () => {
		const { invalidated, queryClient, trpc } = createInvalidationContext();

		invalidateInboundStatusQueries(queryClient, trpc);

		expect(invalidated).toEqual([
			["sales.getOrders"],
			["sales.getSaleOverview"],
			["sales.inboundSummary"],
			["sales.inboundIndex"],
			["inventories.salesInventoryOverview"],
			["inventories.inboundDemandQueue"],
			["inventories.inboundStatusDemandReconciliation"],
			["notes.activityTree"],
		]);
	});
});

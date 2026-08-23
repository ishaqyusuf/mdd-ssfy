import { describe, expect, it } from "bun:test";

import { completeSalesDispatchBatch } from "./sales-mark-as-completed-domain";

describe("atomic batch sales completion", () => {
	it("checks every pending report under lock before any lifecycle side effect", async () => {
		const calls: string[] = [];
		const tx = {
			$queryRaw: async () => {
				calls.push("lock");
				return [{ id: 41 }];
			},
			salesPackingReport: {
				count: async () => {
					calls.push("hold");
					return 1;
				},
			},
			salesOrders: {
				findUnique: async () => ({
					deliveryOption: "delivery",
					deliveries: [{ id: 41, status: "packed" }],
				}),
			},
			qtyControl: {
				updateMany: async () => calls.push("qty-control"),
			},
			orderDelivery: {
				updateMany: async () => calls.push("dispatch-completed"),
			},
		};
		const db = {
			$transaction: async (
				fn: (client: typeof tx) => Promise<unknown>,
				_options: unknown,
			) => fn(tx),
		};
		const resetSales = async () => calls.push("reset");
		const syncLifecycle = async () => calls.push("lifecycle");

		let error: unknown;
		try {
			await completeSalesDispatchBatch(
				db as unknown as Parameters<typeof completeSalesDispatchBatch>[0],
				91,
				{ resetSales, syncLifecycle },
			);
		} catch (caught) {
			error = caught;
		}
		expect(String(error).includes("awaiting packing report review")).toBe(true);
		expect(calls).toEqual(["lock", "hold"]);
	});
});

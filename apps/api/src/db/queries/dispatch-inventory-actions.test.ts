import { describe, expect, mock, test } from "bun:test";

import {
	buildDispatchInventoryAllocationSelections,
	prepareAndPickDispatchInventory,
} from "./dispatch-inventory-actions";

describe("buildDispatchInventoryAllocationSelections", () => {
	test("selects exact quantities without binding stock needed by another trip", () => {
		const result = buildDispatchInventoryAllocationSelections([
			{
				salesItemId: 1,
				components: [
					{
						id: 10,
						required: true,
						requiredQty: 3,
						allocations: [{ id: 4, qty: 1, status: "reserved" }],
						availableAllocations: [{ id: 5, qty: 5 }],
					},
				],
			},
		]);

		expect(result).toEqual({
			selections: [{ allocationId: 5, qty: 2 }],
			blockingComponents: [],
		});
	});

	test("reports shortages before mutating any allocation", () => {
		const result = buildDispatchInventoryAllocationSelections([
			{
				salesItemId: 1,
				components: [
					{
						id: 10,
						required: true,
						requiredQty: 3,
						allocations: [],
						availableAllocations: [{ id: 5, qty: 1 }],
					},
				],
			},
		]);

		expect(result.blockingComponents).toEqual([
			{ componentId: 10, missingQty: 2 },
		]);
	});
});

describe("prepareAndPickDispatchInventory transaction boundary", () => {
	test("locks and rechecks the pending-report hold before any packing mutation", async () => {
		const calls: string[] = [];
		const tx = {
			$queryRaw: mock(async () => {
				calls.push("dispatch-lock");
				return [{ id: 41 }];
			}),
			salesPackingReport: {
				count: mock(async () => {
					calls.push("pending-report-hold");
					return 1;
				}),
			},
			orderDelivery: {
				findFirst: mock(async () => {
					calls.push("delivery");
					return { id: 41, status: "queue" };
				}),
			},
			orderItemDelivery: {
				findMany: mock(async () => []),
				create: mock(async () => {
					calls.push("canonical-pack");
				}),
			},
		};
		const transactionOptions: unknown[] = [];
		const db = {
			$transaction: async (
				callback: (client: typeof tx) => unknown,
				options: unknown,
			) => {
				transactionOptions.push(options);
				return callback(tx);
			},
		};

		await expect(
			prepareAndPickDispatchInventory(db as never, {
				salesOrderId: 91,
				orderDeliveryId: 41,
				items: [{ salesItemId: 81, qty: 1 }],
			}),
		).rejects.toThrow("awaiting packing report review");

		expect(calls).toEqual(["dispatch-lock", "pending-report-hold"]);
		expect(tx.orderDelivery.findFirst).not.toHaveBeenCalled();
		expect(tx.orderItemDelivery.create).not.toHaveBeenCalled();
		expect(transactionOptions).toEqual([
			expect.objectContaining({ isolationLevel: "Serializable" }),
		]);
	});

	test("rolls canonical packing and inventory transitions back together", async () => {
		const state = {
			canonicalRows: [] as Array<Record<string, unknown>>,
			allocation: {
				id: 801,
				qty: 1,
				status: "approved",
				orderDeliveryId: null as number | null,
			},
		};
		const calls: string[] = [];
		let allocationReadCount = 0;
		const tx = {
			$queryRaw: mock(async () => {
				calls.push("dispatch-lock");
				return [{ id: 41 }];
			}),
			salesPackingReport: {
				count: mock(async () => {
					calls.push("pending-report-hold");
					return 0;
				}),
			},
			orderDelivery: {
				findFirst: mock(async () => ({ id: 41, status: "queue" })),
				updateMany: mock(async () => ({ count: 1 })),
				findMany: mock(async () => []),
			},
			orderItemDelivery: {
				findMany: mock(async () => state.canonicalRows),
				create: mock(async ({ data }: { data: Record<string, unknown> }) => {
					calls.push("canonical-pack");
					state.canonicalRows.push(data);
					return { id: 701 };
				}),
			},
			lineItem: {
				findMany: mock(async () => [
					{
						id: 501,
						uid: "line-501",
						title: "Door",
						qty: 1,
						updatedAt: new Date("2026-08-23T10:00:00Z"),
						salesItemId: 81,
						inventoryId: 901,
						inventoryVariantId: 902,
						inventory: { name: "Door inventory" },
						variant: { sku: "DOOR-1", description: "Door" },
						components: [
							{
								id: 601,
								required: true,
								qty: 1,
								inventoryId: 901,
								inventoryVariantId: 902,
								inventory: { name: "Door inventory" },
								inventoryVariant: { sku: "DOOR-1", description: "Door" },
								stockAllocations: [{ ...state.allocation }],
								inboundDemands: [],
							},
						],
					},
				]),
			},
			stockAllocation: {
				findMany: mock(async () => {
					allocationReadCount += 1;
					if (allocationReadCount === 2) {
						calls.push("pick");
						throw new Error("PICK_FAILED");
					}
					calls.push("assign");
					return [
						{
							...state.allocation,
							inventoryStockId: 1001,
							inventoryVariantId: 902,
							lineItemComponentId: 601,
							notes: null,
							lineItemComponent: {
								parent: { sale: { status: "Open", prodStatus: null } },
							},
						},
					];
				}),
				updateMany: mock(
					async ({ data }: { data: Record<string, unknown> }) => {
						state.allocation.status = String(data.status);
						state.allocation.orderDeliveryId = Number(data.orderDeliveryId);
						return { count: 1 };
					},
				),
				create: mock(async () => ({ id: 802 })),
			},
			lineItemComponents: {
				findFirst: mock(async () => ({
					id: 601,
					qty: 1,
					stockAllocations: [{ qty: 1 }],
					inboundDemands: [],
				})),
				updateMany: mock(async () => ({ count: 1 })),
			},
		};
		const db = {
			$transaction: async (callback: (client: typeof tx) => unknown) => {
				const before = {
					canonicalRows: [...state.canonicalRows],
					allocation: { ...state.allocation },
				};
				try {
					return await callback(tx);
				} catch (error) {
					state.canonicalRows = before.canonicalRows;
					state.allocation = before.allocation;
					throw error;
				}
			},
		};

		await expect(
			prepareAndPickDispatchInventory(db as never, {
				salesOrderId: 91,
				orderDeliveryId: 41,
				items: [{ salesItemId: 81, qty: 1 }],
			}),
		).rejects.toThrow("PICK_FAILED");

		expect(calls).toEqual([
			"dispatch-lock",
			"pending-report-hold",
			"canonical-pack",
			"assign",
			"pick",
		]);
		expect(state).toEqual({
			canonicalRows: [],
			allocation: {
				id: 801,
				qty: 1,
				status: "approved",
				orderDeliveryId: null,
			},
		});
		expect(tx.orderDelivery.updateMany).not.toHaveBeenCalled();
	});
});

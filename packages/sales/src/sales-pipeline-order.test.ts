import { describe, expect, it } from "bun:test";
import {
	getSalesPipelineSnapshots,
	resolveSalesPipelineSnapshotFromOrder,
} from "./sales-pipeline-order";

function order(overrides: Record<string, unknown> = {}) {
	return {
		id: 42,
		orderId: "09502PC",
		status: "open",
		prodStatus: null,
		deletedAt: null,
		archivedAt: null,
		grandTotal: 1_000,
		amountDue: 0,
		updatedAt: new Date("2026-09-02T12:00:00.000Z"),
		inventoryProjection: null,
		stat: [],
		completionRecords: [],
		itemControls: [
			{
				produceable: true,
				shippable: true,
				qtyControls: [{ type: "qty", total: 5, itemTotal: 5, qty: 5 }],
			},
		],
		assignments: [],
		deliveries: [],
		...overrides,
	} as never;
}

describe("resolveSalesPipelineSnapshotFromOrder", () => {
	it("builds identical canonical presentation data for every order consumer", () => {
		const snapshot = resolveSalesPipelineSnapshotFromOrder(order());
		expect(snapshot.headline.code).toBe("awaiting_production");
		expect(snapshot.production.requiredQty).toBe(5);
		expect(snapshot.fulfillment.requiredQty).toBe(5);
		expect(snapshot.revision).toHaveLength(64);
	});

	it("does not promote a legacy completed Dispatch without proof", () => {
		const snapshot = resolveSalesPipelineSnapshotFromOrder(
			order({
				deliveries: [
					{
						id: 9,
						status: "completed",
						meta: null,
						dueDate: null,
						driverId: 2,
						items: [{ qty: 5 }],
						_count: { stockAllocations: 0 },
					},
				],
			}),
		);
		expect(snapshot.fulfillment.state).not.toBe("fulfilled");
		expect(snapshot.conflicts).toContainEqual(
			expect.objectContaining({ code: "FULFILLMENT_PROOF_INCOMPLETE" }),
		);
	});

	it("ignores a cancelled predecessor when a replacement Dispatch proves fulfillment", () => {
		const snapshot = resolveSalesPipelineSnapshotFromOrder(
			order({
				deliveries: [
					{
						id: 8,
						status: "cancelled",
						meta: null,
						dueDate: null,
						driverId: null,
						updatedAt: new Date("2026-09-01T10:00:00.000Z"),
						items: [
							{
								id: 80,
								qty: 5,
								updatedAt: new Date("2026-09-01T10:00:00.000Z"),
							},
						],
						_count: { stockAllocations: 0 },
					},
					{
						id: 9,
						status: "completed",
						meta: {
							dispatchCompletion: { status: "completed" },
							inventoryDispatch: { status: "consumed" },
						},
						dueDate: null,
						driverId: 2,
						updatedAt: new Date("2026-09-02T10:00:00.000Z"),
						items: [
							{
								id: 90,
								qty: 5,
								updatedAt: new Date("2026-09-02T10:00:00.000Z"),
							},
						],
						_count: { stockAllocations: 1 },
					},
				],
			}),
		);

		expect(snapshot.fulfillment.state).toBe("fulfilled");
		expect(snapshot.fulfillment.dispatchIds).toEqual([9]);
	});
});

describe("getSalesPipelineSnapshots", () => {
	it("loads report-sized status inputs in bounded batches", async () => {
		const batches: number[][] = [];
		const db = {
			salesOrders: {
				findMany: async ({ where }: { where: { id: { in: number[] } } }) => {
					batches.push(where.id.in);
					return [];
				},
			},
		};

		await getSalesPipelineSnapshots(
			db as never,
			Array.from({ length: 251 }, (_, index) => index + 1),
		);

		expect(batches.map((batch) => batch.length)).toEqual([250, 1]);
	});
});

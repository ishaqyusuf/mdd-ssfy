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
	it("loads independent evidence concurrently without changing the canonical snapshot", async () => {
		const sources = [42, 43].map((id) => order({
			id,
			assignments: [{
				id: id * 10, assignedToId: id, qtyAssigned: id === 42 ? 1 : 3,
				qtyCompleted: 0, dueDate: null, assignedAt: null, completedAt: null,
				updatedAt: new Date("2026-09-02T12:00:00Z"), submissions: [],
			}],
			deliveries: [{
				id: id * 20, status: "queue", meta: {}, dueDate: null, driverId: null,
				updatedAt: new Date("2026-09-02T12:00:00Z"),
				items: [{ id: id * 30, qty: id === 42 ? 1 : 2 }],
				_count: { stockAllocations: 0 },
			}],
		})) as Array<Record<string, unknown>>;
		let started = 0;
		const db = {
			salesOrders: {
				findMany: async ({ select }: { select: Record<string, unknown> }) => {
					started += 1;
					await Promise.resolve();
					if (started !== 4) throw new Error("Evidence reads were serialized");
					const rows = select.assignments ? sources.toReversed() : sources;
					return rows.map((source) => Object.fromEntries(Object.keys(select).map((key) => [key, source[key]])));
				},
			},
		};

		const snapshots = await getSalesPipelineSnapshots(db as never, [42, 43]);
		for (const source of sources) {
			expect(snapshots.get(Number(source.id))).toEqual(resolveSalesPipelineSnapshotFromOrder(source as never));
		}
		expect(snapshots.get(42)?.production.requiredQty).toBe(5);
		expect(snapshots.get(42)?.production.assignedQty).toBe(1);
		expect(snapshots.get(43)?.production.assignedQty).toBe(3);
	});

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

		expect(batches.map((batch) => batch.length)).toEqual([250, 250, 250, 250, 1, 1, 1, 1]);
	});

	it.each(["grandTotal", "itemControls", "assignments", "deliveries"])("rejects missing %s evidence instead of manufacturing an empty stage", async (relation) => {
		const source = order() as Record<string, unknown>;
		const db = {
			salesOrders: {
				findMany: async ({ select }: { select: Record<string, unknown> }) =>
					select[relation] ? [] : [Object.fromEntries(Object.keys(select).map((key) => [key, source[key]]))],
			},
		};
		await expect(getSalesPipelineSnapshots(db as never, [42])).rejects.toThrow(
			"Sales Pipeline evidence changed while loading order 42.",
		);
	});
});

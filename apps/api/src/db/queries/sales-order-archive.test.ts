import { describe, expect, test } from "bun:test";
import { setSalesOrdersArchivedSchema } from "@api/schemas/sales";

import { setSalesOrdersArchived } from "./sales-order-archive";

function buildContext() {
	const rows = new Map([
		[
			1,
			{
				id: 1,
				orderId: "10001AA",
				type: "order",
				deletedAt: null,
				archivedAt: null,
			},
		],
		[
			2,
			{
				id: 2,
				orderId: "10002AA",
				type: "order",
				deletedAt: null,
				archivedAt: new Date("2026-09-01T12:00:00.000Z"),
			},
		],
		[
			3,
			{
				id: 3,
				orderId: "10003AA",
				type: "order",
				deletedAt: new Date(),
				archivedAt: null,
			},
		],
	]);
	const calls: Array<{ name: string; payload: unknown }> = [];
	const tx = {
		salesOrders: {
			findMany: async ({ where }: { where: { id: { in: number[] } } }) =>
				where.id.in.map((id) => rows.get(id)).filter(Boolean),
			updateMany: async ({
				where,
				data,
			}: { where: { id: number }; data: { archivedAt: Date | null } }) => {
				const row = rows.get(where.id);
				if (
					!row ||
					row.deletedAt ||
					(data.archivedAt ? row.archivedAt : !row.archivedAt)
				)
					return { count: 0 };
				row.archivedAt = data.archivedAt;
				calls.push({
					name: "salesOrders.updateMany",
					payload: { where, data },
				});
				return { count: 1 };
			},
		},
		salesHistory: {
			create: async (payload: unknown) => {
				calls.push({ name: "salesHistory.create", payload });
				return { id: "history" };
			},
		},
	};

	return {
		calls,
		ctx: {
			userId: 9,
			db: {
				$transaction: async (callback: (client: typeof tx) => unknown) =>
					callback(tx),
			},
		} as Parameters<typeof setSalesOrdersArchived>[0],
	};
}

describe("setSalesOrdersArchived", () => {
	test("rejects duplicate selection IDs at the public command boundary", () => {
		expect(() =>
			setSalesOrdersArchivedSchema.parse({
				salesIds: [1, 1],
				archived: true,
			}),
		).toThrow("Each Sales Order can only be selected once.");
	});

	test("archives active orders atomically, audits changes, and reports idempotent skips", async () => {
		const { ctx, calls } = buildContext();

		await expect(
			setSalesOrdersArchived(ctx, { salesIds: [1, 2, 3, 404], archived: true }),
		).resolves.toEqual({
			changed: [1],
			skipped: [
				{ salesId: 2, reason: "already_archived" },
				{ salesId: 3, reason: "deleted" },
				{ salesId: 404, reason: "missing" },
			],
		});
		expect(calls.filter((call) => call.name === "salesHistory.create")).toEqual(
			[
				expect.objectContaining({
					name: "salesHistory.create",
					payload: expect.objectContaining({
						data: expect.objectContaining({
							data: expect.objectContaining({
								type: "sales_order_archived",
								triggeredByUserId: 9,
							}),
						}),
					}),
				}),
			],
		);
	});

	test("restores archived orders and records restore evidence", async () => {
		const { ctx, calls } = buildContext();

		await expect(
			setSalesOrdersArchived(ctx, { salesIds: [2], archived: false }),
		).resolves.toEqual({ changed: [2], skipped: [] });
		expect(calls).toContainEqual(
			expect.objectContaining({
				name: "salesHistory.create",
				payload: expect.objectContaining({
					data: expect.objectContaining({
						data: expect.objectContaining({
							type: "sales_order_restored",
						}),
					}),
				}),
			}),
		);
	});
});

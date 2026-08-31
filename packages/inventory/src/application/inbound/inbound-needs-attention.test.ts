import { describe, expect, test } from "bun:test";

import {
	countReceivedInboundNeedsAttention,
	listReceivedInboundNeedsAttention,
	repairReceivedInboundNeedsForSalesOrder,
} from "./inbound-needs-attention";

describe("listReceivedInboundNeedsAttention", () => {
	test("returns normalized rows selected by the canonical attention query", async () => {
		const queries: string[] = [];
		const result = await listReceivedInboundNeedsAttention(
			{
				$queryRaw: async (query: { sql: string }) => {
					queries.push(query.sql);
					return [
						{
							inboundId: 70,
							status: "completed",
							createdAt: new Date("2026-07-16T10:00:00.000Z"),
							receivedAt: new Date("2026-07-17T10:00:00.000Z"),
							reference: "PO-70",
							linkedNeedCount: BigInt(2),
							appliedQty: 1,
							capacityQty: 5,
						},
					];
				},
			} as never,
			{ take: 100 },
		);

		expect(result).toEqual([
			{
				inboundId: 70,
				status: "completed",
				createdAt: new Date("2026-07-16T10:00:00.000Z"),
				receivedAt: new Date("2026-07-17T10:00:00.000Z"),
				reference: "PO-70",
				linkedNeedCount: 2,
				appliedQty: 1,
				capacityQty: 5,
			},
		]);
		expect(queries[0]).toContain("lineItem.deletedAt IS NULL");
		expect(queries[0]).toContain("sale.deletedAt IS NULL");
		expect(queries[0]?.indexOf("HAVING capacityQty > appliedQty")).toBeLessThan(
			queries[0]?.indexOf("LIMIT") ?? -1,
		);
	});

	test("counts the same canonical attention candidate query", async () => {
		const queries: string[] = [];
		const count = await countReceivedInboundNeedsAttention({
			$queryRaw: async (query: { sql: string }) => {
				queries.push(query.sql);
				return [{ count: BigInt(4) }];
			},
		} as never);

		expect(count).toBe(4);
		expect(queries[0]).toContain("SELECT COUNT(*) AS count");
		expect(queries[0]).toContain("HAVING capacityQty > appliedQty");
	});

	test("scopes received inbound attention to one sales order", async () => {
		const queries: Array<{ sql: string; values: unknown[] }> = [];
		await listReceivedInboundNeedsAttention(
			{
				$queryRaw: async (query: { sql: string; values: unknown[] }) => {
					queries.push(query);
					return [];
				},
			} as never,
			{ salesOrderId: 42, take: 20 },
		);

		expect(queries[0]?.sql).toContain("sale.id = ?");
		expect(queries[0]?.sql).toContain("allDemandTotals.appliedQty");
		expect(queries[0]?.sql).toContain(
			"scopedDemandTotals.linkedQty - scopedDemandTotals.appliedQty",
		);
		expect(queries[0]?.sql).toContain("FROM (");
		expect(queries[0]?.sql).toContain("attention.receivedAt");
		expect(queries[0]?.sql).toContain("attention.createdAt");
		expect(queries[0]?.sql).toContain("attention.inboundId");
		expect(queries[0]?.sql).not.toContain(
			"ORDER BY COALESCE(receivedAt, createdAt)",
		);
		expect(queries[0]?.values).toContain(42);
	});

	test("repairs every received inbound pending application for one order", async () => {
		const applyInputs: unknown[] = [];
		const listInputs: unknown[] = [];
		const result = await repairReceivedInboundNeedsForSalesOrder(
			{} as never,
			{ salesOrderId: 42, actorUserId: 9 },
			{
				listAttention: async (_db, listInput) => {
					listInputs.push(listInput);
					return [
						{
							inboundId: 70,
							status: "completed",
							createdAt: new Date("2026-07-16T10:00:00.000Z"),
							receivedAt: new Date("2026-07-17T10:00:00.000Z"),
							reference: "PO-70",
							linkedNeedCount: 2,
							appliedQty: 0,
							capacityQty: 2,
						},
					];
				},
				applyNeeds: async (_db, input) => {
					applyInputs.push(input);
					return {
						inboundId: input.inboundId,
						operation: "apply" as const,
						changed: true,
						updatedDemandCount: 2,
						recomputedComponentCount: 2,
						affectedSalesOrderIds: [42],
						applicationEventId: 170,
					};
				},
			},
		);

		expect(listInputs).toEqual([{ salesOrderId: 42 }]);
		expect(applyInputs).toEqual([
			{
				inboundId: 70,
				actorUserId: 9,
				prioritizeSalesOrderId: 42,
			},
		]);
		expect(result).toEqual({
			inboundIds: [70],
			changedCount: 1,
			updatedDemandCount: 2,
			recomputedComponentCount: 2,
			affectedSalesOrderIds: [42],
		});
	});
});

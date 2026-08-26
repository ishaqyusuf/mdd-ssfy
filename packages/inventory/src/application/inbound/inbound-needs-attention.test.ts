import { describe, expect, test } from "bun:test";

import {
	countReceivedInboundNeedsAttention,
	listReceivedInboundNeedsAttention,
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
});

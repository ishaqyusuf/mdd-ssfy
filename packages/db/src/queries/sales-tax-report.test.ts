// @ts-expect-error packages/db typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";

import { listSalesTaxReportOrders } from "./sales-tax-report";

describe("listSalesTaxReportOrders", () => {
	it("applies the complete order scope, deterministic ordering, and overflow row", async () => {
		let capturedArgs: unknown;
		const db = {
			salesOrders: {
				findMany: async (args: unknown) => {
					capturedArgs = args;
					return [];
				},
			},
		} as unknown as Parameters<typeof listSalesTaxReportOrders>[0];

		await listSalesTaxReportOrders(db, {
			from: new Date("2026-03-01T05:00:00.000Z"),
			toExclusive: new Date("2026-04-01T04:00:00.000Z"),
			limit: 10_000,
		});

		expect(capturedArgs).toMatchObject({
			where: {
				deletedAt: null,
				type: "order",
				createdAt: {
					gte: new Date("2026-03-01T05:00:00.000Z"),
					lt: new Date("2026-04-01T04:00:00.000Z"),
				},
			},
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
			take: 10_001,
		});
	});
});

// @ts-expect-error packages/db typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";

import { listSalesTaxReportEntries } from "./sales-tax-report";

describe("listSalesTaxReportEntries", () => {
	it("filters by taxable-sale recognition time with deterministic ordering", async () => {
		let capturedArgs: unknown;
		const db = {
			salesTaxLedgerEntry: {
				findMany: async (args: unknown) => {
					capturedArgs = args;
					return [];
				},
			},
		} as unknown as Parameters<typeof listSalesTaxReportEntries>[0];

		await listSalesTaxReportEntries(db, {
			from: new Date("2026-03-01T05:00:00.000Z"),
			toExclusive: new Date("2026-04-01T04:00:00.000Z"),
			limit: 10_000,
		});

		expect(capturedArgs).toMatchObject({
			where: {
				recognizedAt: {
					gte: new Date("2026-03-01T05:00:00.000Z"),
					lt: new Date("2026-04-01T04:00:00.000Z"),
				},
				entryType: { in: ["SALE", "ADJUSTMENT", "REVERSAL"] },
			},
			orderBy: [{ recognizedAt: "asc" }, { id: "asc" }],
			take: 10_001,
		});
		expect(JSON.stringify(capturedArgs)).not.toContain("amountDue");
		expect(JSON.stringify(capturedArgs)).not.toContain("createdAt");
	});
});

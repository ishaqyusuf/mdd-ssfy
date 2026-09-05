import { describe, expect, it } from "bun:test";
import type { Db, Prisma } from "@gnd/db";
import { getCanonicalSalesPipelineCohortIds } from "./sales-pipeline-rollout-query";

describe("Sales Pipeline database rollout boundary", () => {
	it.each([
		{ mode: "legacy", percent: "100", expected: [] },
		{ mode: "shadow", percent: "100", expected: [] },
		{ mode: "canonical", percent: "0", expected: [] },
		{ mode: "canonical", percent: "invalid", expected: [] },
		{ mode: "canonical", percent: "100", expected: null },
	])("does not enumerate orders for an all-or-none rollout: %j", async ({ mode, percent, expected }) => {
		const db = { $queryRaw: async () => { throw new Error("Unexpected cohort enumeration"); } };
		expect(await getCanonicalSalesPipelineCohortIds(db as unknown as Db, {
			SALES_PIPELINE_READ_MODE: mode,
			SALES_PIPELINE_COHORT_PERCENT: percent,
		})).toEqual(expected);
	});

	it("reads only selected order IDs in bounded keyset pages", async () => {
		const pages = [Array.from({ length: 250 }, (_, index) => ({ id: index + 1 })), [{ id: 1001 }]];
		const queries: Prisma.Sql[] = [];
		const db = {
			$queryRaw: async (query: Prisma.Sql) => {
				queries.push(query);
				return pages[queries.length - 1];
			},
		};
		const result = await getCanonicalSalesPipelineCohortIds(db as unknown as Db, {
			SALES_PIPELINE_READ_MODE: "canonical", SALES_PIPELINE_COHORT_PERCENT: "5",
		});
		expect(result).toHaveLength(251);
		expect(result?.at(-1)).toBe(1001);
		expect(queries).toHaveLength(2);
		for (const query of queries) {
			expect(query.sql).toContain("ORDER BY id ASC LIMIT 250");
			expect(query.sql).toContain("deletedAt IS NULL");
			expect(query.sql).toContain("type = 'order'");
			expect(query.sql).toContain("MOD(ABS(MOD(");
			expect(query.sql).toContain("+ 2147483648, 4294967296) - 2147483648), 100)");
		}
		expect(queries[0]?.values).toEqual([0, 2654435761, 5]);
		expect(queries[1]?.values).toEqual([250, 2654435761, 5]);
	});
});

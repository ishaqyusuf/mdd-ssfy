import { expect, it } from "bun:test";
import { db as fieldSource, type Db } from "@gnd/db";
import { getSalesProductionSummary } from "./sales-production";

it("does not load completed quantity evidence but preserves fallback and review membership", async () => {
	const previousMode = process.env.SALES_PIPELINE_READ_MODE;
	process.env.SALES_PIPELINE_READ_MODE = "legacy";
	const row = (
		orderId: number,
		qtyAssigned: number | null,
		qtyCompleted: number | null,
		lhQty = 0,
		reviewStatus?: string,
	) => ({
		orderId,
		qtyAssigned,
		qtyCompleted,
		lhQty,
		rhQty: 0,
		completedAt: null,
		submissions: reviewStatus
			? [
					{
						qty: 2,
						lhQty: 0,
						rhQty: 0,
						materialReview: { status: reviewStatus },
					},
				]
			: [],
	});
	const rows = [
		row(1, 2, 2), // Scalar completion alone closes this assignment.
		row(2, 2, 1), // Partial completion remains open.
		row(3, null, null, 2), // Legacy handed quantity remains open.
		row(4, 0, 0, 2), // Explicit zero also falls back to handed quantity.
		row(5, 2, 0, 0, "PENDING"), // Review-gated submission is not completion.
		row(6, 2, 0, 0, "APPROVED"), // Finalized submission closes the assignment.
		row(7, -1, 0), // Invalid/non-positive requirement is not open.
		row(8, 2, 3), // Over-completion is also closed.
		row(9, 2, null), // SQL NULL completion must not drop a positive requirement.
	];
	type Predicate = {
		AND?: Predicate[];
		OR?: Predicate[];
		id?: { in?: number[] };
		qtyAssigned?: { lte?: number; lt?: unknown } | null;
		qtyCompleted?: { lte?: number; lt?: unknown } | null;
	};
	// Database seam: emulate only the scalar predicate under test. Independent
	// literal membership below exercises the actual package completion resolver.
	const matches = (value: (typeof rows)[number], where: Predicate): boolean => {
		if (
			where.AND &&
			!where.AND.every((part: Predicate) => matches(value, part))
		)
			return false;
		if (where.OR && !where.OR.some((part: Predicate) => matches(value, part)))
			return false;
		for (const key of ["qtyAssigned", "qtyCompleted"] as const) {
			const rule = where[key];
			if (rule === undefined) continue;
			if (rule === null) {
				if (value[key] !== null) return false;
				continue;
			}
			if (value[key] === null) return false;
			if (rule.lte !== undefined && value[key]! > rule.lte) return false;
			if (rule.lt !== undefined) {
				expect(rule.lt).toMatchObject({
					modelName: "OrderItemProductionAssignments",
					name: "qtyAssigned",
					typeName: "Int",
				});
				if (value.qtyAssigned === null || value[key]! >= value.qtyAssigned)
					return false;
			}
		}
		return true;
	};
	const detailOrderIds: number[][] = [];
	const db = {
		orderItemProductionAssignments: {
			fields: fieldSource.orderItemProductionAssignments.fields,
			findMany: async ({ where }: { where: Predicate }) => {
				const selected = rows.filter((value) => matches(value, where));
				detailOrderIds.push(selected.map((value) => value.orderId));
				return selected;
			},
		},
		salesOrders: {
			count: async ({ where }: { where: Predicate }) => {
				const ids = where.AND?.find((part: Predicate) => part.id?.in)?.id?.in;
				if (!ids) return 0;
				expect(ids).toEqual([2, 3, 4, 5, 9]);
				return ids.length;
			},
		},
		salesProductionSubmissionMaterialReview: { findMany: async () => [] },
	};
	try {
		const result = await getSalesProductionSummary(db as unknown as Db, {});
		expect(result.summary.pastDueCount).toBe(5);
		expect(detailOrderIds).toHaveLength(5);
		for (const ids of detailOrderIds) {
			expect(ids).not.toContain(1);
			expect(ids).not.toContain(8);
			expect(ids).toEqual([2, 3, 4, 5, 6, 7, 9]);
		}
	} finally {
		if (previousMode === undefined) delete process.env.SALES_PIPELINE_READ_MODE;
		else process.env.SALES_PIPELINE_READ_MODE = previousMode;
	}
});

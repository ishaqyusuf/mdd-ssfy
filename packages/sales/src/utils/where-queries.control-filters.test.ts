import { describe, expect, it } from "bun:test";
import { whereSales } from "./where-queries";

function toClauses(where: any) {
	if (!where) return [];
	return Array.isArray(where.AND) ? where.AND : [where];
}

describe("whereSales qtyControl filters", () => {
	it("builds production completed filter from qtyControl predicates", () => {
		const where = whereSales({
			production: "completed",
		} as any);
		const clauses = toClauses(where);
		const json = JSON.stringify(clauses);

		expect(json).toContain('"itemControls"');
		expect(json).toContain('"qtyControls"');
		expect(json).toContain('"type":"prodCompleted"');
		expect(json).toContain('"percentage":100');
		expect(json).not.toContain("salesStat");
	});

	it("builds dispatch backorder filter from dispatchCompleted percentage range", () => {
		const where = whereSales({
			"dispatch.status": "backorder",
		} as any);
		const clauses = toClauses(where);
		const json = JSON.stringify(clauses);

		expect(json).toContain('"type":"dispatchCompleted"');
		expect(json).toContain('"percentage":{"gt":0}');
		expect(json).toContain('"percentage":{"lt":100}');
		expect(json).not.toContain("salesStat");
	});

	it("default search composes pending dispatch, production, and payment due branches", () => {
		const where = whereSales({
			defaultSearch: true,
		} as any);
		const clauses = toClauses(where);
		const json = JSON.stringify(clauses);

		expect(json).toContain('"OR"');
		expect(json).toContain('"amountDue":{"gt":0}');
		expect(json).toContain('"type":"dispatchCompleted"');
		expect(json).toContain('"type":"prodCompleted"');
	});

	it("switches to salesStat predicates when control filter v2 flag is disabled", () => {
		const prev = process.env.CONTROL_FILTER_V2;
		process.env.CONTROL_FILTER_V2 = "0";
		try {
			const where = whereSales({
				"dispatch.status": "completed",
			} as any);
			const json = JSON.stringify(toClauses(where));

			expect(json).toContain('"stat"');
			expect(json).toContain('"type":"dispatchCompleted"');
			expect(json).not.toContain('"qtyControls"');
		} finally {
			process.env.CONTROL_FILTER_V2 = prev;
		}
	});
});

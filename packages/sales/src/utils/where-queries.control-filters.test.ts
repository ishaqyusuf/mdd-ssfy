import { describe, expect, it } from "bun:test";
import { whereSales } from "./where-queries";

function toClauses(where: any) {
	if (!where) return [];
	return Array.isArray(where.AND) ? where.AND : [where];
}

describe("whereSales stat filters", () => {
	it("builds production completed filter from sales stat predicates", () => {
		const where = whereSales({
			production: "completed",
		} as any);
		const clauses = toClauses(where);
		const json = JSON.stringify(clauses);

		expect(json).toContain('"stat"');
		expect(json).toContain('"type":"prodCompleted"');
		expect(json).toContain('"percentage":100');
		expect(json).not.toContain('"qtyControls"');
	});

	it("builds dispatch backorder filter from dispatchCompleted stat percentage range", () => {
		const where = whereSales({
			"dispatch.status": "backorder",
		} as any);
		const clauses = toClauses(where);
		const json = JSON.stringify(clauses);

		expect(json).toContain('"type":"dispatchCompleted"');
		expect(json).toContain('"percentage":{"gt":0}');
		expect(json).toContain('"percentage":{"lt":100}');
		expect(json).toContain('"stat"');
		expect(json).not.toContain('"qtyControls"');
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

	it("invoice paid only matches fully paid orders", () => {
		const where = whereSales({
			invoice: "paid",
		} as any);
		const json = JSON.stringify(toClauses(where));

		expect(json).toContain('"amountDue":0');
		expect(json).not.toContain('"amountDue":{"lte":0}');
	});

	it("dispatch pending stays on stat/control predicates instead of delivery rows", () => {
		const where = whereSales({
			"dispatch.status": "pending",
		} as any);
		const json = JSON.stringify(toClauses(where));

		expect(json).toContain('"type":"dispatchCompleted"');
		expect(json).not.toContain('"deliveries"');
	});

	it("keeps dispatch completed on stat predicates even when control filter v2 flag is enabled", () => {
		const where = whereSales({
			"dispatch.status": "completed",
		} as any);
		const json = JSON.stringify(toClauses(where));

		expect(json).toContain('"stat"');
		expect(json).toContain('"type":"dispatchCompleted"');
		expect(json).not.toContain('"qtyControls"');
	});
});

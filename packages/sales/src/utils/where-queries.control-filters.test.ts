import { describe, expect, it } from "bun:test";
import { salesQueryParamsSchema } from "../schema";
import { whereSales } from "./where-queries";

function toClauses(where: any) {
	if (!where) return [];
	return Array.isArray(where.AND) ? where.AND : [where];
}

describe("whereSales stat filters", () => {
	it("searches customer, billing, and shipping address text", () => {
		const where = whereSales({
			q: "123 Main",
		} as any);
		const json = JSON.stringify(toClauses(where));

		expect(json).toContain('"customer"');
		expect(json).toContain('"address":{"contains":"123 Main"}');
		expect(json).toContain('"billingAddress"');
		expect(json).toContain('"shippingAddress"');
		expect(json).toContain('"address1":{"contains":"123 Main"}');
		expect(json).toContain('"address2":{"contains":"123 Main"}');
		expect(json).toContain('"city":{"contains":"123 Main"}');
		expect(json).toContain('"state":{"contains":"123 Main"}');
	});

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

	it("builds past due production filter from prodCompleted instead of dispatchCompleted", () => {
		const where = whereSales({
			"production.status": "past due",
		} as any);
		const json = JSON.stringify(toClauses(where));

		expect(json).toContain('"type":"prodCompleted"');
		expect(json).not.toContain('"type":"dispatchCompleted"');
		expect(json).toContain('"dueDate":{"lt":');
	});

	it("treats normal priority as NORMAL or legacy null", () => {
		const where = whereSales({
			"sales.priority": "NORMAL",
		} as any);
		const json = JSON.stringify(toClauses(where));

		expect(json).toContain('"priority":null');
		expect(json).toContain('"priority":"NORMAL"');
	});

	it("filters non-normal priorities exactly", () => {
		const where = whereSales({
			"sales.priority": "CRITICAL",
		} as any);
		const json = JSON.stringify(toClauses(where));

		expect(json).toContain('"priority":"CRITICAL"');
		expect(json).not.toContain('"priority":null');
	});

	it("accepts valid sales has filters and rejects invalid values", () => {
		expect(
			salesQueryParamsSchema.safeParse({ has: "shelf-items" }).success,
		).toBe(true);
		expect(salesQueryParamsSchema.safeParse({ has: "unknown" }).success).toBe(
			false,
		);
	});

	it("builds has services filter from item type signals", () => {
		const where = whereSales({
			has: "services",
		} as any);
		const json = JSON.stringify(toClauses(where));

		expect(json).toContain('"items"');
		expect(json).toContain('"formSteps"');
		expect(json).toContain('"value":"Services"');
		expect(json).toContain('"dykeDescription":{"contains":"Services"}');
	});

	it("builds has moulding filter from molding and item type signals", () => {
		const where = whereSales({
			has: "moulding",
		} as any);
		const json = JSON.stringify(toClauses(where));

		expect(json).toContain('"housePackageTool"');
		expect(json).toContain('"moldingId":{"not":null}');
		expect(json).toContain('"doorType":"Moulding"');
		expect(json).toContain('"value":"Moulding"');
	});

	it("builds has shelf items filter from shelf rows and item type signals", () => {
		const where = whereSales({
			has: "shelf-items",
		} as any);
		const json = JSON.stringify(toClauses(where));

		expect(json).toContain('"shelfItems"');
		expect(json).toContain('"deletedAt":null');
		expect(json).toContain('"value":"Shelf Items"');
	});

	it("builds has interior filter from house package and item type signals", () => {
		const where = whereSales({
			has: "interior",
		} as any);
		const json = JSON.stringify(toClauses(where));

		expect(json).toContain('"housePackageTool"');
		expect(json).toContain('"doorType":"Interior"');
		expect(json).toContain('"salesDoors"');
		expect(json).toContain('"value":"Interior"');
	});

	it("builds has exterior filter from house package and item type signals", () => {
		const where = whereSales({
			has: "exterior",
		} as any);
		const json = JSON.stringify(toClauses(where));

		expect(json).toContain('"housePackageTool"');
		expect(json).toContain('"doorType":"Exterior"');
		expect(json).toContain('"salesDoors"');
		expect(json).toContain('"value":"Exterior"');
	});
});

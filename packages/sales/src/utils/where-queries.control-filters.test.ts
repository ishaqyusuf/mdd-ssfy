import { describe, expect, it } from "bun:test";
import { getProductionQueueBoundaries } from "../production-date";
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
		expect(json).toContain('"qtyControls"');
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
		const clauses = toClauses(where);
		const json = JSON.stringify(toClauses(where));
		const pastDueClause = clauses.find(
			(clause) => clause.assignments?.some?.dueDate?.lt,
		);

		expect(json).toContain('"type":"prodCompleted"');
		expect(json).not.toContain('"type":"dispatchCompleted"');
		expect(json).toContain('"dueDate":{"lt":');
		expect(pastDueClause?.assignments.some.dueDate.lt).toEqual(
			getProductionQueueBoundaries().pastDue.lt,
		);
	});

	it("builds future production from tomorrow forward for the assigned worker", () => {
		const where = whereSales({
			"production.assignedToId": 17,
			"production.status": "future",
		} as any);
		const clauses = toClauses(where);
		const futureClause = clauses.find(
			(clause) => clause.assignments?.some?.dueDate?.gte,
		);

		expect(futureClause?.assignments.some.assignedToId).toBe(17);
		expect(futureClause?.assignments.some.dueDate.gte).toEqual(
			getProductionQueueBoundaries().future.gte,
		);
	});

	it("builds unscheduled production from undated assignments for the assigned worker", () => {
		const where = whereSales({
			"production.assignedToId": 17,
			"production.status": "unscheduled",
		} as any);
		const clauses = toClauses(where);
		const unscheduledClause = clauses.find(
			(clause) => clause.assignments?.some?.dueDate === null,
		);

		expect(unscheduledClause?.assignments.some.assignedToId).toBe(17);
		expect(unscheduledClause?.assignments.some.deletedAt).toBeNull();
		expect(JSON.stringify(unscheduledClause)).toContain(
			'"type":"prodCompleted"',
		);
	});

	it("keeps exact production dates aligned with the assigned-worker due queue", () => {
		const where = whereSales({
			production: "pending",
			productionDueDate: "2026-08-21",
			"production.assignedToId": 17,
		} as any);
		const json = JSON.stringify(toClauses(where));

		expect(json).toContain('"assignedToId":17');
		expect(json).toContain('"dueDate":{"gte":"2026-08-21T00:00:00.000Z"');
		expect(json).not.toContain('"itemControl":{"qtyControls"');
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

	it("filters dealership and office sales by dealer ownership", () => {
		expect(
			salesQueryParamsSchema.safeParse({ salesChannel: "dealership" }).success,
		).toBe(true);
		expect(
			JSON.stringify(toClauses(whereSales({ salesChannel: "dealership" }))),
		).toContain('"dealerAuthId":{"gt":0}');
		expect(
			JSON.stringify(toClauses(whereSales({ salesChannel: "office" }))),
		).toContain('"OR":[{"dealerAuthId":null},{"dealerAuthId":0}]');
	});

	it("accepts supported inbound filters and rejects cancelled shipments", () => {
		expect(
			salesQueryParamsSchema.safeParse({ inbound: "PENDING ORDER" }).success,
		).toBe(true);
		expect(
			salesQueryParamsSchema.safeParse({ inbound: "in_progress" }).success,
		).toBe(true);
		expect(salesQueryParamsSchema.safeParse({ inbound: "none" }).success).toBe(
			true,
		);
		expect(
			salesQueryParamsSchema.safeParse({ inbound: "cancelled" }).success,
		).toBe(false);
	});

	it("filters manual inbound statuses only when inventory does not own inbound", () => {
		const where = whereSales({
			inbound: "PENDING ORDER",
		});
		const json = JSON.stringify(toClauses(where));

		expect(json).toContain('"inventoryStatus":"PENDING ORDER"');
		expect(json).toContain('"lineItems":{"none"');
		expect(json).toContain('"inboundDemands":{"some"');
		expect(json).toContain('"status":{"not":"cancelled"}');
	});

	it("filters inventory-owned inbound shipment statuses through active demand links", () => {
		const where = whereSales({
			inbound: "in_progress",
		});
		const json = JSON.stringify(toClauses(where));

		expect(json).toContain('"lineItems":{"some"');
		expect(json).toContain('"inboundDemands":{"some"');
		expect(json).toContain(
			'"inbound":{"deletedAt":null,"status":"in_progress"}',
		);
		expect(json).not.toContain('"inventoryStatus":"in_progress"');
	});

	it("filters orders with no displayed inbound status", () => {
		const where = whereSales({
			inbound: "none",
		});
		const json = JSON.stringify(toClauses(where));

		expect(json).toContain('"inventoryStatus":null');
		expect(json).toContain('"lineItems":{"none"');
	});

	it("supports Special Order scope and status filters", () => {
		expect(
			salesQueryParamsSchema.safeParse({
				specialOrderScope: "special_orders",
			}).success,
		).toBe(true);
		expect(
			salesQueryParamsSchema.safeParse({ specialOrder: "not_signed" }).success,
		).toBe(true);
		expect(
			salesQueryParamsSchema.safeParse({ specialOrder: "unknown" }).success,
		).toBe(false);
		expect(
			JSON.stringify(
				toClauses(whereSales({ specialOrderScope: "special_orders" })),
			),
		).toContain('"specialOrderDeclaration":"YES"');
		expect(
			JSON.stringify(toClauses(whereSales({ specialOrder: "signed" }))),
		).toContain('"specialOrderStatus":"CUSTOMER_APPROVED"');
		expect(
			JSON.stringify(toClauses(whereSales({ specialOrder: "not_signed" }))),
		).toContain('"specialOrderStatus":{"not":"CUSTOMER_APPROVED"}');
	});

	it("derives expired Special Orders from the active request expiry", () => {
		const json = JSON.stringify(
			toClauses(whereSales({ specialOrder: "expired" })),
		);

		expect(json).toContain('"specialOrderDeclaration":"YES"');
		expect(json).toContain('"specialOrderRequests":{"some"');
		expect(json).toContain('"status":"ACTIVE"');
		expect(json).toContain('"expiresAt":{"lte"');
	});

	it("maps each focused Special Order lifecycle filter", () => {
		for (const [filter, status] of [
			["signature_pending", "SIGNATURE_PENDING"],
			["reapproval_required", "REAPPROVAL_REQUIRED"],
			["declined", "CUSTOMER_DECLINED"],
		] as const) {
			const json = JSON.stringify(
				toClauses(whereSales({ specialOrder: filter })),
			);
			expect(json).toContain(`"specialOrderStatus":"${status}"`);
			expect(json).toContain('"specialOrderDeclaration":"YES"');
		}
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

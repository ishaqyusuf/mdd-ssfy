import { describe, expect, test } from "bun:test";
import {
	type AssistantToolActor,
	type AssistantToolServices,
	discoverAssistantTools,
	executeRegisteredAssistantTool,
} from "./registry";

const actor: AssistantToolActor = {
	userId: 42,
	scopeType: "organization",
	scopeId: "7",
	grants: { viewOrders: true, viewCustomers: true },
};

const order = {
	id: 101,
	orderNo: "09502PC",
	type: "order",
	title: "Kitchen",
	customerId: 9,
	customerName: "Ada Millwork",
	salesRepName: "Sales Rep",
	status: "active",
	productionStatus: "in progress",
	inventoryStatus: "pending",
	invoiceStatus: "unpaid",
	deliveryOption: "delivery",
	priority: "NORMAL",
	grandTotal: "1234.56",
	amountDue: "34.56",
	orderedQuantity: "3.5",
	builtQuantity: "1",
	createdAt: "2026-09-01T00:00:00.000Z",
	updatedAt: "2026-09-02T00:00:00.000Z",
	archived: false,
	revision: "order-revision-1",
};

const detailedOrder = {
	...order,
	pipeline: {
		version: "sales-pipeline/v2",
		revision: "pipeline-revision-1",
		freshness: {
			state: "current" as const,
			observedAt: "2026-09-02T00:00:00.000Z",
		},
		headline: { code: "in_production", label: "In production", tone: "blue" },
		payment: { state: "partially_paid", total: "1234.56", amountDue: "34.56" },
		material: { state: "pending", requiredQuantity: "3.5", readyQuantity: "1" },
		production: {
			state: "in_production",
			requiredQuantity: "3.5",
			completedQuantity: "1",
		},
		fulfillment: {
			state: "backlog",
			requiredQuantity: "3.5",
			deliveredQuantity: "0",
		},
		packing: { state: "pending" },
		dispatch: { state: "none" },
		blockers: [
			{
				code: "payment_due",
				dimension: "payment",
				label: "Payment remains due.",
			},
			{
				code: "production_pending",
				dimension: "production",
				label: "Production is in progress.",
			},
		],
		conflicts: [],
	},
	deliveries: [
		{
			id: 11,
			status: "pending",
			mode: "delivery",
			dueAt: "2026-09-10T00:00:00.000Z",
			deliveredAt: null,
			updatedAt: "2026-09-02T00:00:00.000Z",
		},
	],
	payments: [{ amount: "1200", status: "success", reviewStatus: "approved" }],
	statistics: [
		{
			type: "production",
			status: "in progress",
			total: "3.5",
			percentage: "29",
		},
	],
};

function services(
	overrides: Partial<AssistantToolServices>,
): Partial<AssistantToolServices> {
	return overrides;
}

describe("assistant Sales and customer tools", () => {
	test("discovers the seven implemented reads only when their grants are present", () => {
		const ids = discoverAssistantTools(actor).map((tool) => tool.toolId);
		expect(ids).toContain("sales_find_orders");
		expect(ids).toContain("sales_get_order_status");
		expect(ids).toContain("sales_explain_blockers");
		expect(ids).toContain("sales_get_timeline");
		expect(ids).toContain("customers_find");
		expect(ids).toContain("customers_get_summary");
		expect(ids).toContain("customers_get_order_history");
		expect(
			discoverAssistantTools({ ...actor, grants: {} }).map(
				(tool) => tool.toolId,
			),
		).toEqual(["system_explain_capability", "system_search_tools"]);
		const customerOnly = discoverAssistantTools({
			...actor,
			grants: { viewCustomers: true },
		}).map((tool) => tool.toolId);
		expect(customerOnly).toContain("customers_find");
		expect(customerOnly).not.toContain("customers_get_summary");
		expect(customerOnly).not.toContain("customers_get_order_history");
	});

	test("returns bounded order search results with entity and next-action hints", async () => {
		const result = await executeRegisteredAssistantTool(
			actor,
			{
				toolId: "sales_find_orders",
				version: 1,
				input: { query: "Ada", limit: 10 },
			},
			services({
				findSalesOrders: async () => ({ items: [order], nextCursor: null }),
			}),
		);

		expect(result).toMatchObject({
			status: "success",
			data: { items: [{ orderNo: "09502PC" }], nextCursor: null },
			entities: [{ kind: "order", id: "09502PC" }],
			allowedNextActions: [
				{ toolId: "sales_get_order_status", toolVersion: 1 },
			],
		});
	});

	test("does not suggest order-backed customer actions without order access", async () => {
		const customerOnlyActor = {
			...actor,
			grants: { viewCustomers: true },
		};
		const result = await executeRegisteredAssistantTool(
			customerOnlyActor,
			{
				toolId: "customers_find",
				version: 1,
				input: { query: "Ada", limit: 10 },
			},
			services({
				findCustomers: async () => ({
					items: [
						{
							id: 9,
							accountNo: "cust-9",
							name: "Ada Millwork",
							profile: "Builder",
							createdAt: "2026-01-01T00:00:00.000Z",
							updatedAt: "2026-09-01T00:00:00.000Z",
							revision: "customer-revision-1",
						},
					],
					nextCursor: null,
				}),
			}),
		);

		expect(result.allowedNextActions).toEqual([]);
	});

	test("asks for an order or quote choice instead of guessing duplicate numbers", async () => {
		const result = await executeRegisteredAssistantTool(
			actor,
			{
				toolId: "sales_get_order_status",
				version: 1,
				input: { orderNo: "09502PC" },
			},
			services({
				getSalesOrderCandidates: async () => [
					detailedOrder,
					{ ...detailedOrder, id: 102, type: "quote", revision: "quote-1" },
				],
			}),
		);

		expect(result.status).toBe("requires_input");
		expect(result.data).toMatchObject({
			order: null,
			candidates: [{ type: "order" }, { type: "quote" }],
		});
		expect(result.entities).toHaveLength(2);
		expect(result.entities).toMatchObject([
			{ id: "09502PC", salesType: "order" },
			{ id: "09502PC", salesType: "quote" },
		]);
	});

	test("returns a conflict for a stale revision and hides finance without payment access", async () => {
		const getSalesOrderCandidates = async () => [detailedOrder];
		const stale = await executeRegisteredAssistantTool(
			actor,
			{
				toolId: "sales_get_order_status",
				version: 1,
				input: { orderNo: "09502PC", expectedRevision: "old-revision" },
			},
			services({ getSalesOrderCandidates }),
		);
		expect(stale.status).toBe("conflict");
		expect(stale.revision).toBe("order-revision-1");

		const current = await executeRegisteredAssistantTool(
			actor,
			{
				toolId: "sales_get_order_status",
				version: 1,
				input: { orderNo: "09502PC", expectedRevision: "order-revision-1" },
			},
			services({ getSalesOrderCandidates }),
		);
		expect(current.data).toMatchObject({
			order: {
				grandTotal: null,
				amountDue: null,
				invoiceStatus: null,
				payments: [],
				pipeline: {
					payment: { state: null, total: null, amountDue: null },
					blockers: [{ code: "production_pending" }],
				},
			},
		});
	});

	test("returns finance details only with the existing payment grant", async () => {
		const result = await executeRegisteredAssistantTool(
			{
				...actor,
				grants: { ...actor.grants, viewOrderPayment: true },
			},
			{
				toolId: "sales_explain_blockers",
				version: 1,
				input: { orderNo: "09502PC" },
			},
			services({ getSalesOrderCandidates: async () => [detailedOrder] }),
		);
		expect(result.data).toMatchObject({
			order: { amountDue: "34.56", payments: [{ amount: "1200" }] },
		});
		expect(JSON.stringify(result.data)).toContain("payment_due");
	});

	test("returns safe customer summary and scoped order history", async () => {
		const customer = {
			id: 9,
			accountNo: "ada-millwork",
			name: "Ada Millwork",
			profile: "Builder",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-09-01T00:00:00.000Z",
			revision: "customer-revision-1",
			orderCount: 1,
			latestOrder: order,
		};
		const result = await executeRegisteredAssistantTool(
			actor,
			{
				toolId: "customers_get_order_history",
				version: 1,
				input: { customerId: 9, limit: 10 },
			},
			services({
				getCustomerOrderHistory: async () => ({
					customer,
					items: [order],
					nextCursor: null,
				}),
			}),
		);
		expect(result).toMatchObject({
			status: "success",
			data: { customer: { id: 9 }, items: [{ orderNo: "09502PC" }] },
			entities: [
				{ kind: "customer", id: "ada-millwork" },
				{ kind: "order", id: "09502PC" },
			],
		});
		expect(JSON.stringify(result)).not.toContain("email");
	});
});

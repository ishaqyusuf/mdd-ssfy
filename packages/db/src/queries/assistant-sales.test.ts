import { describe, expect, test } from "bun:test";
import type { Database } from "../index";
import {
	assistantCustomerScopeWhere,
	assistantSalesScopeWhere,
	findAssistantSalesOrders,
	getAssistantCustomerOrderHistory,
	getAssistantCustomerSummary,
	getAssistantSalesOrderCandidates,
	getAssistantSalesTimeline,
} from "./assistant-sales";

const organizationActor = {
	userId: 42,
	scopeType: "organization",
	scopeId: "7",
};

function order(overrides: Record<string, unknown> = {}) {
	return {
		id: 101,
		orderId: "09502PC",
		type: "order",
		title: "Kitchen",
		status: "active",
		prodStatus: "in progress",
		inventoryStatus: "pending",
		invoiceStatus: "unpaid",
		deliveryOption: "delivery",
		priority: "NORMAL",
		grandTotal: 1234.56,
		amountDue: 34.56,
		prodQty: 3.5,
		builtQty: 1,
		createdAt: new Date("2026-09-01T00:00:00.000Z"),
		updatedAt: new Date("2026-09-02T00:00:00.000Z"),
		archivedAt: null,
		customer: { id: 9, name: "Ada", businessName: "Ada Millwork" },
		salesRep: { name: "Sales Rep" },
		...overrides,
	};
}

describe("assistant Sales/customer query boundary", () => {
	test("derives organization or representative scope only from the actor", () => {
		expect(assistantSalesScopeWhere(organizationActor)).toEqual({ orgId: 7 });
		expect(
			assistantSalesScopeWhere({
				userId: 42,
				scopeType: "user",
				scopeId: "42",
			}),
		).toEqual({ salesRepId: 42 });
		expect(() =>
			assistantSalesScopeWhere({
				userId: 42,
				scopeType: "dealer",
				scopeId: "42",
			}),
		).toThrow("scope is not supported");
		expect(() =>
			assistantSalesScopeWhere({
				userId: 42,
				scopeType: "user",
				scopeId: "99",
			}),
		).toThrow("scope is not supported");
		expect(assistantCustomerScopeWhere(organizationActor)).toEqual({
			AND: [
				{ OR: [{ dealerOwnerId: null }, { officeVisibility: "SHARED" }] },
				{ salesOrders: { some: { orgId: 7, deletedAt: null } } },
			],
		});
	});

	test("uses keyset pagination, excludes deleted/archived rows, and preserves decimals", async () => {
		let query: unknown;
		const db = {
			salesOrders: {
				findMany: async (input: unknown) => {
					query = input;
					return [order(), order({ id: 100, orderId: "09501PC" })];
				},
			},
		} as unknown as Database;
		const result = await findAssistantSalesOrders(db, organizationActor, {
			query: "Ada",
			cursor: 120,
			limit: 1,
		});

		const captured = query as {
			cursor: unknown;
			skip: number;
			take: number;
			orderBy: unknown;
			where: { AND: unknown[] };
		};
		expect(captured.cursor).toEqual({ id: 120 });
		expect(captured.skip).toBe(1);
		expect(captured.take).toBe(2);
		expect(captured.orderBy).toEqual({ id: "desc" });
		expect(captured.where.AND.slice(0, 3)).toEqual([
			{ orgId: 7 },
			{ deletedAt: null },
			{ archivedAt: null },
		]);
		expect(JSON.stringify(query)).toContain('"contains":"Ada"');
		expect(result.nextCursor).toBe(101);
		expect(result.items[0]).toMatchObject({
			grandTotal: "1234.56",
			amountDue: "34.56",
			orderedQuantity: "3.5",
		});
		expect(result.items[0]).not.toHaveProperty("email");
		expect(result.items[0]).not.toHaveProperty("meta");
	});

	test("returns duplicate order-number candidates without guessing a type", async () => {
		const db = {
			salesOrders: {
				findMany: async () => [
					{
						...order(),
						deliveries: [],
						payments: [],
						stat: [],
					},
					{
						...order({ id: 102, type: "quote" }),
						deliveries: [],
						payments: [],
						stat: [],
					},
				],
			},
		} as unknown as Database;
		const result = await getAssistantSalesOrderCandidates(
			db,
			organizationActor,
			{ orderNo: "09502PC" },
		);
		expect(result.map(({ type }) => type)).toEqual(["order", "quote"]);
	});

	test("bounds payments and revises detailed status when related evidence changes", async () => {
		let paymentStatus = "success";
		let query: unknown;
		const db = {
			salesOrders: {
				findMany: async (input: unknown) => {
					query = input;
					return [
						{
							...order(),
							deliveries: [],
							payments: [
								{
									id: 1,
									amount: 25,
									status: paymentStatus,
									reviewStatus: "approved",
									updatedAt: new Date("2026-09-03T00:00:00.000Z"),
								},
							],
							stat: [],
						},
					];
				},
			},
		} as unknown as Database;
		const first = await getAssistantSalesOrderCandidates(
			db,
			organizationActor,
			{ orderNo: "09502PC" },
		);
		paymentStatus = "refunded";
		const second = await getAssistantSalesOrderCandidates(
			db,
			organizationActor,
			{ orderNo: "09502PC" },
		);
		expect(first[0]?.revision).not.toBe(second[0]?.revision);
		expect(
			(query as { select: { payments: { take: number } } }).select.payments
				.take,
		).toBe(5);
	});

	test("timeline projects bounded labels and drops raw history data", async () => {
		let historyQuery: unknown;
		let historyRead = 0;
		const timestamp = new Date("2026-09-03T00:00:00.000Z");
		let historyWatermark = new Date(timestamp);
		const db = {
			salesOrders: {
				findMany: async () => [
					{
						...order(),
						deliveries: [],
						payments: [],
						stat: [],
					},
				],
			},
			salesHistory: {
				findFirst: async () => ({
					id: "history-2",
					updatedAt: historyWatermark,
					deletedAt: null,
				}),
				findMany: async (input: unknown) => {
					historyQuery = input;
					historyRead += 1;
					return historyRead === 1
						? [
								{
									id: "history-2",
									name: "Production started",
									authorName: "Operator",
									createdAt: timestamp,
									updatedAt: timestamp,
									data: { secret: true },
								},
								{
									id: "history-1",
									name: "Order confirmed",
									authorName: "Operator",
									createdAt: timestamp,
									updatedAt: timestamp,
								},
							]
						: [
								{
									id: "history-1",
									name: "Production started",
									authorName: "Operator",
									createdAt: timestamp,
									updatedAt: timestamp,
									data: { secret: true },
								},
							];
				},
			},
		} as unknown as Database;
		const result = await getAssistantSalesTimeline(db, organizationActor, {
			orderNo: "09502PC",
			limit: 1,
		});
		expect(result.events[0]).toMatchObject({
			id: "history-2",
			name: "Production started",
		});
		expect(result.events[0]).not.toHaveProperty("data");
		expect(result.nextCursor).toEqual(expect.any(String));
		historyWatermark = new Date("2026-09-04T00:00:00.000Z");
		const nextResult = await getAssistantSalesTimeline(db, organizationActor, {
			orderNo: "09502PC",
			limit: 1,
			cursor: result.nextCursor || undefined,
		});
		expect(JSON.stringify(historyQuery)).toContain('"id":{"lt":"history-2"}');
		expect(nextResult.candidates[0]?.revision).not.toBe(
			result.candidates[0]?.revision,
		);
	});

	test("summarizes only active scoped customer orders without contact fields", async () => {
		let query: unknown;
		const db = {
			customers: {
				findFirst: async (input: unknown) => {
					query = input;
					return {
						id: 9,
						name: "Ada",
						businessName: "Ada Millwork",
						createdAt: new Date("2026-01-01T00:00:00.000Z"),
						updatedAt: new Date("2026-09-01T00:00:00.000Z"),
						profile: { title: "Builder" },
						_count: { salesOrders: 1 },
						salesOrders: [order()],
						email: "private@example.com",
					};
				},
			},
		} as unknown as Database;
		const result = await getAssistantCustomerSummary(db, organizationActor, 9);
		const serializedQuery = JSON.stringify(query);
		expect(serializedQuery).toContain('"deletedAt":null');
		expect(serializedQuery).toContain('"archivedAt":null');
		expect(result).toMatchObject({
			id: 9,
			accountNo: "cust-9",
			name: "Ada Millwork",
			orderCount: 1,
			latestOrder: { orderNo: "09502PC" },
		});
		expect(result).not.toHaveProperty("email");
	});

	test("keeps customer order history constrained by the resolved customer id", async () => {
		let salesQuery: unknown;
		const db = {
			customers: {
				findFirst: async () => ({
					id: 9,
					name: "Ada",
					businessName: "Ada Millwork",
					createdAt: new Date("2026-01-01T00:00:00.000Z"),
					updatedAt: new Date("2026-09-01T00:00:00.000Z"),
					profile: null,
					_count: { salesOrders: 1 },
					salesOrders: [order()],
				}),
			},
			salesOrders: {
				findMany: async (input: unknown) => {
					salesQuery = input;
					return [order()];
				},
			},
		} as unknown as Database;
		const result = await getAssistantCustomerOrderHistory(
			db,
			organizationActor,
			{ customerId: 9, limit: 10 },
		);
		expect(JSON.stringify(salesQuery)).toContain('"customerId":9');
		expect(result?.items).toHaveLength(1);
	});
});

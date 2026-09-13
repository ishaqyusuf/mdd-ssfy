import { describe, expect, test } from "bun:test";
import type { Database } from "../index";
import {
	findAssistantCommunityProjects,
	findAssistantCommunityUnits,
	findAssistantInventoryAvailability,
	findAssistantProductionAssignments,
	getAssistantCommunityProjectSummary,
	getAssistantProductionAccessibleOrderIds,
} from "./assistant-operations";

const organizationActor = {
	userId: 42,
	scopeType: "organization",
	scopeId: "7",
	grants: { editProduction: true },
};

describe("assistant operations query boundary", () => {
	test("scopes Production assignments to active organization sales", async () => {
		let query: unknown;
		const db = {
			orderItemProductionAssignments: {
				findMany: async (input: unknown) => {
					query = input;
					return [
						{
							id: 11,
							qtyAssigned: 4,
							qtyCompleted: 2,
							startedAt: null,
							completedAt: null,
							dueDate: new Date("2026-09-20T00:00:00.000Z"),
							updatedAt: new Date("2026-09-13T00:00:00.000Z"),
							assignedTo: { id: 42, name: "Worker" },
							order: { id: 8, orderId: "09502PC", title: "Kitchen" },
						},
					];
				},
			},
		} as unknown as Database;
		const result = await findAssistantProductionAssignments(
			db,
			organizationActor,
			{ limit: 10 },
		);
		const serialized = JSON.stringify(query);
		expect(serialized).toContain('"orgId":7');
		expect(serialized).toContain('"archivedAt":null');
		expect(serialized).toContain('"deletedAt":null');
		expect(result.items[0]).toMatchObject({
			orderNo: "09502PC",
			assignedQuantity: "4",
			completedQuantity: "2",
		});
	});

	test("constrains user-scoped Production reads to that worker", async () => {
		let query: unknown;
		const db = {
			orderItemProductionAssignments: {
				findMany: async (input: unknown) => {
					query = input;
					return [];
				},
			},
		} as unknown as Database;
		await findAssistantProductionAssignments(
			db,
			{ userId: 42, scopeType: "user", scopeId: "42" },
			{ limit: 10 },
		);
		expect(JSON.stringify(query)).toContain('"assignedToId":42');
	});

	test("constrains read-only Production organization users to assignments", async () => {
		let query: unknown;
		const db = {
			orderItemProductionAssignments: {
				findMany: async (input: unknown) => {
					query = input;
					return [];
				},
			},
		} as unknown as Database;
		await findAssistantProductionAssignments(
			db,
			{
				...organizationActor,
				grants: { viewProduction: true },
			},
			{ limit: 10 },
		);
		expect(JSON.stringify(query)).toContain('"assignedToId":42');
	});

	test("filters exact Production status candidates to assigned worker orders", async () => {
		let query: unknown;
		const db = {
			orderItemProductionAssignments: {
				findMany: async (input: unknown) => {
					query = input;
					return [{ orderId: 8 }];
				},
			},
		} as unknown as Database;
		const result = await getAssistantProductionAccessibleOrderIds(
			db,
			{
				...organizationActor,
				grants: { viewProduction: true },
			},
			[8, 9],
		);
		expect(result).toEqual([8]);
		expect(query).toMatchObject({
			where: {
				orderId: { in: [8, 9] },
				assignedToId: 42,
				deletedAt: null,
				order: {
					orgId: 7,
					deletedAt: null,
					archivedAt: null,
					type: "order",
				},
			},
		});
	});

	test("limits Production managers to active organization orders", async () => {
		let query: unknown;
		const db = {
			salesOrders: {
				findMany: async (input: unknown) => {
					query = input;
					return [{ id: 8 }];
				},
			},
		} as unknown as Database;
		const result = await getAssistantProductionAccessibleOrderIds(
			db,
			organizationActor,
			[8, 9],
		);
		expect(result).toEqual([8]);
		expect(query).toMatchObject({
			where: {
				id: { in: [8, 9] },
				orgId: 7,
				deletedAt: null,
				archivedAt: null,
				type: "order",
			},
		});
	});

	test("computes bounded inventory availability without prices or suppliers", async () => {
		let query: unknown;
		const allocationQueries: unknown[] = [];
		const db = {
			inventoryVariant: {
				findMany: async (input: unknown) => {
					query = input;
					return [
						{
							id: 2,
							uid: "variant-2",
							sku: "SKU-2",
							status: "published",
							lowStockAlert: 3,
							updatedAt: new Date("2026-09-13T00:00:00.000Z"),
							inventory: {
								id: 1,
								name: "Oak jamb",
								uid: "oak-jamb",
								stockMode: "stock",
								status: "published",
							},
							stocks: [{ id: 1, qty: 10, updatedAt: new Date() }],
							stockAllocations: [
								{ id: 3, qty: 8, status: "reserved", updatedAt: new Date() },
							],
							inboundDemands: [
								{
									id: 4,
									qty: 9,
									qtyReceived: 1,
									status: "ordered",
									updatedAt: new Date(),
								},
							],
							inboundStocks: [
								{
									id: 5,
									qty: 5,
									qtyGood: 0,
									updatedAt: new Date(),
									inbound: { id: 6, status: "pending", expectedAt: null },
								},
							],
						},
					];
				},
			},
			inventoryStock: {
				groupBy: async () => [
					{
						inventoryVariantId: 2,
						_sum: { qty: 10 },
						_max: { updatedAt: new Date() },
						_count: { _all: 25 },
					},
				],
			},
			stockAllocation: {
				groupBy: async (input: unknown) => {
					allocationQueries.push(input);
					const pending = JSON.stringify(input).includes("pending_review");
					return [
						{
							inventoryVariantId: 2,
							_sum: { qty: pending ? 3 : 8 },
							_max: { updatedAt: new Date() },
							_count: { _all: 24 },
						},
					];
				},
			},
			inboundDemand: {
				groupBy: async () => [
					{
						inventoryVariantId: 2,
						_sum: { qty: 9, qtyReceived: 1 },
						_max: { updatedAt: new Date() },
						_count: { _all: 23 },
					},
				],
			},
			inboundShipmentItem: {
				groupBy: async () => [
					{
						inventoryVariantId: 2,
						_sum: { qty: 5, qtyGood: 0 },
						_max: { updatedAt: new Date() },
						_count: { _all: 22 },
					},
				],
			},
		} as unknown as Database;
		const result = await findAssistantInventoryAvailability(db, {
			query: "oak",
			limit: 10,
		});
		expect(result.items[0]).toMatchObject({
			availableQuantity: "2",
			allocatedQuantity: "8",
			pendingAllocationQuantity: "3",
			inboundQuantity: "5",
			demandQuantity: "8",
			lowStock: true,
			blockers: ["inbound_shortfall"],
		});
		const serialized = JSON.stringify(query);
		expect(serialized).not.toContain("price");
		expect(serialized).not.toContain("supplier");
		expect(serialized).not.toContain("notes");
		expect(serialized).toContain('"sku":{"contains":"oak"}');
		expect(serialized).toContain('"uid":{"contains":"oak"}');
		expect(JSON.stringify(allocationQueries[0])).not.toContain(
			'"pending_review"',
		);
		expect(JSON.stringify(allocationQueries[0])).toContain('"consumed"');
		expect(JSON.stringify(allocationQueries[1])).toContain('"pending_review"');
	});

	test("paginates Community units inside one authorized project", async () => {
		let projectQuery: unknown;
		let unitsQuery: unknown;
		const db = {
			projects: {
				findFirst: async (input: unknown) => {
					projectQuery = input;
					return { id: 3 };
				},
			},
			homes: {
				findMany: async (input: unknown) => {
					unitsQuery = input;
					return [
						{
							id: 42,
							slug: "north-ridge-lot-4",
							lotBlock: "4/A",
							modelName: "Cedar",
							status: "active",
							updatedAt: new Date("2026-09-13T00:00:00.000Z"),
							_count: { tasks: 5, jobs: 2, invoices: 1 },
						},
						{
							id: 41,
							slug: "north-ridge-lot-3",
							lotBlock: "3/A",
							modelName: "Cedar",
							status: "active",
							updatedAt: new Date("2026-09-12T00:00:00.000Z"),
							_count: { tasks: 4, jobs: 1, invoices: 1 },
						},
					];
				},
			},
		} as unknown as Database;
		const result = await findAssistantCommunityUnits(
			db,
			{ ...organizationActor, grants: { viewCommunityUnit: true } },
			{
				projectId: 3,
				query: "Cedar",
				cursor: 50,
				limit: 1,
			},
		);
		expect(JSON.stringify(projectQuery)).toContain('"orgId":7');
		expect(JSON.stringify(projectQuery)).toContain(
			'"OR":[{"archived":false},{"archived":null}]',
		);
		const serialized = JSON.stringify(unitsQuery);
		expect(serialized).toContain('"projectId":3');
		expect(serialized).toContain('"cursor":{"id":50}');
		expect(serialized).toContain('"OR":[{"archived":false},{"archived":null}]');
		expect(serialized).not.toContain("installCost");
		expect(serialized).not.toContain("amount");
		expect(result).toMatchObject({
			projectId: 3,
			items: [
				{
					id: 42,
					taskCount: 0,
					jobCount: 0,
					invoiceCount: 0,
				},
			],
			nextCursor: 42,
		});
	});

	test("scopes Community projects by organization and omits install costs", async () => {
		let query: unknown;
		const db = {
			projects: {
				findMany: async (input: unknown) => {
					query = input;
					return [
						{
							id: 3,
							title: "North Ridge",
							refNo: "NR",
							slug: "north-ridge",
							archived: false,
							updatedAt: new Date("2026-09-13T00:00:00.000Z"),
							builder: { name: "Acme" },
							_count: { homes: 1, jobs: 2, invoices: 3 },
							homes: [
								{
									id: 4,
									slug: "lot-4",
									lotBlock: "4/A",
									modelName: "Cedar",
									status: "active",
									updatedAt: new Date(),
									_count: { tasks: 5, jobs: 2, invoices: 1 },
								},
							],
						},
					];
				},
			},
		} as unknown as Database;
		const result = await findAssistantCommunityProjects(
			db,
			{
				...organizationActor,
				grants: {
					viewCommunity: true,
					viewJobs: true,
					viewInvoice: true,
				},
			},
			{ limit: 10 },
		);
		expect(result.items[0]).toMatchObject({
			slug: "north-ridge",
			unitCount: 1,
			units: [{ slug: "lot-4", taskCount: 5 }],
		});
		const serialized = JSON.stringify(query);
		expect(serialized).toContain('"orgId":7');
		expect(serialized).toContain('"homes":{"where":{"deletedAt":null');
		expect(serialized).not.toContain("installCost");
		expect(serialized).not.toContain("amount");
		const restricted = await findAssistantCommunityProjects(
			db,
			{ ...organizationActor, grants: { viewCommunityUnit: true } },
			{ limit: 10 },
		);
		expect(restricted.items[0]).toMatchObject({
			jobCount: 0,
			invoiceCount: 0,
			units: [{ taskCount: 0, jobCount: 0, invoiceCount: 0 }],
		});
	});

	test("resolves a CommunityUnit-safe project detail with complete watermarks", async () => {
		const projectQueries: unknown[] = [];
		const watermark = {
			_max: { updatedAt: new Date("2026-09-13T00:00:00.000Z") },
			_count: { _all: 1 },
		};
		const db = {
			projects: {
				findFirst: async (input: unknown) => {
					projectQueries.push(input);
					return {
						id: 3,
						title: "North Ridge",
						refNo: "NR",
						slug: "north-ridge",
						archived: false,
						updatedAt: new Date("2026-09-13T00:00:00.000Z"),
						builder: { name: "Acme" },
						_count: { homes: 1, jobs: 1, homeTasks: 1, invoices: 1 },
						homes: [
							{
								id: 4,
								slug: "lot-4",
								lotBlock: "4/A",
								modelName: "Cedar",
								status: "active",
								updatedAt: new Date(),
							},
						],
						jobs: [
							{
								id: 5,
								title: "Install",
								type: "install",
								status: "queued",
								updatedAt: new Date(),
							},
						],
						homeTasks: [
							{
								id: 6,
								homeId: 4,
								taskName: "Doors",
								status: "active",
								productionStatus: "started",
								updatedAt: new Date(),
							},
						],
						invoices: [
							{
								id: 7,
								refNo: "INV-7",
								taskName: "Install",
								checkDate: null,
								updatedAt: new Date(),
								amount: null,
							},
						],
					};
				},
			},
			homes: { aggregate: async () => watermark },
			jobs: { aggregate: async () => watermark },
			homeTasks: { aggregate: async () => watermark },
			invoices: { aggregate: async () => watermark },
			storedDocument: {
				aggregate: async () => watermark,
				findMany: async () => [
					{
						id: "doc-8",
						title: "Plan",
						filename: "plan.pdf",
						mimeType: "application/pdf",
						size: 100,
						updatedAt: new Date(),
					},
				],
			},
		} as unknown as Database;
		const result = await getAssistantCommunityProjectSummary(
			db,
			{
				...organizationActor,
				grants: { viewCommunityUnit: true },
			},
			3,
		);
		const serialized = JSON.stringify(projectQueries[0]);
		expect(serialized).toContain('"id":3');
		expect(serialized).toContain('"orgId":7');
		expect(serialized).toContain('"OR":[{"archived":false},{"archived":null}]');
		expect(serialized).toContain('"amount":false');
		expect(serialized).not.toContain("installCost");
		expect(result).toMatchObject({
			id: 3,
			counts: { units: 1, jobs: 0, tasks: 0, invoices: 0, documents: 0 },
			jobs: [],
			tasks: [],
			invoices: [],
			documents: [],
		});
		const financialResult = await getAssistantCommunityProjectSummary(
			db,
			{
				...organizationActor,
				grants: {
					viewCommunity: true,
					viewJobs: true,
					viewInvoice: true,
					viewDocuments: true,
				},
			},
			3,
		);
		expect(JSON.stringify(projectQueries[1])).toContain('"amount":true');
		expect(financialResult?.invoices).toEqual([
			{
				id: 7,
				refNo: "INV-7",
				title: "Install",
				checkDate: null,
				amount: null,
			},
		]);
	});
});

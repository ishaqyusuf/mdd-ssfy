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
	grants: {
		viewOrders: true,
		viewProduction: true,
		viewInventory: true,
		viewCommunity: true,
	},
};

const pageInput = { limit: 10 };
const canonicalOrder = {
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
	orderedQuantity: "4",
	builtQuantity: "2",
	createdAt: "2026-09-01T00:00:00.000Z",
	updatedAt: "2026-09-02T00:00:00.000Z",
	archived: false,
	revision: "canonical-revision",
	pipeline: {
		version: "sales-pipeline/v2",
		revision: "pipeline-revision",
		freshness: {
			state: "current" as const,
			observedAt: "2026-09-02T00:00:00.000Z",
		},
		headline: { code: "in_production", label: "In production", tone: "blue" },
		payment: { state: "partially_paid", total: "1234.56", amountDue: "34.56" },
		material: { state: "ready", requiredQuantity: "4", readyQuantity: "4" },
		production: {
			state: "in_production",
			requiredQuantity: "4",
			completedQuantity: "2",
		},
		fulfillment: {
			state: "backlog",
			requiredQuantity: "4",
			deliveredQuantity: "0",
		},
		packing: { state: "pending" },
		dispatch: { state: "none" },
		blockers: [
			{
				code: "production_pending",
				dimension: "production",
				label: "Production is in progress.",
			},
		],
		conflicts: [],
	},
	deliveries: [],
	payments: [],
	statistics: [],
};

function services(
	overrides: Partial<AssistantToolServices>,
): Partial<AssistantToolServices> {
	return overrides;
}

describe("assistant operations tools", () => {
	test("discovers the implemented operations pack only through existing grants", () => {
		const ids = discoverAssistantTools(actor).map((tool) => tool.toolId);
		expect(ids).toContain("production_check_status");
		expect(ids).toContain("production_get_schedule");
		expect(ids).toContain("inventory_check_status");
		expect(ids).toContain("inventory_get_demand");
		expect(ids).toContain("fulfillment_check_status");
		expect(ids).toContain("fulfillment_explain_exceptions");
		expect(ids).toContain("community_search");
		expect(ids).toContain("community_get_project_summary");
		expect(ids).toContain("community_list_units");
		const orderOnly = discoverAssistantTools({
			...actor,
			grants: { viewOrders: true },
		}).map((tool) => tool.toolId);
		expect(orderOnly).toContain("fulfillment_check_status");
		expect(orderOnly).not.toContain("inventory_check_status");
		expect(orderOnly).not.toContain("community_search");
		const communityUnit = discoverAssistantTools({
			...actor,
			grants: { viewOrders: true, viewCommunityUnit: true },
		}).map((tool) => tool.toolId);
		expect(communityUnit).toContain("community_search");
		expect(communityUnit).toContain("community_get_project_summary");
		expect(communityUnit).toContain("community_list_units");
	});

	test("returns the canonical Production stage instead of inferring assignments", async () => {
		const result = await executeRegisteredAssistantTool(
			{ ...actor, grants: { viewProduction: true } },
			{
				toolId: "production_check_status",
				version: 1,
				input: { orderNo: "09502PC" },
			},
			services({ getProductionOrderCandidates: async () => [canonicalOrder] }),
		);
		expect(result.data).toMatchObject({
			order: {
				pipeline: {
					version: "sales-pipeline/v2",
					production: { state: "in_production", completedQuantity: "2" },
				},
			},
		});
		expect(result.allowedNextActions).toEqual([]);
	});

	test("returns bounded Production assignments with order links", async () => {
		const result = await executeRegisteredAssistantTool(
			actor,
			{ toolId: "production_get_schedule", version: 1, input: pageInput },
			services({
				findProductionAssignments: async () => ({
					items: [
						{
							id: 11,
							orderId: 8,
							orderNo: "09502PC",
							orderTitle: "Kitchen",
							workerId: 42,
							workerName: "Worker",
							assignedQuantity: "4",
							completedQuantity: "2",
							startedAt: null,
							completedAt: null,
							dueAt: "2026-09-20T00:00:00.000Z",
							revision: "assignment-revision",
						},
					],
					nextCursor: null,
				}),
			}),
		);
		expect(result.data).toMatchObject({
			items: [{ orderNo: "09502PC", completedQuantity: "2" }],
		});
		expect(result.sources).toHaveLength(1);
		expect(result.entities).toEqual([
			{
				kind: "order",
				id: "09502PC",
				label: "Order 09502PC",
				salesType: "order",
			},
		]);
	});

	test("returns exact inventory quantities and canonical blocker labels", async () => {
		const result = await executeRegisteredAssistantTool(
			actor,
			{ toolId: "inventory_check_status", version: 1, input: pageInput },
			services({
				findInventoryAvailability: async () => ({
					items: [
						{
							id: 1,
							variantId: 2,
							uid: "oak-jamb",
							variantUid: "oak-jamb-68",
							sku: "SKU-2",
							name: "Oak jamb",
							stockMode: "stock",
							status: "published",
							physicalQuantity: "10",
							allocatedQuantity: "8",
							pendingAllocationQuantity: "3",
							availableQuantity: "2",
							inboundQuantity: "5",
							demandQuantity: "8",
							lowStock: true,
							blockers: ["inbound_shortfall"],
							revision: "inventory-revision",
						},
					],
					nextCursor: null,
				}),
			}),
		);
		expect(result.data).toMatchObject({
			items: [
				{
					availableQuantity: "2",
					blockers: ["inbound_shortfall"],
				},
			],
		});
		expect(result.entities).toEqual([
			{ kind: "inventory", id: "1", label: "Oak jamb" },
		]);
	});

	test("returns Community operations counts without install-cost fields", async () => {
		const result = await executeRegisteredAssistantTool(
			actor,
			{ toolId: "community_search", version: 1, input: pageInput },
			services({
				findCommunityProjects: async () => ({
					items: [
						{
							id: 3,
							slug: "north-ridge",
							title: "North Ridge",
							refNo: "NR",
							builderName: "Acme",
							archived: false,
							unitCount: 1,
							jobCount: 2,
							invoiceCount: 3,
							units: [
								{
									id: 4,
									slug: "lot-4",
									lotBlock: "4/A",
									modelName: "Cedar",
									status: "active",
									taskCount: 5,
									jobCount: 2,
									invoiceCount: 1,
								},
							],
							revision: "project-revision",
						},
					],
					nextCursor: null,
				}),
			}),
		);
		expect(result.data).toMatchObject({
			items: [{ title: "North Ridge", units: [{ taskCount: 5 }] }],
		});
		expect(JSON.stringify(result)).not.toContain("installCost");
		expect(JSON.stringify(result)).not.toContain("amountDue");
	});

	test("resolves one Community project identity with safe child summaries", async () => {
		const project = {
			id: 3,
			slug: "north-ridge",
			title: "North Ridge",
			refNo: "NR",
			builderName: "Acme",
			archived: false,
			counts: { units: 1, jobs: 1, tasks: 1, invoices: 1, documents: 1 },
			units: [
				{
					id: 4,
					slug: "lot-4",
					lotBlock: "4/A",
					modelName: "Cedar",
					status: "active",
				},
			],
			jobs: [{ id: 5, title: "Install", type: "install", status: "queued" }],
			tasks: [
				{
					id: 6,
					unitId: 4,
					title: "Doors",
					status: "active",
					productionStatus: "started",
				},
			],
			invoices: [
				{
					id: 7,
					refNo: "INV-7",
					title: "Install",
					checkDate: null,
					amount: null,
				},
			],
			documents: [
				{ id: "doc-8", title: "Plan", mimeType: "application/pdf", size: 100 },
			],
			revision: "project-detail-revision",
		};
		const result = await executeRegisteredAssistantTool(
			{
				...actor,
				grants: {
					viewCommunityUnit: true,
					viewJobs: true,
					viewInvoice: true,
					viewDocuments: true,
				},
			},
			{
				toolId: "community_get_project_summary",
				version: 1,
				input: { projectId: 3 },
			},
			services({ getCommunityProjectSummary: async () => project }),
		);
		expect(result.data).toMatchObject({
			project: { id: 3, counts: { documents: 1 } },
		});
		expect(result.sources).toHaveLength(1);
		expect(result.entities).toEqual([
			{
				kind: "community",
				communityType: "project",
				id: "3",
				slug: "north-ridge",
				label: "North Ridge",
			},
		]);
		expect(JSON.stringify(result)).not.toContain("installCost");
	});

	test("paginates Community units with safe counts and unit deep links", async () => {
		const result = await executeRegisteredAssistantTool(
			{
				...actor,
				grants: {
					viewCommunityUnit: true,
					viewJobs: true,
					viewInvoice: true,
				},
			},
			{
				toolId: "community_list_units",
				version: 1,
				input: { projectId: 3, limit: 10 },
			},
			services({
				findCommunityUnits: async () => ({
					projectId: 3,
					items: [
						{
							id: 42,
							slug: "north-ridge-lot-4",
							lotBlock: "4/A",
							modelName: "Cedar",
							status: "active",
							taskCount: 5,
							jobCount: 2,
							invoiceCount: 1,
							revision: "unit-revision",
						},
					],
					nextCursor: null,
				}),
			}),
		);
		expect(result.data).toMatchObject({
			projectId: 3,
			items: [{ id: 42, taskCount: 5, invoiceCount: 1 }],
		});
		expect(result.sources).toEqual([
			{
				kind: "record",
				id: "community-unit:42@unit-revision",
				label: "4/A",
			},
		]);
		expect(result.entities).toEqual([
			{
				kind: "community",
				communityType: "unit",
				id: "42",
				slug: "north-ridge-lot-4",
				label: "4/A",
			},
		]);
		expect(JSON.stringify(result)).not.toContain("installCost");
		expect(JSON.stringify(result)).not.toContain("amount");
	});
});

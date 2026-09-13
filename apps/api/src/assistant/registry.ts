import { createHash } from "node:crypto";
import { db } from "@gnd/db";
import {
	findAssistantCommunityProjects,
	findAssistantCommunityUnits,
	findAssistantCustomers,
	findAssistantInventoryAvailability,
	findAssistantProductionAssignments,
	findAssistantSalesOrders,
	getAssistantCommunityProjectSummary,
	getAssistantCustomerOrderHistory,
	getAssistantCustomerSummary,
	getAssistantProductionAccessibleOrderIds,
	getAssistantSalesOrderCandidates,
	getAssistantSalesTimeline,
} from "@gnd/db/queries";
import { salesDocumentModeRequiresPaymentAccess } from "@gnd/sales/assistant-source";
import type { SalesPipelineSnapshot } from "@gnd/sales/sales-pipeline";
import {
	buildCanonicalSalesSourceRevision,
	getSalesPipelineSnapshots,
} from "@gnd/sales/sales-pipeline-order";
import { z } from "zod";
import { assistantAnalyticsQueryIntentSchema } from "./analytics-contract";
import { assistantAnalyticsResultSchema } from "./analytics-result-contract";
import { runAssistantAnalytics } from "./analytics-service";
import {
	type AssistantCapabilityState,
	type AssistantEffect,
	type AssistantEntityReference,
	assistantToolIdentitySchema,
	createAssistantResultEnvelopeSchema,
} from "./contracts";
import {
	assistantSalesRequestDraftInputSchema,
	assistantSalesRequestDraftPreviewSchema,
} from "./order-draft-contract";
import { createAssistantSalesRequestDraft } from "./order-drafts";
import {
	assistantSalesPdfModes,
	cancelAssistantSalesPdfJob,
	getAssistantSalesPdfStatus,
	isAssistantSalesPdfModeSupported,
	queueAssistantSalesPdfJob,
} from "./pdf-artifacts";

export const ASSISTANT_TOOL_CATALOG_VERSION = "assistant-catalog-v7";

export const assistantToolDomains = [
	"system",
	"sales",
	"customers",
	"inventory",
	"production",
	"fulfillment",
	"community",
	"documents",
	"finance",
	"employees",
] as const;

export type AssistantToolDomain = (typeof assistantToolDomains)[number];

export type AssistantToolActor = {
	userId: number;
	scopeType: string;
	scopeId: string;
	grants: Record<string, boolean>;
	timezone?: string;
};

export type AssistantToolPresentation = {
	group: string;
	resultComponent: string;
	icon: string;
};

type AssistantToolHandler = (
	context: AssistantToolActor,
	input: unknown,
	services: AssistantToolServices,
	execution?: AssistantToolExecution,
) => Promise<unknown> | unknown;

type AssistantProposalPreflight = (
	context: AssistantToolActor,
	input: unknown,
	services: AssistantToolServices,
) =>
	| Promise<{ ok: true; targetRevision?: string }>
	| {
			ok: true;
			targetRevision?: string;
	  };

export type AssistantToolExecution = {
	signal: AbortSignal;
};

export type AssistantToolDefinition = {
	toolId: string;
	version: number;
	domain: AssistantToolDomain;
	title: string;
	description: string;
	capability: AssistantCapabilityState;
	effect: AssistantEffect;
	requiredGrants: string[];
	anyOfGrants?: string[];
	presentation: AssistantToolPresentation;
	inputSchema: z.ZodType;
	outputSchema: z.ZodType;
	relatedTools: string[];
	alwaysActive?: boolean;
	handler?: AssistantToolHandler;
	proposalPreflight?: AssistantProposalPreflight;
};

export const assistantEffectPolicies = {
	read: { confirmation: "none", directExecution: true },
	draft: { confirmation: "none", directExecution: true },
	artifact: { confirmation: "explicit", directExecution: false },
	write: { confirmation: "explicit", directExecution: false },
	external_send: { confirmation: "explicit", directExecution: false },
	destructive: { confirmation: "explicit", directExecution: false },
} as const satisfies Record<
	AssistantEffect,
	{ confirmation: "none" | "explicit"; directExecution: boolean }
>;

const searchToolsInputSchema = z
	.object({
		query: z.string().trim().min(1).max(200),
	})
	.strict();
const searchToolsDataSchema = z
	.object({
		tools: z.array(
			z
				.object({
					toolId: z.string(),
					version: z.number().int().positive(),
					title: z.string(),
					description: z.string(),
					capability: z.enum([
						"implemented",
						"coming_soon",
						"disabled",
						"degraded",
					]),
					effect: z.enum([
						"read",
						"draft",
						"artifact",
						"write",
						"external_send",
						"destructive",
					]),
				})
				.strict(),
		),
	})
	.strict();
const explainCapabilityInputSchema = z
	.object({
		toolId: z.string().trim().min(1).max(191),
	})
	.strict();
const explainCapabilityDataSchema = z
	.object({
		toolId: z.string(),
		version: z.number().int().positive(),
		title: z.string(),
		description: z.string(),
		capability: z.enum(["implemented", "coming_soon", "disabled", "degraded"]),
		effect: z.enum([
			"read",
			"draft",
			"artifact",
			"write",
			"external_send",
			"destructive",
		]),
	})
	.strict();
const requestCapabilityInputSchema = z
	.object({ summary: z.string().trim().min(10).max(500) })
	.strict();
const requestCapabilityDataSchema = z
	.object({
		summary: z.string().trim().min(10).max(500),
		classifierVersion: z.literal("assistant-feature-classifier-v1"),
	})
	.strict();
const placeholderInputSchema = z
	.object({
		query: z.string().max(500).optional(),
	})
	.strict();
const placeholderDataSchema = z
	.object({ available: z.literal(false) })
	.strict();
const pageInputSchema = z
	.object({
		query: z.string().trim().min(1).max(120).optional(),
		cursor: z.number().int().positive().optional(),
		limit: z.number().int().min(1).max(20).default(10),
		includeArchived: z.boolean().default(false),
	})
	.strict();

const orderTypeSchema = z.enum(["order", "quote"]);
const orderSearchInputSchema = pageInputSchema.extend({
	type: orderTypeSchema.optional(),
});
const orderIdentityInputSchema = z
	.object({
		orderNo: z.string().trim().min(1).max(64),
		type: orderTypeSchema.optional(),
		expectedRevision: z.string().trim().min(1).max(191).optional(),
	})
	.strict();
const timelineInputSchema = orderIdentityInputSchema.extend({
	limit: z.number().int().min(1).max(20).default(10),
	cursor: z.string().trim().min(1).max(500).optional(),
});
const customerIdInputSchema = z
	.object({ customerId: z.number().int().positive() })
	.strict();
const communityProjectInputSchema = z
	.object({ projectId: z.number().int().positive() })
	.strict();
const communityUnitsInputSchema = pageInputSchema.extend({
	projectId: z.number().int().positive(),
});
const customerHistoryInputSchema = pageInputSchema.extend({
	customerId: z.number().int().positive(),
});

const nullableText = z.string().nullable();
const orderSchema = z
	.object({
		id: z.number().int().positive(),
		orderNo: z.string().min(1),
		type: z.string().min(1),
		title: nullableText,
		customerId: z.number().int().positive().nullable(),
		customerName: nullableText,
		salesRepName: nullableText,
		status: nullableText,
		productionStatus: nullableText,
		inventoryStatus: nullableText,
		invoiceStatus: nullableText,
		deliveryOption: nullableText,
		priority: nullableText,
		grandTotal: nullableText,
		amountDue: nullableText,
		orderedQuantity: nullableText,
		builtQuantity: nullableText,
		createdAt: nullableText,
		updatedAt: nullableText,
		archived: z.boolean(),
		revision: z.string().min(1),
	})
	.strict();
const blockerSchema = z
	.object({
		code: z.string().min(1),
		dimension: z.string().min(1),
		label: z.string().min(1),
	})
	.strict();
const pipelineSchema = z
	.object({
		version: z.string().min(1),
		revision: z.string().min(1),
		freshness: z
			.object({
				state: z.enum(["current", "unknown"]),
				observedAt: nullableText,
			})
			.strict(),
		headline: z
			.object({
				code: z.string().min(1),
				label: z.string().min(1),
				tone: z.string(),
			})
			.strict(),
		payment: z
			.object({
				state: nullableText,
				total: nullableText,
				amountDue: nullableText,
			})
			.strict(),
		material: z
			.object({
				state: z.string(),
				requiredQuantity: z.string(),
				readyQuantity: z.string(),
			})
			.strict(),
		production: z
			.object({
				state: z.string(),
				requiredQuantity: z.string(),
				completedQuantity: z.string(),
			})
			.strict(),
		fulfillment: z
			.object({
				state: z.string(),
				requiredQuantity: z.string(),
				deliveredQuantity: z.string(),
			})
			.strict(),
		packing: z.object({ state: z.string() }).strict(),
		dispatch: z.object({ state: z.string() }).strict(),
		blockers: z.array(blockerSchema).max(50),
		conflicts: z
			.array(
				z
					.object({
						code: z.string().min(1),
						severity: z.enum(["warning", "blocking"]),
						label: z.string().min(1),
					})
					.strict(),
			)
			.max(20),
	})
	.strict();
const detailedOrderSchema = orderSchema
	.extend({
		pipeline: pipelineSchema,
		deliveries: z.array(
			z
				.object({
					id: z.number().int().positive(),
					status: nullableText,
					mode: nullableText,
					dueAt: nullableText,
					deliveredAt: nullableText,
					updatedAt: z.string().min(1),
				})
				.strict(),
		),
		payments: z
			.array(
				z
					.object({
						amount: z.string(),
						status: nullableText,
						reviewStatus: nullableText,
					})
					.strict(),
			)
			.max(5),
		statistics: z.array(
			z
				.object({
					type: nullableText,
					status: nullableText,
					total: nullableText,
					percentage: nullableText,
				})
				.strict(),
		),
	})
	.strict();
const salesPdfInputSchema = orderIdentityInputSchema.extend({
	mode: z.enum(assistantSalesPdfModes),
	snapshotId: z.string().cuid().optional(),
});
const salesPdfGenerationInputSchema = salesPdfInputSchema.extend({
	expectedRevision: z.string().trim().min(1).max(191),
	forceRegenerate: z.boolean().default(false),
});
const salesPdfCancelInputSchema = salesPdfInputSchema.extend({
	snapshotId: z.string().cuid(),
	expectedRevision: z.string().trim().min(1).max(191),
});
const salesPdfStatusSchema = z
	.object({
		mode: z.enum(assistantSalesPdfModes),
		documentType: z.string().min(1).max(100),
		status: z.enum([
			"on_demand",
			"queued",
			"running",
			"ready",
			"stale",
			"failed",
			"cancelled",
		]),
		snapshotId: z.string().min(1).nullable(),
		documentId: z.string().min(1).nullable(),
		generatedAt: nullableText,
		sourceUpdatedAt: nullableText,
		expiresAt: nullableText,
		revision: z.string().min(1),
	})
	.strict();
const salesPdfStatusDataSchema = z
	.object({
		order: detailedOrderSchema.nullable(),
		candidates: z.array(detailedOrderSchema).max(20),
		pdf: salesPdfStatusSchema.nullable(),
	})
	.strict();
const customerSchema = z
	.object({
		id: z.number().int().positive(),
		accountNo: z.string().min(1),
		name: z.string().min(1),
		profile: nullableText,
		createdAt: nullableText,
		updatedAt: nullableText,
		revision: z.string().min(1),
	})
	.strict();
const customerSummarySchema = customerSchema
	.extend({
		orderCount: z.number().int().nonnegative(),
		latestOrder: orderSchema.nullable(),
	})
	.strict();
const orderPageSchema = z
	.object({
		items: z.array(orderSchema),
		nextCursor: z.number().int().positive().nullable(),
	})
	.strict();
const customerPageSchema = z
	.object({
		items: z.array(customerSchema),
		nextCursor: z.number().int().positive().nullable(),
	})
	.strict();
const orderResolutionSchema = z
	.object({
		order: detailedOrderSchema.nullable(),
		candidates: z.array(detailedOrderSchema).max(3),
	})
	.strict();
const blockerDataSchema = orderResolutionSchema
	.extend({ blockers: z.array(blockerSchema) })
	.strict();
const timelineDataSchema = orderResolutionSchema
	.extend({
		events: z.array(
			z
				.object({
					id: z.string().min(1),
					name: z.string().min(1),
					authorName: nullableText,
					createdAt: nullableText,
					revision: z.string().min(1),
				})
				.strict(),
		),
		nextCursor: z.string().min(1).nullable(),
	})
	.strict();
const customerResolutionSchema = z
	.object({ customer: customerSummarySchema.nullable() })
	.strict();
const customerHistoryDataSchema = z
	.object({
		customer: customerSummarySchema,
		items: z.array(orderSchema),
		nextCursor: z.number().int().positive().nullable(),
	})
	.strict();
const productionAssignmentSchema = z
	.object({
		id: z.number().int().positive(),
		orderId: z.number().int().positive(),
		orderNo: z.string().min(1),
		orderTitle: nullableText,
		workerId: z.number().int().positive().nullable(),
		workerName: nullableText,
		assignedQuantity: nullableText,
		completedQuantity: nullableText,
		startedAt: nullableText,
		completedAt: nullableText,
		dueAt: nullableText,
		revision: z.string().min(1),
	})
	.strict();
const productionPageSchema = z
	.object({
		items: z.array(productionAssignmentSchema),
		nextCursor: z.number().int().positive().nullable(),
	})
	.strict();
const inventoryAvailabilitySchema = z
	.object({
		id: z.number().int().positive(),
		variantId: z.number().int().positive(),
		uid: z.string().min(1),
		variantUid: z.string().min(1),
		sku: nullableText,
		name: z.string().min(1),
		stockMode: nullableText,
		status: nullableText,
		physicalQuantity: z.string(),
		allocatedQuantity: z.string(),
		pendingAllocationQuantity: z.string(),
		availableQuantity: z.string(),
		inboundQuantity: z.string(),
		demandQuantity: z.string(),
		lowStock: z.boolean(),
		blockers: z.array(z.enum(["overallocated", "inbound_shortfall"])),
		revision: z.string().min(1),
	})
	.strict();
const inventoryPageSchema = z
	.object({
		items: z.array(inventoryAvailabilitySchema),
		nextCursor: z.number().int().positive().nullable(),
	})
	.strict();
const communityUnitSchema = z
	.object({
		id: z.number().int().positive(),
		slug: z.string().min(1),
		lotBlock: nullableText,
		modelName: nullableText,
		status: nullableText,
		taskCount: z.number().int().nonnegative(),
		jobCount: z.number().int().nonnegative(),
		invoiceCount: z.number().int().nonnegative(),
	})
	.strict();
const communityUnitPageItemSchema = communityUnitSchema.extend({
	revision: z.string().min(1),
});
const communityUnitPageSchema = z
	.object({
		projectId: z.number().int().positive(),
		items: z.array(communityUnitPageItemSchema),
		nextCursor: z.number().int().positive().nullable(),
	})
	.strict();
const communityProjectSchema = z
	.object({
		id: z.number().int().positive(),
		slug: z.string().min(1),
		title: z.string().min(1),
		refNo: nullableText,
		builderName: nullableText,
		archived: z.boolean(),
		unitCount: z.number().int().nonnegative(),
		jobCount: z.number().int().nonnegative(),
		invoiceCount: z.number().int().nonnegative(),
		units: z.array(communityUnitSchema).max(5),
		revision: z.string().min(1),
	})
	.strict();
const communityPageSchema = z
	.object({
		items: z.array(communityProjectSchema),
		nextCursor: z.number().int().positive().nullable(),
	})
	.strict();
const communityProjectSummarySchema = z
	.object({
		project: z
			.object({
				id: z.number().int().positive(),
				slug: z.string().min(1),
				title: z.string().min(1),
				refNo: nullableText,
				builderName: nullableText,
				archived: z.boolean(),
				counts: z
					.object({
						units: z.number().int().nonnegative(),
						jobs: z.number().int().nonnegative(),
						tasks: z.number().int().nonnegative(),
						invoices: z.number().int().nonnegative(),
						documents: z.number().int().nonnegative(),
					})
					.strict(),
				units: z.array(
					z
						.object({
							id: z.number().int().positive(),
							slug: z.string(),
							lotBlock: nullableText,
							modelName: nullableText,
							status: nullableText,
						})
						.strict(),
				),
				jobs: z.array(
					z
						.object({
							id: z.number().int().positive(),
							title: z.string(),
							type: nullableText,
							status: z.string(),
						})
						.strict(),
				),
				tasks: z.array(
					z
						.object({
							id: z.number().int().positive(),
							unitId: z.number().int().positive().nullable(),
							title: z.string(),
							status: nullableText,
							productionStatus: nullableText,
						})
						.strict(),
				),
				invoices: z.array(
					z
						.object({
							id: z.number().int().positive(),
							refNo: nullableText,
							title: z.string(),
							checkDate: nullableText,
							amount: nullableText,
						})
						.strict(),
				),
				documents: z.array(
					z
						.object({
							id: z.string().min(1),
							title: z.string(),
							mimeType: nullableText,
							size: z.number().int().nonnegative().nullable(),
						})
						.strict(),
				),
				revision: z.string().min(1),
			})
			.strict()
			.nullable(),
	})
	.strict();

type PageInput = z.infer<typeof pageInputSchema>;
type OrderSearchInput = z.infer<typeof orderSearchInputSchema>;
type OrderIdentityInput = z.infer<typeof orderIdentityInputSchema>;
type TimelineInput = z.infer<typeof timelineInputSchema>;
type CustomerHistoryInput = z.infer<typeof customerHistoryInputSchema>;
type Order = z.infer<typeof orderSchema>;
type DetailedOrder = z.infer<typeof detailedOrderSchema>;
type CustomerSummary = z.infer<typeof customerSummarySchema>;
type ProductionPage = z.infer<typeof productionPageSchema>;
type InventoryPage = z.infer<typeof inventoryPageSchema>;
type CommunityPage = z.infer<typeof communityPageSchema>;
type CommunityUnitPage = z.infer<typeof communityUnitPageSchema>;
type CommunityProjectSummary = NonNullable<
	z.infer<typeof communityProjectSummarySchema>["project"]
>;
type SalesPdfInput = z.infer<typeof salesPdfInputSchema>;
type SalesRequestDraftInput = z.infer<
	typeof assistantSalesRequestDraftInputSchema
>;
type SalesRequestDraftPreview = z.infer<
	typeof assistantSalesRequestDraftPreviewSchema
>;

export type AssistantToolServices = {
	runAnalytics: (
		actor: AssistantToolActor,
		input: z.infer<typeof assistantAnalyticsQueryIntentSchema>,
		signal: AbortSignal,
	) => Promise<z.infer<typeof assistantAnalyticsResultSchema>>;
	findSalesOrders: (
		actor: AssistantToolActor,
		input: OrderSearchInput,
	) => Promise<{ items: Order[]; nextCursor: number | null }>;
	getSalesOrderCandidates: (
		actor: AssistantToolActor,
		input: Pick<OrderIdentityInput, "orderNo" | "type">,
	) => Promise<DetailedOrder[]>;
	getProductionOrderCandidates: (
		actor: AssistantToolActor,
		input: Pick<OrderIdentityInput, "orderNo" | "type">,
	) => Promise<DetailedOrder[]>;
	getSalesTimeline: (
		actor: AssistantToolActor,
		input: Pick<TimelineInput, "orderNo" | "type" | "limit" | "cursor">,
	) => Promise<{
		candidates: DetailedOrder[];
		events: z.infer<typeof timelineDataSchema>["events"];
		nextCursor: string | null;
	}>;
	findCustomers: (
		actor: AssistantToolActor,
		input: PageInput,
	) => Promise<z.infer<typeof customerPageSchema>>;
	getCustomerSummary: (
		actor: AssistantToolActor,
		customerId: number,
	) => Promise<CustomerSummary | null>;
	getCustomerOrderHistory: (
		actor: AssistantToolActor,
		input: CustomerHistoryInput,
	) => Promise<z.infer<typeof customerHistoryDataSchema> | null>;
	findProductionAssignments: (
		actor: AssistantToolActor,
		input: PageInput,
	) => Promise<ProductionPage>;
	findInventoryAvailability: (
		actor: AssistantToolActor,
		input: PageInput,
	) => Promise<InventoryPage>;
	findCommunityProjects: (
		actor: AssistantToolActor,
		input: PageInput,
	) => Promise<CommunityPage>;
	getCommunityProjectSummary: (
		actor: AssistantToolActor,
		projectId: number,
	) => Promise<CommunityProjectSummary | null>;
	findCommunityUnits: (
		actor: AssistantToolActor,
		input: z.infer<typeof communityUnitsInputSchema>,
	) => Promise<CommunityUnitPage | null>;
	getSalesPdfStatus: (
		order: DetailedOrder,
		mode: SalesPdfInput["mode"],
		snapshotId?: string,
	) => Promise<z.infer<typeof salesPdfStatusSchema>>;
	queueSalesPdfJob: (
		actor: AssistantToolActor,
		order: DetailedOrder,
		mode: SalesPdfInput["mode"],
		forceRegenerate: boolean,
	) => Promise<{
		jobId: string;
		triggerRunId: string | null;
		status:
			| "queued"
			| "running"
			| "ready"
			| "failed"
			| "cancelled"
			| "stale"
			| "on_demand";
		reused: boolean;
	}>;
	cancelSalesPdfJob: (
		order: DetailedOrder,
		mode: SalesPdfInput["mode"],
		snapshotId: string,
	) => Promise<boolean>;
	draftSalesOrderFromRequest: (
		actor: AssistantToolActor,
		input: SalesRequestDraftInput,
		signal?: AbortSignal,
	) => Promise<Omit<SalesRequestDraftPreview, "type" | "unresolvedCount">>;
};

function projectSalesPipeline(snapshot: SalesPipelineSnapshot) {
	return {
		version: snapshot.version,
		revision: snapshot.revision,
		freshness: {
			state: snapshot.freshness.state,
			observedAt: snapshot.freshness.evidenceUpdatedAt,
		},
		headline: snapshot.headline,
		payment: {
			state: snapshot.payment.state,
			total: String(snapshot.payment.total),
			amountDue: String(snapshot.payment.amountDue),
		},
		material: {
			state: snapshot.material.state,
			requiredQuantity: String(snapshot.material.requiredQty),
			readyQuantity: String(snapshot.material.readyQty),
		},
		production: {
			state: snapshot.production.state,
			requiredQuantity: String(snapshot.production.requiredQty),
			completedQuantity: String(snapshot.production.completedQty),
		},
		fulfillment: {
			state: snapshot.fulfillment.state,
			requiredQuantity: String(snapshot.fulfillment.requiredQty),
			deliveredQuantity: String(snapshot.fulfillment.deliveredQty),
		},
		packing: { state: snapshot.packing.state },
		dispatch: { state: snapshot.dispatch.state },
		blockers: snapshot.blockers.map((blocker) => ({
			code: blocker.code,
			dimension: blocker.dimension,
			label: blocker.message,
		})),
		conflicts: snapshot.conflicts.map((conflict) => ({
			code: conflict.code,
			severity: conflict.severity,
			label: conflict.message,
		})),
	};
}

type RawDetailedOrder = Awaited<
	ReturnType<typeof getAssistantSalesOrderCandidates>
>[number];

async function loadCanonicalSalesOrders(orders: RawDetailedOrder[]) {
	const snapshots = await getSalesPipelineSnapshots(
		db,
		orders.map((order) => order.id),
	);
	return orders.map((order) => {
		const snapshot = snapshots.get(order.id);
		if (!snapshot)
			throw new Error("Canonical Sales status is temporarily unavailable");
		return {
			...order,
			pipeline: projectSalesPipeline(snapshot),
			revision: buildCanonicalSalesSourceRevision({
				orderRevision: order.revision,
				pipelineRevision: snapshot.revision,
			}),
		};
	});
}

const defaultAssistantToolServices: AssistantToolServices = {
	runAnalytics: (actor, input, signal) =>
		runAssistantAnalytics(db, actor, input, signal),
	findSalesOrders: (actor, input) => findAssistantSalesOrders(db, actor, input),
	getSalesOrderCandidates: async (actor, input) =>
		loadCanonicalSalesOrders(
			await getAssistantSalesOrderCandidates(db, actor, input),
		),
	getProductionOrderCandidates: async (actor, input) => {
		const candidates = await getAssistantSalesOrderCandidates(db, actor, input);
		const accessibleIds = new Set(
			await getAssistantProductionAccessibleOrderIds(
				db,
				actor,
				candidates.map(({ id }) => id),
			),
		);
		return loadCanonicalSalesOrders(
			candidates.filter(({ id }) => accessibleIds.has(id)),
		);
	},
	getSalesTimeline: async (actor, input) => {
		const result = await getAssistantSalesTimeline(db, actor, input);
		return {
			...result,
			candidates: await loadCanonicalSalesOrders(result.candidates),
		};
	},
	findCustomers: (actor, input) => findAssistantCustomers(db, actor, input),
	getCustomerSummary: (actor, customerId) =>
		getAssistantCustomerSummary(db, actor, customerId),
	getCustomerOrderHistory: (actor, input) =>
		getAssistantCustomerOrderHistory(db, actor, input),
	findProductionAssignments: (actor, input) =>
		findAssistantProductionAssignments(db, actor, input),
	findInventoryAvailability: (_actor, input) =>
		findAssistantInventoryAvailability(db, input),
	findCommunityProjects: (actor, input) =>
		findAssistantCommunityProjects(db, actor, input),
	getCommunityProjectSummary: (actor, projectId) =>
		getAssistantCommunityProjectSummary(db, actor, projectId),
	findCommunityUnits: (actor, input) =>
		findAssistantCommunityUnits(db, actor, input),
	getSalesPdfStatus: (order, mode, snapshotId) =>
		getAssistantSalesPdfStatus(db, {
			salesOrderId: order.id,
			sourceRevision: order.revision,
			mode,
			snapshotId,
		}),
	queueSalesPdfJob: (actor, order, mode, forceRegenerate) =>
		queueAssistantSalesPdfJob(db, {
			salesOrderId: order.id,
			salesUpdatedAt:
				order.updatedAt ??
				(() => {
					throw new Error("Sales PDF source revision is unavailable");
				})(),
			mode,
			forceRegenerate,
			sourceRevision: order.revision,
			actor: {
				userId: actor.userId,
				scopeType:
					actor.scopeType === "organization" || actor.scopeType === "user"
						? actor.scopeType
						: (() => {
								throw new Error("Assistant actor scope is invalid");
							})(),
				scopeId: actor.scopeId,
			},
		}),
	cancelSalesPdfJob: (order, mode, snapshotId) =>
		cancelAssistantSalesPdfJob(db, {
			snapshotId,
			salesOrderId: order.id,
			mode,
		}),
	draftSalesOrderFromRequest: createAssistantSalesRequestDraft,
};

function definition(
	value: Omit<AssistantToolDefinition, "relatedTools"> & {
		relatedTools?: string[];
	},
): AssistantToolDefinition {
	assistantToolIdentitySchema.parse({
		toolId: value.toolId,
		toolVersion: value.version,
	});
	return { ...value, relatedTools: value.relatedTools ?? [] };
}

function canViewOrderFinance(actor: AssistantToolActor) {
	return (
		actor.grants.viewOrderPayment === true ||
		actor.grants.editOrderPayment === true
	);
}

function redactOrderFinance<T extends Order | DetailedOrder>(
	actor: AssistantToolActor,
	order: T,
): T {
	if (canViewOrderFinance(actor)) return order;
	return {
		...order,
		grandTotal: null,
		amountDue: null,
		invoiceStatus: null,
		...("pipeline" in order
			? {
					pipeline: {
						...order.pipeline,
						payment: { state: null, total: null, amountDue: null },
						blockers: order.pipeline.blockers.filter(
							(blocker) => blocker.dimension !== "payment",
						),
					},
				}
			: {}),
		...("payments" in order ? { payments: [] } : {}),
	} as T;
}

function orderEntity(order: Pick<Order, "orderNo" | "type">) {
	return {
		kind: "order" as const,
		id: order.orderNo,
		label: `${order.type === "quote" ? "Quote" : "Order"} ${order.orderNo}`,
		salesType: order.type === "quote" ? ("quote" as const) : ("order" as const),
	};
}

function orderSource(order: Pick<Order, "orderNo" | "type" | "revision">) {
	return {
		kind: "record" as const,
		id: `${order.type}:${order.orderNo}@${order.revision}`,
		label: `${order.type === "quote" ? "Quote" : "Order"} ${order.orderNo}`,
	};
}

function customerEntity(customer: { accountNo: string; name: string }) {
	return {
		kind: "customer" as const,
		id: customer.accountNo,
		label: customer.name,
	};
}

function productionPageResult(page: ProductionPage) {
	return assistantResultEnvelope({
		status: "success",
		data: page,
		sources: page.items.map((item) => ({
			kind: "record",
			id: `production:${item.id}@${item.revision}`,
			label: `Order ${item.orderNo}`,
		})),
		entities: page.items.map((item) => ({
			kind: "order" as const,
			id: item.orderNo,
			label: `Order ${item.orderNo}`,
			salesType: "order" as const,
		})),
		allowedNextActions: [{ toolId: "production_check_status", toolVersion: 1 }],
	});
}

function inventoryPageResult(page: InventoryPage) {
	return assistantResultEnvelope({
		status: "success",
		data: page,
		sources: page.items.map((item) => ({
			kind: "record",
			id: `inventory:${item.variantId}@${item.revision}`,
			label: item.name,
		})),
		entities: page.items.map((item) => ({
			kind: "inventory" as const,
			id: String(item.id),
			label: item.name,
		})),
	});
}

function communityPageResult(page: CommunityPage) {
	return assistantResultEnvelope({
		status: "success",
		data: page,
		sources: page.items.map((project) => ({
			kind: "record",
			id: `community-project:${project.id}@${project.revision}`,
			label: project.title,
		})),
		entities: page.items.map((project) => ({
			kind: "community" as const,
			communityType: "project" as const,
			id: String(project.id),
			slug: project.slug,
			label: project.title,
		})),
	});
}

function communityUnitPageResult(page: CommunityUnitPage) {
	return assistantResultEnvelope({
		status: "success",
		data: page,
		sources: page.items.map((unit) => ({
			kind: "record",
			id: `community-unit:${unit.id}@${unit.revision}`,
			label: unit.lotBlock || unit.modelName || `Unit ${unit.id}`,
		})),
		entities: page.items.map((unit) => ({
			kind: "community" as const,
			communityType: "unit" as const,
			id: String(unit.id),
			slug: unit.slug,
			label: unit.lotBlock || unit.modelName || `Unit ${unit.id}`,
		})),
	});
}

function resolveOrderResult(
	actor: AssistantToolActor,
	orders: DetailedOrder[],
	expectedRevision?: string,
) {
	const candidates = orders.map((order) => redactOrderFinance(actor, order));
	if (candidates.length !== 1) {
		return assistantResultEnvelope({
			status: candidates.length ? "requires_input" : "unavailable",
			data: { order: null, candidates },
			sources: candidates.map(orderSource),
			entities: candidates.map(orderEntity),
			warnings: [
				candidates.length
					? "Choose whether you mean the order or quote."
					: "No authorized order or quote matched that number.",
			],
		});
	}
	const order = candidates[0];
	if (!order) throw new Error("Assistant order resolution failed");
	if (expectedRevision && expectedRevision !== order.revision) {
		return assistantResultEnvelope({
			status: "conflict",
			data: { order, candidates: [] },
			sources: [orderSource(order)],
			entities: [orderEntity(order)],
			revision: order.revision,
			warnings: [
				"The order changed. Review the current status before continuing.",
			],
			allowedNextActions:
				actor.grants.viewOrders === true
					? [{ toolId: "sales_get_order_status", toolVersion: 1 }]
					: [],
		});
	}
	return assistantResultEnvelope({
		status: "success",
		data: { order, candidates: [] },
		sources: [orderSource(order)],
		entities: [orderEntity(order)],
		revision: order.revision,
		allowedNextActions:
			actor.grants.viewOrders === true
				? [
						{ toolId: "sales_explain_blockers", toolVersion: 1 },
						{ toolId: "sales_get_timeline", toolVersion: 1 },
					]
				: [],
	});
}

function getOrderBlockers(actor: AssistantToolActor, order: DetailedOrder) {
	return order.pipeline.blockers.filter(
		(blocker) => blocker.dimension !== "payment" || canViewOrderFinance(actor),
	);
}

const salesCustomerDefinitions: AssistantToolDefinition[] = [
	definition({
		toolId: "sales_find_orders",
		version: 1,
		domain: "sales",
		title: "Find sales orders",
		description:
			"Find authorized sales orders or quotes by number, title, or customer.",
		capability: "implemented",
		effect: "read",
		requiredGrants: ["viewOrders"],
		presentation: {
			group: "Sales",
			resultComponent: "order-list",
			icon: "search",
		},
		inputSchema: orderSearchInputSchema,
		outputSchema: orderPageSchema,
		relatedTools: ["sales_get_order_status", "customers_find"],
		async handler(actor, rawInput, services) {
			const input = orderSearchInputSchema.parse(rawInput);
			const page = await services.findSalesOrders(actor, input);
			const items = page.items.map((order) => redactOrderFinance(actor, order));
			return assistantResultEnvelope({
				status: "success",
				data: { items, nextCursor: page.nextCursor },
				sources: items.map(orderSource),
				entities: items.map(orderEntity),
				allowedNextActions: [
					{ toolId: "sales_get_order_status", toolVersion: 1 },
				],
			});
		},
	}),
	definition({
		toolId: "sales_get_order_status",
		version: 1,
		domain: "sales",
		title: "Get order status",
		description:
			"Read the current canonical status for an authorized order or quote.",
		capability: "implemented",
		effect: "read",
		requiredGrants: ["viewOrders"],
		presentation: {
			group: "Sales",
			resultComponent: "order-status",
			icon: "clipboard-check",
		},
		inputSchema: orderIdentityInputSchema,
		outputSchema: orderResolutionSchema,
		relatedTools: ["sales_explain_blockers", "sales_get_timeline"],
		async handler(actor, rawInput, services) {
			const input = orderIdentityInputSchema.parse(rawInput);
			const orders = await services.getSalesOrderCandidates(actor, input);
			return resolveOrderResult(actor, orders, input.expectedRevision);
		},
	}),
	definition({
		toolId: "sales_explain_blockers",
		version: 1,
		domain: "sales",
		title: "Explain order blockers",
		description:
			"Explain current production, inventory, payment, and fulfillment blockers from canonical projections.",
		capability: "implemented",
		effect: "read",
		requiredGrants: ["viewOrders"],
		presentation: {
			group: "Sales",
			resultComponent: "order-blockers",
			icon: "triangle-alert",
		},
		inputSchema: orderIdentityInputSchema,
		outputSchema: blockerDataSchema,
		relatedTools: ["sales_get_order_status", "sales_get_timeline"],
		async handler(actor, rawInput, services) {
			const input = orderIdentityInputSchema.parse(rawInput);
			const rawOrders = await services.getSalesOrderCandidates(actor, input);
			const resolved = resolveOrderResult(
				actor,
				rawOrders,
				input.expectedRevision,
			);
			if (resolved.status !== "success" || rawOrders.length !== 1)
				return { ...resolved, data: { ...resolved.data, blockers: [] } };
			const rawOrder = rawOrders[0];
			if (!rawOrder) throw new Error("Assistant order resolution failed");
			return {
				...resolved,
				data: { ...resolved.data, blockers: getOrderBlockers(actor, rawOrder) },
			};
		},
	}),
	definition({
		toolId: "sales_get_timeline",
		version: 1,
		domain: "sales",
		title: "Get order timeline",
		description:
			"Read a bounded, redacted activity timeline for an authorized order or quote.",
		capability: "implemented",
		effect: "read",
		requiredGrants: ["viewOrders"],
		presentation: {
			group: "Sales",
			resultComponent: "order-timeline",
			icon: "history",
		},
		inputSchema: timelineInputSchema,
		outputSchema: timelineDataSchema,
		relatedTools: ["sales_get_order_status", "sales_explain_blockers"],
		async handler(actor, rawInput, services) {
			const input = timelineInputSchema.parse(rawInput);
			const result = await services.getSalesTimeline(actor, input);
			const resolved = resolveOrderResult(
				actor,
				result.candidates,
				input.expectedRevision,
			);
			return {
				...resolved,
				data: {
					...resolved.data,
					events: resolved.status === "success" ? result.events : [],
					nextCursor: resolved.status === "success" ? result.nextCursor : null,
				},
			};
		},
	}),
	definition({
		toolId: "customers_find",
		version: 1,
		domain: "customers",
		title: "Find customers",
		description:
			"Find authorized office-visible customer records with sales history in the current scope.",
		capability: "implemented",
		effect: "read",
		requiredGrants: ["viewCustomers"],
		presentation: {
			group: "Customers",
			resultComponent: "customer-list",
			icon: "users",
		},
		inputSchema: pageInputSchema,
		outputSchema: customerPageSchema,
		relatedTools: ["customers_get_summary", "customers_get_order_history"],
		async handler(actor, rawInput, services) {
			const input = pageInputSchema.parse(rawInput);
			const page = await services.findCustomers(actor, input);
			return assistantResultEnvelope({
				status: "success",
				data: page,
				sources: page.items.map((customer) => ({
					kind: "record",
					id: `customer:${customer.id}@${customer.revision}`,
					label: customer.name,
				})),
				entities: page.items.map(customerEntity),
				allowedNextActions: actor.grants.viewOrders
					? [{ toolId: "customers_get_summary", toolVersion: 1 }]
					: [],
			});
		},
	}),
	definition({
		toolId: "customers_get_summary",
		version: 1,
		domain: "customers",
		title: "Get customer summary",
		description: "Read a safe customer summary and latest authorized order.",
		capability: "implemented",
		effect: "read",
		requiredGrants: ["viewCustomers", "viewOrders"],
		presentation: {
			group: "Customers",
			resultComponent: "customer-summary",
			icon: "contact",
		},
		inputSchema: customerIdInputSchema,
		outputSchema: customerResolutionSchema,
		relatedTools: ["customers_get_order_history"],
		async handler(actor, rawInput, services) {
			const input = customerIdInputSchema.parse(rawInput);
			const customer = await services.getCustomerSummary(
				actor,
				input.customerId,
			);
			const safeCustomer = customer
				? {
						...customer,
						latestOrder: customer.latestOrder
							? redactOrderFinance(actor, customer.latestOrder)
							: null,
					}
				: null;
			return assistantResultEnvelope({
				status: safeCustomer ? "success" : "unavailable",
				data: { customer: safeCustomer },
				sources: safeCustomer
					? [
							{
								kind: "record",
								id: `customer:${safeCustomer.id}@${safeCustomer.revision}`,
								label: safeCustomer.name,
							},
						]
					: [],
				entities: safeCustomer ? [customerEntity(safeCustomer)] : [],
				warnings: safeCustomer
					? []
					: ["No authorized customer matched that identifier."],
				allowedNextActions: safeCustomer
					? [{ toolId: "customers_get_order_history", toolVersion: 1 }]
					: [],
			});
		},
	}),
	definition({
		toolId: "customers_get_order_history",
		version: 1,
		domain: "customers",
		title: "Get customer order history",
		description:
			"Read bounded authorized order history for an office-visible customer.",
		capability: "implemented",
		effect: "read",
		requiredGrants: ["viewCustomers", "viewOrders"],
		presentation: {
			group: "Customers",
			resultComponent: "customer-order-history",
			icon: "list",
		},
		inputSchema: customerHistoryInputSchema,
		outputSchema: customerHistoryDataSchema,
		relatedTools: ["customers_get_summary", "sales_get_order_status"],
		async handler(actor, rawInput, services) {
			const input = customerHistoryInputSchema.parse(rawInput);
			const result = await services.getCustomerOrderHistory(actor, input);
			if (!result)
				return assistantResultEnvelope({
					status: "unavailable",
					warnings: ["No authorized customer matched that identifier."],
				});
			const customer = {
				...result.customer,
				latestOrder: result.customer.latestOrder
					? redactOrderFinance(actor, result.customer.latestOrder)
					: null,
			};
			const items = result.items.map((order) =>
				redactOrderFinance(actor, order),
			);
			return assistantResultEnvelope({
				status: "success",
				data: { customer, items, nextCursor: result.nextCursor },
				sources: [
					{
						kind: "record",
						id: `customer:${customer.id}@${customer.revision}`,
						label: customer.name,
					},
					...items.map(orderSource),
				],
				entities: [
					customerEntity(customer),
					...items.slice(0, 19).map(orderEntity),
				],
				allowedNextActions: [
					{ toolId: "sales_get_order_status", toolVersion: 1 },
				],
			});
		},
	}),
];

async function resolveSalesPdfOrder(
	actor: AssistantToolActor,
	input: SalesPdfInput,
	services: AssistantToolServices,
) {
	if (
		salesDocumentModeRequiresPaymentAccess(input.mode) &&
		actor.grants.viewOrderPayment !== true
	) {
		return {
			result: assistantResultEnvelope({
				status: "unavailable",
				data: { order: null, candidates: [], pdf: null },
				warnings: [
					"Payment access is required for this price-bearing Sales PDF.",
				],
			}),
		};
	}
	const candidates = (await services.getSalesOrderCandidates(actor, input)).map(
		(order) => redactOrderFinance(actor, order),
	);
	if (candidates.length !== 1) {
		return {
			result: assistantResultEnvelope({
				status: candidates.length ? "requires_input" : "unavailable",
				data: { order: null, candidates, pdf: null },
				sources: candidates.map(orderSource),
				entities: candidates.map(orderEntity),
				warnings: [
					candidates.length
						? "Choose whether you mean the order or quote."
						: "No authorized order or quote matched that number.",
				],
			}),
		};
	}
	const order = candidates[0];
	if (!order) throw new Error("Assistant order resolution failed");
	if (input.expectedRevision && input.expectedRevision !== order.revision) {
		return {
			result: assistantResultEnvelope({
				status: "conflict",
				data: { order, candidates: [], pdf: null },
				sources: [orderSource(order)],
				entities: [orderEntity(order)],
				revision: order.revision,
				warnings: [
					"The Sales source changed. Review it before using a PDF snapshot.",
				],
			}),
		};
	}
	if (
		!isAssistantSalesPdfModeSupported({
			salesType: order.type,
			mode: input.mode,
		})
	) {
		return {
			result: assistantResultEnvelope({
				status: "requires_input",
				data: { order, candidates: [], pdf: null },
				sources: [orderSource(order)],
				entities: [orderEntity(order)],
				warnings: [
					order.type === "quote"
						? "Quotes support quote PDFs only."
						: "Orders do not use quote PDFs.",
				],
			}),
		};
	}
	return { order };
}

const placeholders: AssistantToolDefinition[] = [
	definition({
		toolId: "sales_draft_from_request",
		version: 1,
		domain: "sales",
		title: "Draft an order from a customer request",
		description:
			"Generate a typed native Sales form preview from customer request text using the published catalog configuration; unresolved specifications remain explicit for review.",
		capability: "implemented",
		effect: "draft",
		requiredGrants: ["editOrders"],
		presentation: {
			group: "Sales",
			resultComponent: "order-draft",
			icon: "file-plus",
		},
		inputSchema: assistantSalesRequestDraftInputSchema,
		outputSchema: assistantSalesRequestDraftPreviewSchema,
		relatedTools: ["sales_create_order"],
		async handler(actor, rawInput, services, execution) {
			const input = assistantSalesRequestDraftInputSchema.parse(rawInput);
			const generated = await services.draftSalesOrderFromRequest(
				actor,
				input,
				execution?.signal,
			);
			const preview = assistantSalesRequestDraftPreviewSchema.parse({
				...generated,
				type: input.type,
				unresolvedCount: generated.seed.unresolved.length,
			});
			return assistantResultEnvelope({
				status: preview.unresolvedCount ? "requires_input" : "success",
				data: preview,
				sources: [
					{
						kind: "record",
						id: `sales-catalog:${preview.configurationScope}@${preview.configurationRevision}`,
						label: "Published Sales configuration",
					},
				],
				revision: preview.configurationRevision,
				warnings: preview.unresolvedCount
					? [
							`${preview.unresolvedCount} request field${preview.unresolvedCount === 1 ? " is" : "s are"} unresolved and must be reviewed.`,
						]
					: [],
				allowedNextActions: [],
			});
		},
	}),
	definition({
		toolId: "sales_create_order",
		version: 1,
		domain: "sales",
		title: "Create a sales order draft",
		description:
			"Start a new customer purchase by preparing a reviewed native sales order draft.",
		capability: "coming_soon",
		effect: "write",
		requiredGrants: ["editOrders"],
		presentation: {
			group: "Sales",
			resultComponent: "order-draft",
			icon: "file-plus",
		},
		inputSchema: placeholderInputSchema,
		outputSchema: placeholderDataSchema,
		relatedTools: ["customers_find"],
	}),
	definition({
		toolId: "inventory_check_status",
		version: 1,
		domain: "inventory",
		title: "Check inventory status",
		description:
			"Check whether an item is in stock using canonical inventory availability and inbound evidence.",
		capability: "implemented",
		effect: "read",
		requiredGrants: ["viewInventory"],
		presentation: {
			group: "Inventory",
			resultComponent: "inventory-status",
			icon: "boxes",
		},
		inputSchema: pageInputSchema,
		outputSchema: inventoryPageSchema,
		relatedTools: ["inventory_get_demand"],
		async handler(actor, rawInput, services) {
			const input = pageInputSchema.parse(rawInput);
			const page = await services.findInventoryAvailability(actor, input);
			return {
				...inventoryPageResult(page),
				allowedNextActions: [
					{ toolId: "inventory_get_demand", toolVersion: 1 },
				],
			};
		},
	}),
	definition({
		toolId: "inventory_get_demand",
		version: 1,
		domain: "inventory",
		title: "Review inventory demand",
		description:
			"Read bounded canonical stock, allocation, inbound, demand, and material-shortfall evidence.",
		capability: "implemented",
		effect: "read",
		requiredGrants: ["viewInventory"],
		presentation: {
			group: "Inventory",
			resultComponent: "inventory-demand",
			icon: "package-search",
		},
		inputSchema: pageInputSchema,
		outputSchema: inventoryPageSchema,
		relatedTools: ["inventory_check_status"],
		async handler(actor, rawInput, services) {
			const input = pageInputSchema.parse(rawInput);
			const page = await services.findInventoryAvailability(actor, input);
			return inventoryPageResult(page);
		},
	}),
	definition({
		toolId: "production_check_status",
		version: 1,
		domain: "production",
		title: "Check production status",
		description:
			"Read the current manufacturing or Production stage and its evidence.",
		capability: "implemented",
		effect: "read",
		requiredGrants: ["viewProduction"],
		presentation: {
			group: "Production",
			resultComponent: "production-status",
			icon: "factory",
		},
		inputSchema: orderIdentityInputSchema,
		outputSchema: orderResolutionSchema,
		relatedTools: ["production_get_schedule", "sales_get_order_status"],
		async handler(actor, rawInput, services) {
			const input = orderIdentityInputSchema.parse(rawInput);
			return resolveOrderResult(
				actor,
				await services.getProductionOrderCandidates(actor, input),
				input.expectedRevision,
			);
		},
	}),
	definition({
		toolId: "production_get_schedule",
		version: 1,
		domain: "production",
		title: "Get Production schedule",
		description:
			"Read authorized active assignment quantities, workers, due dates, and completion evidence.",
		capability: "implemented",
		effect: "read",
		requiredGrants: ["viewProduction"],
		presentation: {
			group: "Production",
			resultComponent: "production-schedule",
			icon: "calendar-clock",
		},
		inputSchema: pageInputSchema,
		outputSchema: productionPageSchema,
		relatedTools: ["production_check_status"],
		async handler(actor, rawInput, services) {
			const input = pageInputSchema.parse(rawInput);
			const page = await services.findProductionAssignments(actor, input);
			return productionPageResult(page);
		},
	}),
	definition({
		toolId: "fulfillment_check_status",
		version: 1,
		domain: "fulfillment",
		title: "Check fulfillment status",
		description: "Read canonical packing, pickup, and delivery state.",
		capability: "implemented",
		effect: "read",
		requiredGrants: ["viewOrders"],
		presentation: {
			group: "Fulfillment",
			resultComponent: "fulfillment-status",
			icon: "truck",
		},
		inputSchema: orderIdentityInputSchema,
		outputSchema: orderResolutionSchema,
		relatedTools: ["fulfillment_explain_exceptions", "sales_get_order_status"],
		async handler(actor, rawInput, services) {
			const input = orderIdentityInputSchema.parse(rawInput);
			return resolveOrderResult(
				actor,
				await services.getSalesOrderCandidates(actor, input),
				input.expectedRevision,
			);
		},
	}),
	definition({
		toolId: "fulfillment_explain_exceptions",
		version: 1,
		domain: "fulfillment",
		title: "Explain fulfillment exceptions",
		description:
			"Explain canonical material, packing, pickup, delivery, and Dispatch blockers for an authorized order.",
		capability: "implemented",
		effect: "read",
		requiredGrants: ["viewOrders"],
		presentation: {
			group: "Fulfillment",
			resultComponent: "fulfillment-exceptions",
			icon: "triangle-alert",
		},
		inputSchema: orderIdentityInputSchema,
		outputSchema: blockerDataSchema,
		relatedTools: ["fulfillment_check_status"],
		async handler(actor, rawInput, services) {
			const input = orderIdentityInputSchema.parse(rawInput);
			const resolved = resolveOrderResult(
				actor,
				await services.getSalesOrderCandidates(actor, input),
				input.expectedRevision,
			);
			const order = resolved.data?.order;
			return {
				...resolved,
				data: {
					...resolved.data,
					blockers:
						resolved.status === "success" && order
							? order.pipeline.blockers.filter(
									(blocker) => blocker.dimension !== "payment",
								)
							: [],
				},
			};
		},
	}),
	definition({
		toolId: "community_search",
		version: 1,
		domain: "community",
		title: "Search Community",
		description:
			"Find authorized Community projects with bounded unit, job, and invoice counts.",
		capability: "implemented",
		effect: "read",
		requiredGrants: [],
		anyOfGrants: ["viewCommunity", "viewCommunityUnit", "editCommunityUnit"],
		presentation: {
			group: "Community",
			resultComponent: "community-results",
			icon: "messages",
		},
		inputSchema: pageInputSchema,
		outputSchema: communityPageSchema,
		relatedTools: ["community_get_project_summary", "community_list_units"],
		async handler(actor, rawInput, services) {
			const input = pageInputSchema.parse(rawInput);
			const page = await services.findCommunityProjects(actor, input);
			return {
				...communityPageResult(page),
				allowedNextActions: [
					{ toolId: "community_get_project_summary", toolVersion: 1 },
					{ toolId: "community_list_units", toolVersion: 1 },
				],
			};
		},
	}),
	definition({
		toolId: "community_get_project_summary",
		version: 1,
		domain: "community",
		title: "Get Community project summary",
		description:
			"Read an organization-scoped project with bounded unit, task, job, and invoice counts while excluding install costs.",
		capability: "implemented",
		effect: "read",
		requiredGrants: [],
		anyOfGrants: ["viewCommunity", "viewCommunityUnit", "editCommunityUnit"],
		presentation: {
			group: "Community",
			resultComponent: "community-project-summary",
			icon: "building-2",
		},
		inputSchema: communityProjectInputSchema,
		outputSchema: communityProjectSummarySchema,
		relatedTools: ["community_search", "community_list_units"],
		async handler(actor, rawInput, services) {
			const input = communityProjectInputSchema.parse(rawInput);
			const project = await services.getCommunityProjectSummary(
				actor,
				input.projectId,
			);
			return assistantResultEnvelope({
				status: project ? "success" : "unavailable",
				data: { project },
				sources: project
					? [
							{
								kind: "record",
								id: `community-project:${project.id}@${project.revision}`,
								label: project.title,
							},
						]
					: [],
				entities: project
					? [
							{
								kind: "community" as const,
								communityType: "project" as const,
								id: String(project.id),
								slug: project.slug,
								label: project.title,
							},
						]
					: [],
				warnings: project
					? []
					: ["No authorized Community project matched that identifier."],
				allowedNextActions: project
					? [{ toolId: "community_list_units", toolVersion: 1 }]
					: [],
			});
		},
	}),
	definition({
		toolId: "community_list_units",
		version: 1,
		domain: "community",
		title: "List Community project units",
		description:
			"List authorized units for one exact Community project with bounded task, job, and invoice counts while excluding install costs and invoice amounts.",
		capability: "implemented",
		effect: "read",
		requiredGrants: [],
		anyOfGrants: ["viewCommunity", "viewCommunityUnit", "editCommunityUnit"],
		presentation: {
			group: "Community",
			resultComponent: "community-unit-results",
			icon: "house",
		},
		inputSchema: communityUnitsInputSchema,
		outputSchema: communityUnitPageSchema,
		relatedTools: ["community_search", "community_get_project_summary"],
		async handler(actor, rawInput, services) {
			const input = communityUnitsInputSchema.parse(rawInput);
			const page = await services.findCommunityUnits(actor, input);
			if (!page) {
				return assistantResultEnvelope({
					status: "unavailable",
					warnings: [
						"No authorized Community project matched that identifier.",
					],
				});
			}
			return {
				...communityUnitPageResult(page),
				allowedNextActions: [
					{ toolId: "community_get_project_summary", toolVersion: 1 },
				],
			};
		},
	}),
	definition({
		toolId: "documents_get_sales_pdf_status",
		version: 1,
		domain: "documents",
		title: "Check Sales PDF status",
		description:
			"Check current authorized invoice, quote, packing, or Production PDF readiness and freshness without generating or sending a document.",
		capability: "implemented",
		effect: "read",
		requiredGrants: ["viewOrders"],
		presentation: {
			group: "Documents",
			resultComponent: "document-status",
			icon: "file-search",
		},
		inputSchema: salesPdfInputSchema,
		outputSchema: salesPdfStatusDataSchema,
		relatedTools: ["documents_generate_pdf", "sales_get_order_status"],
		async handler(actor, rawInput, services) {
			const input = salesPdfInputSchema.parse(rawInput);
			if (
				salesDocumentModeRequiresPaymentAccess(input.mode) &&
				actor.grants.viewOrderPayment !== true
			) {
				return assistantResultEnvelope({
					status: "unavailable",
					data: { order: null, candidates: [], pdf: null },
					warnings: [
						"Payment access is required for this price-bearing Sales PDF.",
					],
				});
			}
			const candidates = (
				await services.getSalesOrderCandidates(actor, input)
			).map((order) => redactOrderFinance(actor, order));
			if (candidates.length !== 1) {
				return assistantResultEnvelope({
					status: candidates.length ? "requires_input" : "unavailable",
					data: { order: null, candidates, pdf: null },
					sources: candidates.map(orderSource),
					entities: candidates.map(orderEntity),
					warnings: [
						candidates.length
							? "Choose whether you mean the order or quote."
							: "No authorized order or quote matched that number.",
					],
				});
			}
			const order = candidates[0];
			if (!order) throw new Error("Assistant order resolution failed");
			if (input.expectedRevision && input.expectedRevision !== order.revision) {
				return assistantResultEnvelope({
					status: "conflict",
					data: { order, candidates: [], pdf: null },
					sources: [orderSource(order)],
					entities: [orderEntity(order)],
					revision: order.revision,
					warnings: [
						"The Sales source changed. Review it before using a PDF snapshot.",
					],
				});
			}
			if (
				!isAssistantSalesPdfModeSupported({
					salesType: order.type,
					mode: input.mode,
				})
			) {
				return assistantResultEnvelope({
					status: "requires_input",
					data: { order, candidates: [], pdf: null },
					sources: [orderSource(order)],
					entities: [orderEntity(order)],
					warnings: [
						order.type === "quote"
							? "Quotes support quote PDFs only."
							: "Orders do not use quote PDFs.",
					],
				});
			}
			const pdf = await services.getSalesPdfStatus(
				order,
				input.mode,
				input.snapshotId,
			);
			return assistantResultEnvelope({
				status: "success",
				data: { order, candidates: [], pdf },
				sources: [
					orderSource(order),
					...(pdf.snapshotId
						? [
								{
									kind: "record" as const,
									id: `sales-pdf:${pdf.snapshotId}@${pdf.revision}`,
									label: `${order.orderNo} ${input.mode} PDF`,
								},
							]
						: []),
				],
				entities: [
					orderEntity(order),
					...(pdf.documentId
						? [
								{
									kind: "document" as const,
									id: pdf.documentId,
									label: `${order.orderNo} ${input.mode} PDF`,
									mimeType: "application/pdf",
								},
							]
						: []),
				],
				revision: pdf.revision,
				allowedNextActions:
					pdf.status === "ready"
						? []
						: pdf.snapshotId &&
								["queued", "running", "retrying"].includes(pdf.status)
							? [{ toolId: "documents_cancel_pdf", toolVersion: 1 }]
							: [{ toolId: "documents_generate_pdf", toolVersion: 1 }],
			});
		},
	}),
	definition({
		toolId: "documents_generate_pdf",
		version: 1,
		domain: "documents",
		title: "Generate PDF",
		description:
			"Generate a canonical authorized Sales PDF artifact after explicit approval.",
		capability: "implemented",
		effect: "artifact",
		requiredGrants: ["viewOrders"],
		presentation: {
			group: "Documents",
			resultComponent: "document",
			icon: "file-text",
		},
		inputSchema: salesPdfGenerationInputSchema,
		outputSchema: salesPdfStatusDataSchema,
		relatedTools: ["documents_get_sales_pdf_status", "documents_cancel_pdf"],
		async proposalPreflight(actor, rawInput, services) {
			const input = salesPdfGenerationInputSchema.parse(rawInput);
			const resolved = await resolveSalesPdfOrder(actor, input, services);
			if ("result" in resolved)
				throw new Error("Sales PDF target is unavailable");
			return { ok: true, targetRevision: resolved.order.revision };
		},
		async handler(actor, rawInput, services) {
			const input = salesPdfGenerationInputSchema.parse(rawInput);
			const resolved = await resolveSalesPdfOrder(actor, input, services);
			if ("result" in resolved) return resolved.result;
			const { order } = resolved;
			const job = await services.queueSalesPdfJob(
				actor,
				order,
				input.mode,
				input.forceRegenerate,
			);
			const pdf = await services.getSalesPdfStatus(
				order,
				input.mode,
				job.jobId,
			);
			const isReady = pdf.status === "ready";
			const failed = job.status === "failed";
			const cancelled = job.status === "cancelled";
			const stale = job.status === "stale";
			const running = job.status === "running";
			return assistantResultEnvelope({
				status: isReady
					? "success"
					: failed
						? "failed"
						: cancelled || stale
							? "conflict"
							: "pending",
				data: { order, candidates: [], pdf },
				sources: [orderSource(order)],
				entities: [
					orderEntity(order),
					...(pdf.documentId
						? [
								{
									kind: "document" as const,
									id: pdf.documentId,
									label: `${order.orderNo} ${input.mode} PDF`,
									mimeType: "application/pdf",
								},
							]
						: []),
				],
				revision: pdf.revision,
				artifact: {
					id: job.jobId,
					status: isReady
						? "ready"
						: failed
							? "failed"
							: cancelled
								? "cancelled"
								: stale
									? "failed"
									: running
										? "running"
										: "queued",
				},
				job: {
					id: job.jobId,
					status: isReady
						? "succeeded"
						: failed
							? "failed"
							: cancelled
								? "cancelled"
								: stale
									? "failed"
									: running
										? "running"
										: "queued",
				},
				warnings: failed
					? ["PDF generation is unavailable."]
					: stale
						? ["The Sales source changed before PDF generation completed."]
						: [],
				allowedNextActions:
					isReady || stale
						? []
						: [
								{ toolId: "documents_get_sales_pdf_status", toolVersion: 1 },
								{ toolId: "documents_cancel_pdf", toolVersion: 1 },
							],
			});
		},
	}),
	definition({
		toolId: "documents_cancel_pdf",
		version: 1,
		domain: "documents",
		title: "Cancel PDF generation",
		description:
			"Cancel one current queued or running Sales PDF job after explicit approval.",
		capability: "implemented",
		effect: "artifact",
		requiredGrants: ["viewOrders"],
		presentation: {
			group: "Documents",
			resultComponent: "document-status",
			icon: "circle-stop",
		},
		inputSchema: salesPdfCancelInputSchema,
		outputSchema: salesPdfStatusDataSchema,
		relatedTools: ["documents_get_sales_pdf_status", "documents_generate_pdf"],
		async proposalPreflight(actor, rawInput, services) {
			const input = salesPdfCancelInputSchema.parse(rawInput);
			const resolved = await resolveSalesPdfOrder(actor, input, services);
			if ("result" in resolved)
				throw new Error("Sales PDF target is unavailable");
			return { ok: true, targetRevision: resolved.order.revision };
		},
		async handler(actor, rawInput, services) {
			const input = salesPdfCancelInputSchema.parse(rawInput);
			const resolved = await resolveSalesPdfOrder(actor, input, services);
			if ("result" in resolved) return resolved.result;
			const { order } = resolved;
			const cancelled = await services.cancelSalesPdfJob(
				order,
				input.mode,
				input.snapshotId,
			);
			return assistantResultEnvelope({
				status: cancelled ? "success" : "conflict",
				data: { order, candidates: [], pdf: null },
				sources: [orderSource(order)],
				entities: [orderEntity(order)],
				...(cancelled
					? {
							artifact: {
								id: input.snapshotId,
								status: "cancelled" as const,
							},
							job: {
								id: input.snapshotId,
								status: "cancelled" as const,
							},
						}
					: {}),
				revision: order.revision,
				warnings: cancelled
					? []
					: ["The PDF job is no longer cancellable. Refresh its status."],
				allowedNextActions: [
					{ toolId: "documents_get_sales_pdf_status", toolVersion: 1 },
				],
			});
		},
	}),
	definition({
		toolId: "analytics_query",
		version: 1,
		domain: "finance",
		title: "Analyze business data",
		description:
			"Run a reviewed, permission-scoped business metric and return a KPI, table, or chart.",
		capability: "implemented",
		effect: "read",
		requiredGrants: [],
		anyOfGrants: [
			"viewOrders",
			"viewProduction",
			"viewInventory",
			"viewCommunity",
		],
		presentation: {
			group: "Analytics",
			resultComponent: "analytics-result",
			icon: "chart-no-axes-combined",
		},
		inputSchema: assistantAnalyticsQueryIntentSchema,
		outputSchema: assistantAnalyticsResultSchema,
		handler: async (actor, input, services, execution) =>
			resultEnvelope(
				await services.runAnalytics(
					actor,
					input as z.infer<typeof assistantAnalyticsQueryIntentSchema>,
					execution?.signal ?? new AbortController().signal,
				),
			),
	}),
	definition({
		toolId: "finance_summarize_orders",
		version: 1,
		domain: "finance",
		title: "Summarize sales finance",
		description:
			"Summarize authorized order payment, balance, and finance evidence.",
		capability: "coming_soon",
		effect: "read",
		requiredGrants: ["viewOrderPayment"],
		presentation: {
			group: "Finance",
			resultComponent: "finance-summary",
			icon: "chart-no-axes-combined",
		},
		inputSchema: placeholderInputSchema,
		outputSchema: placeholderDataSchema,
	}),
	definition({
		toolId: "employees_find",
		version: 1,
		domain: "employees",
		title: "Find employees",
		description: "Find authorized employee records and work contact details.",
		capability: "coming_soon",
		effect: "read",
		requiredGrants: ["viewEmployee"],
		presentation: {
			group: "Employees",
			resultComponent: "employee-list",
			icon: "user-round-search",
		},
		inputSchema: placeholderInputSchema,
		outputSchema: placeholderDataSchema,
	}),
];

export const assistantToolRegistry: AssistantToolDefinition[] = [
	definition({
		toolId: "system_request_capability",
		version: 1,
		domain: "system",
		title: "Request a missing capability",
		description:
			"Prepare the unavailable-feature review card after tool search confirms that no current capability fulfills the request.",
		capability: "implemented",
		effect: "draft",
		requiredGrants: [],
		presentation: {
			group: "System",
			resultComponent: "feature-request",
			icon: "message-square-plus",
		},
		inputSchema: requestCapabilityInputSchema,
		outputSchema: requestCapabilityDataSchema,
		alwaysActive: true,
		handler(_context, rawInput) {
			const input = requestCapabilityInputSchema.parse(rawInput);
			return {
				status: "not_implemented" as const,
				data: {
					summary: input.summary,
					classifierVersion: "assistant-feature-classifier-v1" as const,
				},
				sources: [],
				observedAt: new Date().toISOString(),
				warnings: [],
				allowedNextActions: [],
			};
		},
	}),
	definition({
		toolId: "system_explain_capability",
		version: 1,
		domain: "system",
		title: "Explain a capability",
		description:
			"Explain whether a registered assistant capability is available.",
		capability: "implemented",
		effect: "read",
		requiredGrants: [],
		presentation: {
			group: "System",
			resultComponent: "capability",
			icon: "info",
		},
		inputSchema: explainCapabilityInputSchema,
		outputSchema: explainCapabilityDataSchema,
		alwaysActive: true,
		handler(context, rawInput) {
			const input = explainCapabilityInputSchema.parse(rawInput);
			const tool = getAssistantToolCatalog(context).find(
				(candidate) => candidate.toolId === input.toolId,
			);
			if (!tool) throw new Error("Assistant capability is not available");
			return resultEnvelope({
				toolId: tool.toolId,
				version: tool.version,
				title: tool.title,
				description: tool.description,
				capability: tool.capability,
				effect: tool.effect,
			});
		},
	}),
	definition({
		toolId: "system_search_tools",
		version: 1,
		domain: "system",
		title: "Search assistant tools",
		description: "Find registered assistant capabilities by intent.",
		capability: "implemented",
		effect: "read",
		requiredGrants: [],
		presentation: {
			group: "System",
			resultComponent: "tool-list",
			icon: "search",
		},
		inputSchema: searchToolsInputSchema,
		outputSchema: searchToolsDataSchema,
		alwaysActive: true,
		handler(context, rawInput) {
			const input = searchToolsInputSchema.parse(rawInput);
			const terms = input.query.toLowerCase().split(/\s+/).filter(Boolean);
			const tools = getAssistantToolCatalog(context)
				.map((tool) => ({
					tool,
					score: terms.filter((term) =>
						`${tool.toolId} ${tool.title} ${tool.description}`
							.toLowerCase()
							.includes(term),
					).length,
				}))
				.filter(({ score }) => score > 0)
				.sort((left, right) => right.score - left.score)
				.slice(0, 12)
				.map(({ tool }) => tool);
			return resultEnvelope({ tools });
		},
	}),
	...salesCustomerDefinitions,
	...placeholders,
];

function isAuthorized(
	actor: AssistantToolActor,
	definition: AssistantToolDefinition,
) {
	return (
		definition.requiredGrants.every((grant) => actor.grants[grant] === true) &&
		(!definition.anyOfGrants?.length ||
			definition.anyOfGrants.some((grant) => actor.grants[grant] === true))
	);
}

export function getExecutableAssistantDefinitions(actor: AssistantToolActor) {
	return assistantToolRegistry.filter(
		(tool) =>
			tool.capability === "implemented" &&
			assistantEffectPolicies[tool.effect].directExecution &&
			isAuthorized(actor, tool) &&
			tool.handler,
	);
}

export function getAssistantPermissionMatrix() {
	return assistantToolRegistry.map((definition) => ({
		toolId: definition.toolId,
		version: definition.version,
		effect: definition.effect,
		requiredGrants: [...definition.requiredGrants],
		anyOfGrants: [...(definition.anyOfGrants ?? [])],
		confirmation: assistantEffectPolicies[definition.effect].confirmation,
		checks: [
			"catalog_visibility",
			"execution",
			"row_selection",
			"field_projection",
			"artifact_retrieval",
			"job_resume",
		] as const,
	}));
}

function publicDefinition(definition: AssistantToolDefinition) {
	return {
		toolId: definition.toolId,
		version: definition.version,
		domain: definition.domain,
		title: definition.title,
		description: definition.description,
		capability: definition.capability,
		effect: definition.effect,
		presentation: definition.presentation,
		relatedTools: definition.relatedTools,
		alwaysActive: definition.alwaysActive === true,
	};
}

export function discoverAssistantTools(actor: AssistantToolActor) {
	return assistantToolRegistry
		.filter(
			(tool) =>
				tool.capability === "implemented" &&
				assistantEffectPolicies[tool.effect].directExecution &&
				isAuthorized(actor, tool),
		)
		.map(publicDefinition)
		.sort((left, right) => left.toolId.localeCompare(right.toolId));
}

export function getAssistantToolCatalog(actor: AssistantToolActor) {
	return assistantToolRegistry
		.filter((tool) => isAuthorized(actor, tool))
		.map(publicDefinition)
		.sort((left, right) => left.toolId.localeCompare(right.toolId));
}

export function getAssistantRegistryPublicDefinitions() {
	return assistantToolRegistry
		.map(publicDefinition)
		.sort((left, right) => left.toolId.localeCompare(right.toolId));
}

export function getAssistantRegistryKnowledgeDefinitions(options?: {
	domain?: string;
	maxSchemaContracts?: number;
}) {
	const contractIds = new Set(
		assistantToolRegistry
			.filter(
				(definition) =>
					!options?.domain ||
					definition.domain === options.domain ||
					definition.alwaysActive === true,
			)
			.sort((left, right) => left.toolId.localeCompare(right.toolId))
			.slice(0, options?.maxSchemaContracts ?? 6)
			.map(({ toolId }) => toolId),
	);
	return assistantToolRegistry
		.map((definition) => ({
			...publicDefinition(definition),
			requiredGrants: [...definition.requiredGrants],
			anyOfGrants: [...(definition.anyOfGrants ?? [])],
			...(contractIds.has(definition.toolId)
				? {
						inputContract: z.toJSONSchema(definition.inputSchema),
						outputContract: z.toJSONSchema(definition.outputSchema),
					}
				: {}),
		}))
		.sort((left, right) => left.toolId.localeCompare(right.toolId));
}

export function getAssistantReleaseAuthority(toolId: string) {
	const definition = assistantToolRegistry.find(
		(candidate) => candidate.toolId === toolId,
	);
	if (!definition) return null;
	return {
		...publicDefinition(definition),
		requiredGrants: [...definition.requiredGrants],
		anyOfGrants: [...(definition.anyOfGrants ?? [])],
	};
}

function assistantResultEnvelope<T = never>(input: {
	status:
		| "success"
		| "partial"
		| "pending"
		| "requires_input"
		| "requires_approval"
		| "unavailable"
		| "denied"
		| "conflict"
		| "failed"
		| "not_implemented";
	data?: T;
	sources?: Array<{ kind: "record"; id: string; label: string }>;
	warnings?: string[];
	entities?: AssistantEntityReference[];
	revision?: string;
	artifact?: {
		id: string;
		status: "queued" | "running" | "ready" | "failed" | "cancelled";
	};
	job?: {
		id: string;
		status:
			| "queued"
			| "running"
			| "retrying"
			| "succeeded"
			| "failed"
			| "cancelled";
	};
	allowedNextActions?: Array<{ toolId: string; toolVersion: number }>;
}) {
	return {
		status: input.status,
		...(input.data === undefined ? {} : { data: input.data }),
		sources: input.sources ?? [],
		observedAt: new Date().toISOString(),
		warnings: input.warnings ?? [],
		...(input.entities?.length ? { entities: input.entities } : {}),
		...(input.revision ? { revision: input.revision } : {}),
		...(input.artifact ? { artifact: input.artifact } : {}),
		...(input.job ? { job: input.job } : {}),
		allowedNextActions: input.allowedNextActions ?? [],
	};
}

function resultEnvelope<T>(data: T) {
	return assistantResultEnvelope({ status: "success", data });
}

export async function executeRegisteredAssistantTool(
	actor: AssistantToolActor,
	input: { toolId: string; version: number; input: unknown },
	serviceOverrides: Partial<AssistantToolServices> = {},
	execution: AssistantToolExecution = {
		signal: new AbortController().signal,
	},
) {
	const definition = assistantToolRegistry.find(
		(tool) => tool.toolId === input.toolId && tool.version === input.version,
	);
	if (
		!definition ||
		definition.capability !== "implemented" ||
		!assistantEffectPolicies[definition.effect].directExecution ||
		!isAuthorized(actor, definition) ||
		!definition.handler
	) {
		throw new Error("Assistant tool is not available");
	}
	const parsedInput = definition.inputSchema.parse(input.input);
	const result = await definition.handler(
		actor,
		parsedInput,
		{
			...defaultAssistantToolServices,
			...serviceOverrides,
		},
		execution,
	);
	return createAssistantResultEnvelopeSchema(definition.outputSchema).parse(
		result,
	);
}

export async function preflightRegisteredAssistantProposal(
	actor: AssistantToolActor,
	input: { toolId: string; version: number; input: unknown },
	serviceOverrides: Partial<AssistantToolServices> = {},
) {
	const definition = assistantToolRegistry.find(
		(tool) => tool.toolId === input.toolId && tool.version === input.version,
	);
	if (
		!definition ||
		definition.capability !== "implemented" ||
		!isAuthorized(actor, definition) ||
		!definition.proposalPreflight
	) {
		throw new Error("Assistant tool is not available");
	}
	const parsedInput = definition.inputSchema.parse(input.input);
	const result = await definition.proposalPreflight(actor, parsedInput, {
		...defaultAssistantToolServices,
		...serviceOverrides,
	});
	return z
		.object({
			ok: z.literal(true),
			targetRevision: z.string().trim().min(1).max(191).optional(),
		})
		.strict()
		.parse(result);
}

export async function executeApprovedAssistantProposal(
	actor: AssistantToolActor,
	input: {
		toolId: string;
		version: number;
		payload: unknown;
		expectedTargetRevision?: string | null;
	},
	serviceOverrides: Partial<AssistantToolServices> = {},
) {
	const definition = assistantToolRegistry.find(
		(tool) => tool.toolId === input.toolId && tool.version === input.version,
	);
	if (
		!definition ||
		definition.capability !== "implemented" ||
		assistantEffectPolicies[definition.effect].confirmation !== "explicit" ||
		!isAuthorized(actor, definition) ||
		!definition.proposalPreflight ||
		!definition.handler
	)
		throw new AssistantProposalPrecommitError(
			"denied",
			"Assistant proposal is not executable",
		);
	const proposalPayload =
		input.expectedTargetRevision &&
		definition.domain === "documents" &&
		input.payload &&
		typeof input.payload === "object" &&
		!Array.isArray(input.payload)
			? { ...input.payload, expectedRevision: input.expectedTargetRevision }
			: input.payload;
	let parsedInput: unknown;
	try {
		parsedInput = definition.inputSchema.parse(proposalPayload);
	} catch {
		throw new AssistantProposalPrecommitError(
			"failed",
			"Assistant proposal payload is invalid",
		);
	}
	const services = { ...defaultAssistantToolServices, ...serviceOverrides };
	let preflight: { ok: true; targetRevision?: string };
	try {
		preflight = await definition.proposalPreflight(
			actor,
			parsedInput,
			services,
		);
	} catch {
		throw new AssistantProposalPrecommitError(
			"conflict",
			"Assistant proposal target is unavailable",
		);
	}
	if (
		input.expectedTargetRevision &&
		preflight.targetRevision !== input.expectedTargetRevision
	)
		throw new AssistantProposalPrecommitError(
			"conflict",
			"Assistant proposal target changed",
		);
	const result = await definition.handler(actor, parsedInput, services);
	return createAssistantResultEnvelopeSchema(definition.outputSchema).parse(
		result,
	);
}

export class AssistantProposalPrecommitError extends Error {
	constructor(
		readonly code: "conflict" | "denied" | "failed",
		message: string,
	) {
		super(message);
		this.name = "AssistantProposalPrecommitError";
	}
}

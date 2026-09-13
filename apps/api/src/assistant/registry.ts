import { createHash } from "node:crypto";
import { db } from "@gnd/db";
import {
	findAssistantCustomers,
	findAssistantSalesOrders,
	getAssistantCustomerOrderHistory,
	getAssistantCustomerSummary,
	getAssistantSalesOrderCandidates,
	getAssistantSalesTimeline,
} from "@gnd/db/queries";
import type { SalesPipelineSnapshot } from "@gnd/sales/sales-pipeline";
import { getSalesPipelineSnapshots } from "@gnd/sales/sales-pipeline-order";
import { z } from "zod";
import {
	type AssistantCapabilityState,
	type AssistantEffect,
	assistantToolIdentitySchema,
	createAssistantResultEnvelopeSchema,
} from "./contracts";

export const ASSISTANT_TOOL_CATALOG_VERSION = "assistant-catalog-v2";

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
) => Promise<unknown> | unknown;

export type AssistantToolDefinition = {
	toolId: string;
	version: number;
	domain: AssistantToolDomain;
	title: string;
	description: string;
	capability: AssistantCapabilityState;
	effect: AssistantEffect;
	requiredGrants: string[];
	presentation: AssistantToolPresentation;
	inputSchema: z.ZodType;
	outputSchema: z.ZodType;
	relatedTools: string[];
	alwaysActive?: boolean;
	handler?: AssistantToolHandler;
};

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

type PageInput = z.infer<typeof pageInputSchema>;
type OrderSearchInput = z.infer<typeof orderSearchInputSchema>;
type OrderIdentityInput = z.infer<typeof orderIdentityInputSchema>;
type TimelineInput = z.infer<typeof timelineInputSchema>;
type CustomerHistoryInput = z.infer<typeof customerHistoryInputSchema>;
type Order = z.infer<typeof orderSchema>;
type DetailedOrder = z.infer<typeof detailedOrderSchema>;
type CustomerSummary = z.infer<typeof customerSummarySchema>;

export type AssistantToolServices = {
	findSalesOrders: (
		actor: AssistantToolActor,
		input: OrderSearchInput,
	) => Promise<{ items: Order[]; nextCursor: number | null }>;
	getSalesOrderCandidates: (
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
			revision: createHash("sha256")
				.update(`${order.revision}:${snapshot.revision}`)
				.digest("hex")
				.slice(0, 24),
		};
	});
}

const defaultAssistantToolServices: AssistantToolServices = {
	findSalesOrders: (actor, input) => findAssistantSalesOrders(db, actor, input),
	getSalesOrderCandidates: async (actor, input) =>
		loadCanonicalSalesOrders(
			await getAssistantSalesOrderCandidates(db, actor, input),
		),
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
			allowedNextActions: [
				{ toolId: "sales_get_order_status", toolVersion: 1 },
			],
		});
	}
	return assistantResultEnvelope({
		status: "success",
		data: { order, candidates: [] },
		sources: [orderSource(order)],
		entities: [orderEntity(order)],
		revision: order.revision,
		allowedNextActions: [
			{ toolId: "sales_explain_blockers", toolVersion: 1 },
			{ toolId: "sales_get_timeline", toolVersion: 1 },
		],
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

const placeholders: AssistantToolDefinition[] = [
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
		capability: "coming_soon",
		effect: "read",
		requiredGrants: ["viewInventory"],
		presentation: {
			group: "Inventory",
			resultComponent: "inventory-status",
			icon: "boxes",
		},
		inputSchema: placeholderInputSchema,
		outputSchema: placeholderDataSchema,
	}),
	definition({
		toolId: "production_check_status",
		version: 1,
		domain: "production",
		title: "Check production status",
		description:
			"Read the current manufacturing or Production stage and its evidence.",
		capability: "coming_soon",
		effect: "read",
		requiredGrants: ["viewProduction"],
		presentation: {
			group: "Production",
			resultComponent: "production-status",
			icon: "factory",
		},
		inputSchema: placeholderInputSchema,
		outputSchema: placeholderDataSchema,
	}),
	definition({
		toolId: "fulfillment_check_status",
		version: 1,
		domain: "fulfillment",
		title: "Check fulfillment status",
		description: "Read canonical packing, pickup, and delivery state.",
		capability: "coming_soon",
		effect: "read",
		requiredGrants: ["viewOrders"],
		presentation: {
			group: "Fulfillment",
			resultComponent: "fulfillment-status",
			icon: "truck",
		},
		inputSchema: placeholderInputSchema,
		outputSchema: placeholderDataSchema,
	}),
	definition({
		toolId: "community_search",
		version: 1,
		domain: "community",
		title: "Search Community",
		description:
			"Find authorized Community discussions, content, and reusable templates.",
		capability: "coming_soon",
		effect: "read",
		requiredGrants: ["viewCommunity"],
		presentation: {
			group: "Community",
			resultComponent: "community-results",
			icon: "messages",
		},
		inputSchema: placeholderInputSchema,
		outputSchema: placeholderDataSchema,
	}),
	definition({
		toolId: "documents_generate_pdf",
		version: 1,
		domain: "documents",
		title: "Generate PDF",
		description: "Generate a canonical private PDF artifact.",
		capability: "coming_soon",
		effect: "artifact",
		requiredGrants: ["viewOrders"],
		presentation: {
			group: "Documents",
			resultComponent: "document",
			icon: "file-text",
		},
		inputSchema: placeholderInputSchema,
		outputSchema: placeholderDataSchema,
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
	return definition.requiredGrants.every(
		(grant) => actor.grants[grant] === true,
	);
}

export function getExecutableAssistantDefinitions(actor: AssistantToolActor) {
	return assistantToolRegistry.filter(
		(tool) =>
			tool.capability === "implemented" &&
			isAuthorized(actor, tool) &&
			tool.handler,
	);
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
			(tool) => tool.capability === "implemented" && isAuthorized(actor, tool),
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

function assistantResultEnvelope<T = never>(input: {
	status: "success" | "partial" | "requires_input" | "unavailable" | "conflict";
	data?: T;
	sources?: Array<{ kind: "record"; id: string; label: string }>;
	warnings?: string[];
	entities?: Array<
		| {
				kind: "order";
				id: string;
				label: string;
				salesType?: "order" | "quote";
		  }
		| { kind: "customer"; id: string; label: string }
	>;
	revision?: string;
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
) {
	const definition = assistantToolRegistry.find(
		(tool) => tool.toolId === input.toolId && tool.version === input.version,
	);
	if (
		!definition ||
		definition.capability !== "implemented" ||
		!isAuthorized(actor, definition) ||
		!definition.handler
	) {
		throw new Error("Assistant tool is not available");
	}
	const parsedInput = definition.inputSchema.parse(input.input);
	const result = await definition.handler(actor, parsedInput, {
		...defaultAssistantToolServices,
		...serviceOverrides,
	});
	return createAssistantResultEnvelopeSchema(definition.outputSchema).parse(
		result,
	);
}

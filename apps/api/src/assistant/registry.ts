import { z } from "zod";
import {
	type AssistantCapabilityState,
	type AssistantEffect,
	assistantToolIdentitySchema,
	createAssistantResultEnvelopeSchema,
} from "./contracts";

export const ASSISTANT_TOOL_CATALOG_VERSION = "assistant-catalog-v1";

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

const placeholders: AssistantToolDefinition[] = [
	definition({
		toolId: "sales_find_orders",
		version: 1,
		domain: "sales",
		title: "Find sales orders",
		description: "Find authorized sales orders by order number or customer.",
		capability: "coming_soon",
		effect: "read",
		requiredGrants: ["viewOrders"],
		presentation: {
			group: "Sales",
			resultComponent: "order-list",
			icon: "search",
		},
		inputSchema: placeholderInputSchema,
		outputSchema: placeholderDataSchema,
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
		toolId: "customers_find",
		version: 1,
		domain: "customers",
		title: "Find customers",
		description: "Find authorized customer records.",
		capability: "coming_soon",
		effect: "read",
		requiredGrants: ["viewCustomers"],
		presentation: {
			group: "Customers",
			resultComponent: "customer-list",
			icon: "users",
		},
		inputSchema: placeholderInputSchema,
		outputSchema: placeholderDataSchema,
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

function resultEnvelope<T>(data: T) {
	return {
		status: "success" as const,
		data,
		sources: [],
		observedAt: new Date().toISOString(),
		warnings: [],
		allowedNextActions: [],
	};
}

export async function executeRegisteredAssistantTool(
	actor: AssistantToolActor,
	input: { toolId: string; version: number; input: unknown },
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
	const result = await definition.handler(actor, parsedInput);
	return createAssistantResultEnvelopeSchema(definition.outputSchema).parse(
		result,
	);
}

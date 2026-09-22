import { describe, expect, test } from "bun:test";
import {
	ASSISTANT_TOOL_CATALOG_VERSION,
	assistantToolRegistry,
	discoverAssistantTools,
	executeRegisteredAssistantTool,
	getAssistantToolCatalog,
	getExecutableAssistantDefinitions,
	preflightRegisteredAssistantProposal,
} from "./registry";

const actor = {
	userId: 42,
	scopeType: "organization",
	scopeId: "7",
	grants: { viewOrders: true, viewOrderPayment: true, editOrders: false },
};

describe("assistant tool registry", () => {
	test("routes customer request drafts through the dedicated Assistant conversation", () => {
		const salesActor = {
			...actor,
			grants: { ...actor.grants, editOrders: true },
		};
		expect(
			discoverAssistantTools(salesActor).some(
				(tool) => tool.toolId === "sales_draft_from_request",
			),
		).toBe(false);
		expect(
			getExecutableAssistantDefinitions(salesActor).some(
				(tool) => tool.toolId === "sales_draft_from_request",
			),
		).toBe(false);
		expect(
			getAssistantToolCatalog(salesActor).some(
				(tool) => tool.toolId === "sales_draft_from_request",
			),
		).toBe(true);
	});
	test("returns schema-valid discovery results without internal catalog metadata", async () => {
		const result = await executeRegisteredAssistantTool(actor, {
			toolId: "system_search_tools",
			version: 1,
			input: { query: "sales" },
		});
		expect(result).toMatchObject({
			status: "success",
			data: {
				tools: expect.arrayContaining([
					expect.objectContaining({ toolId: "sales_find_orders" }),
				]),
			},
		});
		expect(JSON.stringify(result)).not.toContain('"presentation"');
		expect(JSON.stringify(result)).not.toContain('"sales_create_order"');
	});

	test("keeps one unique versioned definition for every platform surface", () => {
		const identities = assistantToolRegistry.map(
			(tool) => `${tool.toolId}@${tool.version}`,
		);

		expect(new Set(identities).size).toBe(identities.length);
		expect(ASSISTANT_TOOL_CATALOG_VERSION).toBe("assistant-catalog-v12");
		for (const tool of assistantToolRegistry) {
			expect(tool.toolId).toMatch(/^[a-z][a-z0-9]*_[a-z][a-z0-9_]*$/);
			expect(tool.version).toBeGreaterThan(0);
			expect(tool.inputSchema).toBeDefined();
			expect(tool.outputSchema).toBeDefined();
			expect(tool.presentation).toBeDefined();
		}
	});

	test("authorizes and filters availability before model discovery", () => {
		const discovered = discoverAssistantTools(actor);

		expect(discovered.map((tool) => tool.toolId)).toEqual([
			"analytics_query",
			"customers_find",
			"customers_get_order_history",
			"customers_get_summary",
			"documents_get_sales_pdf_status",
			"finance_get_refund_overview",
			"finance_summarize_orders",
			"fulfillment_check_status",
			"fulfillment_explain_exceptions",
			"sales_explain_blockers",
			"sales_find_orders",
			"sales_get_order_status",
			"sales_get_timeline",
			"system_explain_capability",
			"system_request_capability",
			"system_search_tools",
		]);
		expect(discovered.every((tool) => tool.capability === "implemented")).toBe(
			true,
		);
		expect(discovered.every((tool) => tool.handler === undefined)).toBe(true);
	});

	test("uses the same registry for the UI catalog including unavailable states", () => {
		const catalog = getAssistantToolCatalog(actor);
		const findOrders = catalog.find(
			(tool) => tool.toolId === "sales_find_orders",
		);
		const createOrder = catalog.find(
			(tool) => tool.toolId === "sales_create_order",
		);

		expect(findOrders?.capability).toBe("implemented");
		expect(createOrder).toBeUndefined();
		expect(catalog.every((tool) => !("handler" in tool))).toBe(true);
	});

	test("fails closed for disabled tool domains and effects", async () => {
		const readOnlyEnvironment = {
			ASSISTANT_DISABLED_TOOL_DOMAINS: "sales, customers",
			ASSISTANT_DISABLED_TOOL_EFFECTS:
				"draft, artifact, write, external_send, destructive",
		};
		const discovered = discoverAssistantTools(actor, readOnlyEnvironment);
		const catalog = getAssistantToolCatalog(actor, readOnlyEnvironment);
		const canaryTools = discoverAssistantTools(actor, {
			ASSISTANT_READ_ONLY_CANARY: "true",
		});
		const canaryCatalog = getAssistantToolCatalog(actor, {
			ASSISTANT_READ_ONLY_CANARY: "true",
		});

		expect(discovered.some((tool) => tool.domain === "sales")).toBe(false);
		expect(canaryTools.every((tool) => tool.effect === "read")).toBe(true);
		expect(
			canaryCatalog.find((tool) => tool.toolId === "sales_draft_from_request")
				?.capability,
		).toBeUndefined();
		expect(
			catalog.find((tool) => tool.toolId === "sales_find_orders")?.capability,
		).toBe("disabled");
		await expect(
			executeRegisteredAssistantTool(
				actor,
				{
					toolId: "sales_find_orders",
					version: 1,
					input: { query: "09502PC" },
				},
				{},
				{ signal: new AbortController().signal },
				readOnlyEnvironment,
			),
		).rejects.toThrow("not available");
		await expect(
			preflightRegisteredAssistantProposal(
				actor,
				{
					toolId: "documents_generate_pdf",
					version: 1,
					input: {
						orderNo: "09502PC",
						mode: "invoice",
						expectedRevision: "revision-1",
						forceRegenerate: false,
					},
				},
				{},
				{ ASSISTANT_READ_ONLY_CANARY: "true" },
			),
		).rejects.toThrow("not available");
	});

	test("reauthorizes handlers and validates their typed result envelope", async () => {
		const result = await executeRegisteredAssistantTool(actor, {
			toolId: "system_explain_capability",
			version: 1,
			input: { toolId: "sales_find_orders" },
		});

		expect(result).toMatchObject({
			status: "success",
			data: {
				toolId: "sales_find_orders",
				capability: "implemented",
			},
		});
		await expect(
			executeRegisteredAssistantTool(
				{ ...actor, grants: { viewOrders: false } },
				{
					toolId: "sales_find_orders",
					version: 1,
					input: { query: "09502PC" },
				},
			),
		).rejects.toThrow("not available");
	});

	test("rejects unknown model arguments at the registry boundary", async () => {
		await expect(
			executeRegisteredAssistantTool(actor, {
				toolId: "system_search_tools",
				version: 1,
				input: { query: "orders", unreviewed: true },
			}),
		).rejects.toThrow();
	});
});

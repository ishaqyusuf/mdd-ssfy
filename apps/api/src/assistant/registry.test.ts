import { describe, expect, test } from "bun:test";
import {
	ASSISTANT_TOOL_CATALOG_VERSION,
	assistantToolRegistry,
	discoverAssistantTools,
	executeRegisteredAssistantTool,
	getAssistantToolCatalog,
} from "./registry";

const actor = {
	userId: 42,
	scopeType: "organization",
	scopeId: "7",
	grants: { viewOrders: true, editOrders: false },
};

describe("assistant tool registry", () => {
	test("keeps one unique versioned definition for every platform surface", () => {
		const identities = assistantToolRegistry.map(
			(tool) => `${tool.toolId}@${tool.version}`,
		);

		expect(new Set(identities).size).toBe(identities.length);
		expect(ASSISTANT_TOOL_CATALOG_VERSION).toBe("assistant-catalog-v4");
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
			"documents_get_sales_pdf_status",
			"fulfillment_check_status",
			"fulfillment_explain_exceptions",
			"sales_explain_blockers",
			"sales_find_orders",
			"sales_get_order_status",
			"sales_get_timeline",
			"system_explain_capability",
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

import { describe, expect, test } from "bun:test";
import { createAssistantMcpExecutionClient } from "./mcp";

describe("assistant in-memory MCP", () => {
	test("creates a request-owned execution client with public definitions", async () => {
		const session = await createAssistantMcpExecutionClient({
			userId: 42,
			scopeType: "organization",
			scopeId: "7",
			grants: { viewOrders: true },
		});

		expect(session.definitions.tools.map((tool) => tool.name).sort()).toEqual([
			"sales_explain_blockers",
			"sales_find_orders",
			"sales_get_order_status",
			"sales_get_timeline",
			"system_explain_capability",
			"system_search_tools",
		]);
		expect(Object.keys(session.tools).sort()).toEqual([
			"sales_explain_blockers",
			"sales_find_orders",
			"sales_get_order_status",
			"sales_get_timeline",
			"system_explain_capability",
			"system_search_tools",
		]);
		expect(session.toolEffects).toEqual({
			sales_explain_blockers: "read",
			sales_find_orders: "read",
			sales_get_order_status: "read",
			sales_get_timeline: "read",
			system_explain_capability: "read",
			system_search_tools: "read",
		});
		expect(
			session.definitions.tools.every(
				(tool) => !("handler" in tool) && !("grants" in tool),
			),
		).toBe(true);

		await session.close();
		await session.close();
	});

	test("reauthorizes the actor and scope when a tool actually executes", async () => {
		const actor = {
			userId: 42,
			scopeType: "organization",
			scopeId: "7",
			grants: {},
		};
		const session = await createAssistantMcpExecutionClient(
			actor,
			async () => ({
				...actor,
				scopeId: "8",
			}),
		);
		const execute = session.tools.system_explain_capability?.execute as
			| ((input: unknown, options: unknown) => Promise<unknown>)
			| undefined;

		const result = await execute?.(
			{ toolId: "system_search_tools" },
			{
				toolCallId: "call-1",
				messages: [],
				abortSignal: new AbortController().signal,
			},
		);
		expect(result).toMatchObject({
			isError: true,
			content: [
				{ type: "text", text: "Assistant actor scope is no longer available" },
			],
		});
		await session.close();
	});
});

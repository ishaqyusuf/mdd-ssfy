import { describe, expect, mock, test } from "bun:test";
import { createAssistantMcpExecutionClient } from "./mcp";

describe("assistant in-memory MCP", () => {
	test("creates a request-owned execution client with public definitions", async () => {
		const session = await createAssistantMcpExecutionClient({
			userId: 42,
			scopeType: "organization",
			scopeId: "7",
			grants: { viewOrders: true, viewOrderPayment: true },
		});

		expect(session.definitions.tools.map((tool) => tool.name).sort()).toEqual([
			"analytics_query",
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
		expect(Object.keys(session.tools).sort()).toEqual([
			"analytics_query",
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
		expect(session.toolEffects).toEqual({
			analytics_query: "read",
			documents_get_sales_pdf_status: "read",
			fulfillment_check_status: "read",
			fulfillment_explain_exceptions: "read",
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
		const record = mock(async () => {
			throw new Error("database unavailable");
		});
		const originalConsoleError = console.error;
		const logged: unknown[][] = [];
		console.error = (...args: unknown[]) => logged.push(args);
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
			record,
		);
		const execute = session.tools.system_explain_capability?.execute as
			| ((input: unknown, options: unknown) => Promise<unknown>)
			| undefined;

		let result: unknown;
		try {
			result = await execute?.(
				{ toolId: "system_search_tools" },
				{
					toolCallId: "call-1",
					messages: [],
					abortSignal: new AbortController().signal,
				},
			);
		} finally {
			console.error = originalConsoleError;
		}
		expect(result).toMatchObject({
			isError: true,
			content: [
				{ type: "text", text: "Assistant actor scope is no longer available" },
			],
		});
		expect(record).toHaveBeenCalledTimes(1);
		expect(record.mock.calls[0]?.[0]).toMatchObject({
			status: "failed",
			toolId: "system_explain_capability",
		});
		expect(record.mock.calls[0]?.[0]).not.toHaveProperty("result");
		expect(logged).toContainEqual([
			"Unable to record failed Assistant tool execution",
			expect.objectContaining({
				code: "assistant_tool_execution_record_failed",
				toolId: "system_explain_capability",
			}),
		]);
		expect(JSON.stringify(logged)).not.toContain("database unavailable");
		await session.close();
	});

	test("reports ordinary trusted tool executions for durable save eligibility", async () => {
		const record = mock(async () => undefined);
		const actor = {
			userId: 42,
			scopeType: "organization",
			scopeId: "7",
			grants: {},
		};
		const session = await createAssistantMcpExecutionClient(
			actor,
			async () => actor,
			record,
		);
		const execute = session.tools.system_search_tools?.execute as
			| ((input: unknown, options: unknown) => Promise<unknown>)
			| undefined;
		await execute?.(
			{ query: "sales" },
			{
				toolCallId: "provider-call-1",
				messages: [],
				abortSignal: new AbortController().signal,
			},
		);
		expect(record).toHaveBeenCalledTimes(1);
		expect(record.mock.calls[0]?.[0]).toMatchObject({
			toolId: "system_search_tools",
			toolVersion: 1,
			effect: "read",
			status: "succeeded",
			toolInput: { query: "sales" },
		});
		await session.close();
	});

	test("allocates distinct durable steps for concurrent tool calls", async () => {
		const steps: number[] = [];
		const actor = {
			userId: 42,
			scopeType: "organization",
			scopeId: "7",
			grants: {},
		};
		const session = await createAssistantMcpExecutionClient(
			actor,
			async () => actor,
			async (execution) => {
				await Promise.resolve();
				steps.push(execution.step);
			},
		);
		const execute = session.tools.system_search_tools?.execute as
			| ((input: unknown, options: unknown) => Promise<unknown>)
			| undefined;
		await Promise.all([
			execute?.(
				{ query: "sales" },
				{
					toolCallId: "provider-call-1",
					messages: [],
					abortSignal: new AbortController().signal,
				},
			),
			execute?.(
				{ query: "inventory" },
				{
					toolCallId: "provider-call-2",
					messages: [],
					abortSignal: new AbortController().signal,
				},
			),
		]);
		expect(steps.sort()).toEqual([1, 2]);
		await session.close();
	});
});

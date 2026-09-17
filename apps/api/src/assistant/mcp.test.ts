import { describe, expect, mock, test } from "bun:test";
import { AssistantAccessDisabledError } from "./access-governance";
import { createAssistantMcpExecutionClient } from "./mcp";

describe("assistant in-memory MCP", () => {
	test("denies tool execution when website access is disabled mid-run", async () => {
		const actor = { userId: 42, scopeType: "organization", scopeId: "7", grants: {} };
		const session = await createAssistantMcpExecutionClient(actor, async () => {
			throw new AssistantAccessDisabledError();
		});
		try {
			const execute = session.tools.system_search_tools?.execute as (input: unknown, options: unknown) => Promise<unknown>;
			const result = await execute({ query: "sales" }, { toolCallId: "disabled-call", messages: [], abortSignal: new AbortController().signal });
			expect(result).toMatchObject({ isError: true, _meta: { assistantOutcome: { kind: "denied" } } });
		} finally { await session.close(); }
	});

	test("recovery reauthorizes before retry and records the recovered read", async () => {
		const actor = { userId: 42, scopeType: "organization", scopeId: "7", grants: {} };
		let checks = 0;
		const records: unknown[] = [];
		const captures: unknown[] = [];
		const session = await createAssistantMcpExecutionClient(actor,
			async () => { if (++checks === 1) throw Object.assign(new Error("private database failure"), { code: "ECONNRESET" }); return actor; },
			async record => { records.push(record); },
			async (error, context) => { captures.push({ error, context }); return { reference: "ERR-RETRY00001" }; },
		);
		try {
			const execute = session.tools.system_search_tools?.execute as (input: unknown, options: unknown) => Promise<unknown>;
			const result = await execute({ query: "sales" }, { toolCallId: "retry-call", messages: [], abortSignal: new AbortController().signal });
			expect(checks).toBe(2);
			expect(captures).toHaveLength(1);
			expect(result).not.toHaveProperty("isError", true);
			expect(JSON.stringify(result)).not.toContain("private database failure");
			expect(records).toHaveLength(1);
			expect(records[0]).toMatchObject({ status: "succeeded", recovery: { attemptCount: 2, firstFailureReference: "ERR-RETRY00001" } });
		} finally { await session.close(); }
	});

	test("a changed scope during recovery prevents the retried read", async () => {
		const actor = { userId: 42, scopeType: "organization", scopeId: "7", grants: {} };
		let checks = 0;
		const session = await createAssistantMcpExecutionClient(actor,
			async () => { if (++checks === 1) throw Object.assign(new Error("network"), { code: "ECONNRESET" }); return { ...actor, scopeId: "8" }; },
		);
		try {
			const execute = session.tools.system_search_tools?.execute as (input: unknown, options: unknown) => Promise<unknown>;
			const result = await execute({ query: "sales" }, { toolCallId: "scope-retry", messages: [], abortSignal: new AbortController().signal });
			expect(checks).toBe(2);
			expect(result).toMatchObject({ isError: true, _meta: { assistantOutcome: { kind: "denied" } } });
			expect(result).not.toHaveProperty("structuredContent");
		} finally { await session.close(); }
	});

	test("captures both transient failure attempts and returns only safe copy and the final reference", async () => {
		const original = Object.assign(new Error("SQL password=secret customer=private"), { code: "P2024" });
		const captures: unknown[] = [];
		const session = await createAssistantMcpExecutionClient(
			{ userId: 42, scopeType: "organization", scopeId: "7", grants: {} },
			async () => { throw original; },
			undefined,
			async (error, context) => {
				captures.push({ error, context });
				return {
					reference: captures.length === 1 ? "ERR-RETRY00001" : "ERR-ABCDEFGHIJ",
					...(captures.length === 2
						? {
								retryId: "d9428888-122b-11e1-b85c-61cd3cbb3210",
								retryExpiresAt: "2099-01-01T00:00:00.000Z",
							}
						: {}),
				};
			},
		);
		try {
			const execute = session.tools.system_search_tools?.execute as (input: unknown, options: unknown) => Promise<unknown>;
			const result = await execute({ query: "sales" }, { toolCallId: "call-1", messages: [], abortSignal: new AbortController().signal });
			expect(captures).toHaveLength(2);
			expect(captures[0]).toMatchObject({ error: original, context: { toolId: "system_search_tools", outcome: "temporary", effect: "read" } });
			expect(captures[0]).toMatchObject({ context: { attempt: 1, retrying: true } });
			expect(captures[1]).toMatchObject({
				context: {
					attempt: 2,
					toolVersion: 1,
					toolInput: { query: "sales" },
				},
			});
			expect(result).toMatchObject({ isError: true, content: [{ type: "text", text: "I couldn't check that right now. Please try again." }], _meta: { assistantOutcome: { kind: "temporary", reference: "ERR-ABCDEFGHIJ" }, assistantReadRetryId: "d9428888-122b-11e1-b85c-61cd3cbb3210", assistantReadRetryExpiresAt: "2099-01-01T00:00:00.000Z" } });
			for (const secret of ["SQL", "password", "private", "P2024"]) expect(JSON.stringify(result)).not.toContain(secret);
		} finally { await session.close(); }
	});
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
		expect(Object.keys(session.tools).sort()).toEqual([
			"analytics_query",
			"documents_get_sales_pdf_status",
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
		expect(session.toolEffects).toEqual({
			analytics_query: "read",
			documents_get_sales_pdf_status: "read",
			finance_summarize_orders: "read",
			fulfillment_check_status: "read",
			fulfillment_explain_exceptions: "read",
			sales_explain_blockers: "read",
			sales_find_orders: "read",
			sales_get_order_status: "read",
			sales_get_timeline: "read",
			system_explain_capability: "read",
			system_request_capability: "draft",
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
				{ type: "text", text: "You don't have access to this information." },
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

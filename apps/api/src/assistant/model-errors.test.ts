import { expect, test } from "bun:test";
import type { ModelMessage } from "ai";
import {
	assistantModelSafeMessages,
	prepareAssistantSafeStep,
} from "./model-errors";

test("SDK input errors and MCP failure envelopes cannot enter the next model step", () => {
	const messages: ModelMessage[] = [
		{
			role: "tool",
			content: [
				{
					type: "tool-result",
					toolCallId: "one",
					toolName: "sales_find_orders",
					output: {
						type: "error-text",
						value: "SQL password=secret invalid schema customerEmail=private",
					},
				},
				{
					type: "tool-result",
					toolCallId: "two",
					toolName: "sales_get_order_status",
					output: {
						type: "json",
						value: {
							structuredContent: {
								status: "failed",
								warnings: ["private SQL parameters"],
								data: { password: "secret" },
							},
							content: [{ text: "private MCP error" }],
						},
					},
				},
				{
					type: "tool-result",
					toolCallId: "three",
					toolName: "sales_find_orders",
					output: {
						type: "json",
						value: {
							isError: true,
							content: [{ text: "private SDK schema failure" }],
						},
					},
				},
			],
		},
	];
	const safe = assistantModelSafeMessages(messages);
	const serialized = JSON.stringify(safe);
	for (const value of [
		"SQL",
		"password",
		"secret",
		"schema",
		"private",
		"customerEmail",
	])
		expect(serialized).not.toContain(value);
	expect(serialized).toContain("This check could not be completed");
	expect(serialized).toContain('"outcome":"temporary"');
	expect(JSON.stringify(messages)).toContain("password=secret");
});

test("preserves successful business output and tool selection while sanitizing overridden messages", async () => {
	const result: ModelMessage = {
		role: "tool",
		content: [
			{
				type: "tool-result",
				toolCallId: "one",
				toolName: "sales_find_orders",
				output: {
					type: "json",
					value: {
						structuredContent: {
							status: "success",
							data: { items: [{ orderId: "123", amountDue: 245 }] },
						},
					},
				},
			},
		],
	};
	const prepared = await prepareAssistantSafeStep(
		async () => ({ activeTools: ["sales_find_orders"], messages: [result] }),
		{ messages: [] },
	);
	expect(prepared).toEqual({
		activeTools: ["sales_find_orders"],
		messages: [result],
	});
});

import { describe, expect, test } from "bun:test";
import {
	formatAssistantToolLabel,
	normalizeAssistantMessage,
} from "./assistant-message-view-model";

describe("assistant message view model", () => {
	test("normalizes mixed AI SDK parts without exposing reasoning text", () => {
		const view = normalizeAssistantMessage(
			{
				id: "message-1",
				role: "assistant",
				parts: [
					{
						type: "reasoning",
						text: "private chain of thought",
						state: "done",
					},
					{
						type: "tool-orders_search",
						toolCallId: "call-1",
						state: "output-available",
						output: { private: "payload" },
					},
					{ type: "text", text: "## Order found\n\nReady for pickup." },
					{
						type: "source-url",
						sourceId: "source-1",
						url: "https://example.com/order",
						title: "Public status guide",
					},
					{
						type: "file",
						url: "document-1",
						mediaType: "application/pdf",
						filename: "status.pdf",
					},
				],
			},
			{ isLastMessage: true, isStreaming: false },
		);

		expect(view.text).toBe("## Order found\n\nReady for pickup.");
		expect(view.reasoningStatus).toBe("complete");
		expect(JSON.stringify(view)).not.toContain("private chain of thought");
		expect(JSON.stringify(view)).not.toContain("payload");
		expect(view.tools).toEqual([
			{
				id: "call-1",
				name: "orders_search",
				label: "Searching orders",
				status: "complete",
			},
		]);
		expect(view.sources).toEqual([
			{
				id: "source-1",
				label: "Public status guide",
				url: "https://example.com/order",
				scope: "public",
				observedAt: null,
				freshness: null,
			},
		]);
		expect(view.files).toEqual([
			{
				id: "document-1",
				name: "status.pdf",
				mediaType: "application/pdf",
			},
		]);
	});

	test("maps tool lifecycle and typed response cards", () => {
		const view = normalizeAssistantMessage(
			{
				id: "message-2",
				role: "assistant",
				parts: [
					{
						type: "dynamic-tool",
						toolName: "orders_create",
						toolCallId: "call-queued",
						state: "input-streaming",
					},
					{
						type: "dynamic-tool",
						toolName: "customers_get",
						toolCallId: "call-approval",
						state: "approval-requested",
					},
					{
						type: "data-assistant-tool",
						data: {
							id: "call-failed",
							name: "inventory_list",
							status: "failed",
						},
					},
					{
						type: "data-assistant-card",
						data: {
							kind: "partial",
							title: "Some records are unavailable",
							description: "Two sources could not be reached.",
							actionLabel: "Retry",
						},
					},
				],
			},
			{ isLastMessage: true, isStreaming: true },
		);

		expect(view.tools.map(({ status }) => status)).toEqual([
			"queued",
			"approval-required",
			"failed",
		]);
		expect(view.cards).toEqual([
			{
				kind: "partial",
				title: "Some records are unavailable",
				description: "Two sources could not be reached.",
				actionLabel: "Retry",
			},
		]);
	});

	test("drops malformed parts and unsafe external sources", () => {
		const view = normalizeAssistantMessage(
			{
				id: "message-3",
				role: "assistant",
				parts: [
					{ type: "text", text: 42 },
					{ type: "source-url", sourceId: "bad", url: "javascript:alert(1)" },
					{ type: "dynamic-tool", toolName: "", toolCallId: "", state: null },
					{ type: "data-assistant-card", data: { kind: "unknown" } },
				],
			},
			{ isLastMessage: true, isStreaming: true },
		);

		expect(view.text).toBe("");
		expect(view.sources).toEqual([]);
		expect(view.tools).toEqual([]);
		expect(view.cards).toEqual([]);
		expect(view.showThinking).toBe(true);
	});

	test("formats unknown GND tool names deterministically", () => {
		expect(formatAssistantToolLabel("inventory_list")).toBe(
			"Looking up inventory",
		);
		expect(formatAssistantToolLabel("custom_complex_action")).toBe(
			"Custom Complex Action",
		);
	});

	test("bounds a long source stream to the newest safe citation set", () => {
		const view = normalizeAssistantMessage(
			{
				id: "message-long",
				role: "assistant",
				parts: Array.from({ length: 25 }, (_, index) => ({
					type: "data-source",
					data: {
						id: `source-${index}`,
						label: `Source ${index}`,
						url: `https://example.com/${index}`,
						freshness: "current",
					},
				})),
			},
			{ isLastMessage: true, isStreaming: true },
		);

		expect(view.sources.length).toBe(8);
		expect(view.sources[0]?.id).toBe("source-0");
	});

	test("keeps linked record citations labelled as workspace sources", () => {
		const view = normalizeAssistantMessage(
			{
				parts: [
					{
						type: "data-source",
						data: {
							kind: "record",
							id: "order-1",
							label: "Order 1",
							url: "https://gndprodesk.localhost/orders/1",
						},
					},
				],
			},
			{ isLastMessage: false, isStreaming: false },
		);
		expect(view.sources[0]?.scope).toBe("workspace");
	});
});

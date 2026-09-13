import { describe, expect, test } from "bun:test";
import type { UIMessage } from "ai";
import { renderToStaticMarkup } from "react-dom/server";
import { AssistantMessageRenderer } from "./assistant-message-renderer";

describe("AssistantMessageRenderer", () => {
	test("announces thinking and tool progress without rendering reasoning text", () => {
		const html = renderToStaticMarkup(
			<AssistantMessageRenderer
				message={
					{
						id: "message-1",
						role: "assistant",
						parts: [
							{
								type: "reasoning",
								text: "private reasoning",
								state: "streaming",
							},
						],
					} as UIMessage
				}
				isStreaming
				isLastMessage
			/>,
		);

		expect(html).toContain('aria-label="Assistant is thinking"');
		expect(html).toContain("Reasoning…");
		expect(html).not.toContain("private reasoning");
	});

	test("renders typed permission state and safe source metadata", () => {
		const html = renderToStaticMarkup(
			<AssistantMessageRenderer
				message={
					{
						id: "message-2",
						role: "assistant",
						parts: [
							{ type: "text", text: "Review required." },
							{
								type: "data-assistant-card",
								data: {
									kind: "permission",
									title: "Access required",
									description: "Ask an administrator for access.",
								},
							},
							{
								type: "source-url",
								sourceId: "source-1",
								title: "Public guide",
								url: "https://example.com/guide",
							},
						],
					} as UIMessage
				}
				isStreaming={false}
				isLastMessage={false}
			/>,
		);

		expect(html).toContain("Access required");
		expect(html).toContain('aria-label="Response sources"');
		expect(html).toContain('href="https://example.com/guide"');
		expect(html).toContain("Public guide");
	});

	test("labels linked GND record citations as workspace sources", () => {
		const html = renderToStaticMarkup(
			<AssistantMessageRenderer
				message={
					{
						id: "message-workspace-source",
						role: "assistant",
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
					} as UIMessage
				}
				isStreaming={false}
				isLastMessage={false}
			/>,
		);
		expect(html).toContain("Workspace");
		expect(html).not.toContain(">Public<");
		expect(html).toContain('href="https://gndprodesk.localhost/orders/1"');
	});

	test("does not turn unsafe markdown protocols into links", () => {
		const html = renderToStaticMarkup(
			<AssistantMessageRenderer
				message={
					{
						id: "message-3",
						role: "assistant",
						parts: [
							{
								type: "text",
								text: "[Unsafe](javascript:alert(1)) and [safe](https://example.com)",
							},
						],
					} as UIMessage
				}
				isStreaming={false}
				isLastMessage={false}
			/>,
		);

		expect(html).not.toContain('href="javascript:');
		expect(html).toContain('href="https://example.com/"');
	});

	test("blocks remote and data images embedded in assistant markdown", () => {
		const html = renderToStaticMarkup(
			<AssistantMessageRenderer
				message={
					{
						id: "message-images",
						role: "assistant",
						parts: [
							{
								type: "text",
								text: "![tracker](https://attacker.example/pixel) ![inline](data:image/svg+xml,bad)",
							},
						],
					} as UIMessage
				}
				isStreaming={false}
				isLastMessage={false}
			/>,
		);

		expect(html).not.toContain("<img");
		expect(html).not.toContain("attacker.example");
		expect(html).not.toContain("data:image");
	});

	test("renders explicit grouped tool states and an actionable recovery card", () => {
		const html = renderToStaticMarkup(
			<AssistantMessageRenderer
				message={
					{
						id: "message-tools",
						role: "assistant",
						parts: [
							{
								type: "data-assistant-tool",
								data: { id: "a", name: "orders_search", status: "failed" },
							},
							{
								type: "data-assistant-tool",
								data: {
									id: "b",
									name: "orders_create",
									status: "approval-required",
								},
							},
							{
								type: "data-assistant-card",
								data: {
									kind: "recoverable-error",
									title: "Try again",
									actionLabel: "Retry",
								},
							},
						],
					} as UIMessage
				}
				isStreaming={false}
				isLastMessage={false}
				onCardAction={() => {}}
			/>,
		);

		expect(html).toContain("2 tools · 1 approval required");
		expect(html).toContain("Searching orders — Failed");
		expect(html).toContain("Creating order — Approval required");
		expect(html).toContain("<button");
		expect(html).not.toContain("aria-live");
	});

	test("renders typed entity actions only when navigation is provided", () => {
		const html = renderToStaticMarkup(
			<AssistantMessageRenderer
				message={
					{
						id: "message-entity",
						role: "assistant",
						parts: [
							{
								type: "data-assistant-entity",
								data: {
									kind: "order",
									id: "09502PC",
									label: "Order 09502PC",
								},
							},
						],
					} as UIMessage
				}
				isStreaming={false}
				isLastMessage={false}
				onOpenEntity={() => {}}
			/>,
		);
		expect(html).toContain('aria-label="Related workspace records"');
		expect(html).toContain("Order 09502PC");
		expect(html).toContain("Open order");
	});
});

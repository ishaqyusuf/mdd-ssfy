import { describe, expect, test } from "bun:test";
import { NEW_SALES_FORM_SEED_EXAMPLE } from "@gnd/sales/sales-form-core";
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
		expect(html).toContain("Thinking");
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
		expect(html).not.toContain("Blocked URL");
	});

	test("renders invented workspace link destinations as plain text", () => {
		const html = renderToStaticMarkup(
			<AssistantMessageRenderer
				message={
					{
						id: "message-invented-link",
						role: "assistant",
						parts: [
							{
								type: "text",
								text: "[Order 09672PC](undefined) and [Quote 03647PC](https://gndprodesk.localhost/sales-form/edit-quote/03647PC) are ready.",
							},
						],
					} as UIMessage
				}
				isStreaming={false}
				isLastMessage={false}
			/>,
		);

		expect(html).toContain("Order 09672PC");
		expect(html).toContain("Quote 03647PC");
		expect(html).not.toContain("undefined");
		expect(html).not.toContain("gndprodesk.localhost");
		expect(html).not.toContain("Blocked URL");
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

	test("renders an actionable recovery card without completed tool internals", () => {
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

		expect(html).not.toContain("2 tools");
		expect(html).not.toContain("Searching orders");
		expect(html).not.toContain("Creating order");
		expect(html).toContain("Try again");
		expect(html).toContain("<button");
		expect(html).not.toContain("aria-live");
	});

	test("renders a selective one-time retry for a failed read", () => {
		const html = renderToStaticMarkup(
			<AssistantMessageRenderer
				message={
					{
						id: "message-read-retry",
						role: "assistant",
						parts: [
							{
								type: "data-assistant-tool",
								data: {
									id: "read-1",
									name: "sales_find_orders",
									status: "failed",
									retryId: "d9428888-122b-11e1-b85c-61cd3cbb3210",
									retryExpiresAt: "2099-01-01T00:00:00.000Z",
								},
							},
						],
					} as UIMessage
				}
				isStreaming={false}
				isLastMessage={false}
				onRetryRead={() => {}}
			/>,
		);

		expect(html).toContain("Retry searching sales orders");
		expect(html).toContain("<button");
		const consumed = renderToStaticMarkup(
			<AssistantMessageRenderer
				message={
					{
						id: "message-read-retry",
						role: "assistant",
						parts: [
							{
								type: "data-assistant-tool",
								data: {
									id: "read-1",
									name: "sales_find_orders",
									status: "failed",
									retryId: "d9428888-122b-11e1-b85c-61cd3cbb3210",
									retryExpiresAt: "2099-01-01T00:00:00.000Z",
								},
							},
						],
					} as UIMessage
				}
				isStreaming={false}
				isLastMessage={false}
				onRetryRead={() => {}}
				consumedRetryIds={new Set(["d9428888-122b-11e1-b85c-61cd3cbb3210"])}
			/>,
		);
		expect(consumed).not.toContain("Retry searching sales orders");
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

	test("renders a native draft review action only when a canvas handler is present", () => {
		const part = {
			type: "data-assistant-order-draft",
			id: "order-draft-1",
			data: {
				type: "order",
				generationId: "88d3cb0f-32b9-4e3d-b5c3-1a1425374a83",
				seed: NEW_SALES_FORM_SEED_EXAMPLE,
				configurationScope: "sales-settings:1",
				configurationRevision: "catalog-revision-4",
				promptVersion: "sales-request-v4",
				provider: "openai",
				model: "gpt-5-mini",
				usage: { inputTokens: 120, outputTokens: 40 },
				unresolvedCount: 0,
			},
		};
		const render = (enabled: boolean) =>
			renderToStaticMarkup(
				<AssistantMessageRenderer
					message={
						{
							id: "message-draft",
							role: "assistant",
							parts: [part],
						} as UIMessage
					}
					isStreaming={false}
					isLastMessage={false}
					{...(enabled ? { onOpenOrderDraft: () => {} } : {})}
				/>,
			);
		expect(render(true)).toContain('aria-label="Generated Sales drafts"');
		expect(render(true)).toContain("Review order draft");
		expect(render(false)).not.toContain("Review order draft");
	});

	test("renders a trusted document proposal action only with a proposal handler", () => {
		const message = {
			id: "message-document-action",
			role: "assistant",
			parts: [
				{
					type: "data-assistant-document-action",
					id: "document-action-1",
					data: {
						toolId: "documents_generate_pdf",
						toolVersion: 1,
						label: "Generate invoice PDF",
						input: {
							orderNo: "09502PC",
							mode: "invoice",
							expectedRevision: "revision-7",
							forceRegenerate: false,
						},
					},
				},
			],
		} as UIMessage;
		const enabled = renderToStaticMarkup(
			<AssistantMessageRenderer
				message={message}
				isStreaming={false}
				isLastMessage={false}
				onCreateApprovalProposal={() => {}}
			/>,
		);
		const disabled = renderToStaticMarkup(
			<AssistantMessageRenderer
				message={message}
				isStreaming={false}
				isLastMessage={false}
			/>,
		);
		expect(enabled).toContain('aria-label="Available reviewed actions"');
		expect(enabled).toContain("Generate invoice PDF");
		expect(disabled).not.toContain("Generate invoice PDF");
	});
});

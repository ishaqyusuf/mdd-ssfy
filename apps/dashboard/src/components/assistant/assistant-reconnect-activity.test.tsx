import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { initialAssistantStreamState } from "./assistant-chat-state";
import { AssistantReconnectActivity } from "./assistant-reconnect-activity";

describe("AssistantReconnectActivity", () => {
	test("renders safe durable statuses without persisted result payloads", () => {
		const html = renderToStaticMarkup(
			<AssistantReconnectActivity
				state={{
					...initialAssistantStreamState,
					runId: "run-1",
					status: "failed",
					errorCode: "ASSISTANT_PROVIDER_UNAVAILABLE",
					toolExecutions: [
						{
							id: "execution-1",
							eventSequence: 1,
							toolId: "orders_get",
							toolVersion: 1,
							effect: "read",
							status: "succeeded",
							result: { privateValue: "do-not-render" },
							errorCode: null,
							durationMs: 24,
							completedAt: "2026-09-17T12:00:00.000Z",
						},
					],
					actionProposals: [],
				}}
			/>,
		);

		expect(html).toContain('aria-label="Recovered Assistant activity"');
		expect(html).toContain("Fetching order");
		expect(html).toContain("Completed");
		expect(html).toContain("did not finish successfully");
		expect(html).not.toContain("ASSISTANT_PROVIDER_UNAVAILABLE");
		expect(html).not.toContain("do-not-render");
		expect(html).not.toContain("execution-1");
	});

	test("explains why a recovered pending proposal cannot be approved", () => {
		const html = renderToStaticMarkup(
			<AssistantReconnectActivity
				state={{
					...initialAssistantStreamState,
					runId: "run-1",
					status: "waiting_for_approval",
					actionProposals: [
						{
							id: "proposal-1",
							eventSequence: 2,
							toolId: "documents_create",
							toolVersion: 1,
							effect: "artifact",
							status: "pending",
							expiresAt: "2026-09-17T12:05:00.000Z",
						},
					],
				}}
			/>,
		);

		expect(html).toContain("Preparing your document");
		expect(html).toContain("Awaiting review");
		expect(html).toContain("start this approval again");
		expect(html).not.toContain("proposal-1");
	});

	test("renders a terminal failure even when no private error code was stored", () => {
		const html = renderToStaticMarkup(
			<AssistantReconnectActivity
				state={{
					...initialAssistantStreamState,
					runId: "run-1",
					status: "failed",
					errorCode: null,
				}}
			/>,
		);

		expect(html).toContain('role="alert"');
		expect(html).toContain("did not finish successfully");
	});
});

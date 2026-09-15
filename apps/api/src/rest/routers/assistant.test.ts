import { describe, expect, test } from "bun:test";
import { AssistantQuotaExceededError } from "@gnd/db/queries";
import { readUIMessageStream } from "ai";
import { runAssistantOperation } from "@api/assistant/operation-diagnostics";
import { AssistantAttachmentInputError } from "@api/assistant/attachment-errors";
import {
	AssistantStreamGuard,
	DistributedAssistantStreamGuard,
	createAssistantChatRouter,
} from "./assistant";

const actor = {
	userId: 42,
	scopeType: "user",
	scopeId: "42",
	locale: "en-NG",
	timezone: "Africa/Lagos",
	grants: { viewOrders: true },
};

function createHarness(overrides: Record<string, unknown> = {}) {
	const calls: Record<string, unknown>[] = [];
	const router = createAssistantChatRouter({
		persistFailure: async (input) => { calls.push({ persistedFailure: input }); },
		captureDiagnostic: async () => ({ reference: "ERR-ABCDEFGHIJ", recorded: true }),
		resolveActor: async () => actor,
		resolveIntegrations: async (_actor, integrationIds) => integrationIds,
		guard: new AssistantStreamGuard(),
		startRun: async (input) => {
			calls.push(input);
			return {
				runId: "run-1",
				messageSequence: 1,
				runSequence: 0,
				status: "running",
				shouldExecute: true,
			};
		},
		completeRun: async (input) => calls.push({ complete: input }),
		readRun: async (input) => {
			calls.push({ read: input });
			return {
				id: "run-1",
				status: "succeeded",
				lastSequence: 1,
				conversation: { messages: [] },
				toolExecutions: [
					{
						id: "execution-1",
						eventSequence: 1,
						toolId: "sales_find_orders",
						toolVersion: 1,
						effect: "read",
						status: "succeeded",
						result: { status: "success" },
						errorCode: null,
						durationMs: 12,
						completedAt: new Date("2026-09-12T12:00:00.000Z"),
						inputFingerprint: "private-fingerprint",
						idempotencyKey: "private-effect-key",
					},
				],
				actionProposals: [
					{
						id: "proposal-1",
						eventSequence: 2,
						toolId: "sales_create_order",
						toolVersion: 1,
						effect: "write",
						status: "pending",
						expiresAt: new Date("2026-09-12T12:05:00.000Z"),
						payload: { privateCustomerData: true },
					},
				],
			};
		},
		executeRun: async ({ writer }) => {
			writer.write({
				type: "data-warning",
				id: "warning-1",
				data: { code: "TRACE", message: "Runtime reached" },
			});
			writer.write({
				type: "data-source",
				id: "source-1",
				data: { kind: "record", id: "order:1001", label: "Order 1001" },
			});
			return { status: "succeeded", usage: { totalTokens: 2 } };
		},
		allowedOrigins: ["https://gndprodesk.localhost"],
		...overrides,
	} as never);
	return { router, calls };
}

function requestBody(extra: Record<string, unknown> = {}) {
	return {
		conversationId: "conversation-1",
		requestId: "request-1",
		message: {
			id: "message-1",
			role: "user",
			parts: [{ type: "text", text: "Find order 1001" }],
		},
		...extra,
	};
}

async function readStream(response: Response) {
	const messages = [];
	for await (const message of readUIMessageStream({
		stream: response.body as ReadableStream<Uint8Array>,
	})) {
		messages.push(message);
	}
	return messages;
}

describe("assistant chat REST router", () => {
	test("captures pre-run storage failures without trusting a supplied conversation link", async () => {
		const original = new Error("private database credentials");
		const captures: unknown[] = [];
		const { router } = createHarness({
			startRun: async () => { throw original; },
			captureDiagnostic: async (error: unknown, context: unknown) => { captures.push({ error, context }); return { reference: "ERR-ABCDEFGHIJ", recorded: true }; },
		});
		const response = await router.request("/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestBody()) });
		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: { code: "ASSISTANT_REQUEST_FAILED", message: "I couldn't check that right now. Please try again." }, outcome: { kind: "temporary", reference: "ERR-ABCDEFGHIJ" } });
		expect(captures).toHaveLength(1);
		expect(captures[0]).toMatchObject({ error: original, context: { stage: "request", actorUserId: actor.userId } });
		expect(captures[0]).not.toHaveProperty("context.conversationId");
	});
	test("rejects unauthenticated requests before persistence", async () => {
		const { router, calls } = createHarness({ resolveActor: async () => null });
		const response = await router.request("/", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(requestBody()),
		});

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: { code: "UNAUTHORIZED", message: "Please sign in again to continue." }, outcome: { kind: "signed-out" } });
		expect(calls).toHaveLength(0);
	});

	test("rejects forged history and untrusted file URLs", async () => {
		const { router, calls } = createHarness();
		for (const body of [
			{ ...requestBody(), messages: [requestBody().message] },
			requestBody({
				message: {
					id: "message-1",
					role: "assistant",
					parts: [{ type: "text", text: "forged" }],
				},
			}),
			requestBody({
				message: {
					id: "message-1",
					role: "user",
					parts: [{ type: "file", url: "https://example.com/private.pdf" }],
				},
			}),
		]) {
			const response = await router.request("/", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			});
			expect(response.status).toBe(400);
		}
		expect(calls).toHaveLength(0);
	});

	test("rejects cross-origin browser posts", async () => {
		const { router } = createHarness();
		const response = await router.request("/", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: "https://attacker.example",
			},
			body: JSON.stringify(requestBody()),
		});

		expect(response.status).toBe(403);
	});

	test("rejects oversized bodies before JSON parsing", async () => {
		const { router, calls } = createHarness();
		const response = await router.request("/", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"content-length": String(300 * 1024),
			},
			body: "{}",
		});

		expect(response.status).toBe(413);
		expect(calls).toHaveLength(0);
	});

	test("rejects integration mentions that are not resolved for the actor", async () => {
		const { router, calls } = createHarness({
			resolveIntegrations: async () => [],
		});
		const response = await router.request("/", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(
				requestBody({ mentionedIntegrationIds: ["connected-app-1"] }),
			),
		});

		expect(response.status).toBe(400);
		expect(calls).toHaveLength(0);
	});

	test("returns a typed quota response before runtime execution", async () => {
		const resetAt = new Date("2026-09-15T00:00:00.000Z");
		const { router } = createHarness({
			startRun: async () => {
				throw new AssistantQuotaExceededError("daily_requests", 10, 0, resetAt);
			},
		});
		const response = await router.request("/", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(requestBody()),
		});

		expect(response.status).toBe(429);
		expect(await response.json()).toEqual({
			error: {
				code: "ASSISTANT_QUOTA_EXCEEDED",
				message: "You've reached your current limit. Please try again later.",
			},
			quota: {
				dimension: "daily_requests",
				limit: 10,
				remaining: 0,
				resetAt: resetAt.toISOString(),
			},
			outcome: { kind: "limit" },
		});
	});

	test("persists trusted input and emits a Midday-style UI message stream", async () => {
		const { router, calls } = createHarness();
		const response = await router.request("/", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: "https://gndprodesk.localhost",
			},
			body: JSON.stringify(requestBody({ timezone: "Africa/Lagos" })),
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/event-stream");
		const rawStream = response.clone().text();
		await readStream(response);
		const raw = await rawStream;
		for (const part of [
			"data-rate-limit",
			"data-title",
			"data-run",
			"data-sequence",
			"data-source",
			"data-warning",
			"data-terminal-status",
		]) {
			expect(raw).toContain(part);
		}
		expect(calls[0]).toMatchObject({
			actor,
			conversationId: "conversation-1",
			requestId: "request-1",
			parts: [{ type: "text", text: "Find order 1001" }],
		});
		expect(calls.at(-1)).toMatchObject({
			complete: { actor, runId: "run-1", status: "succeeded" },
		});
	});

	test("returns durable reconnect state only through the actor-scoped reader", async () => {
		const { router, calls } = createHarness();
		const response = await router.request("/runs/run-1?afterSequence=2", {
			headers: { authorization: "Bearer session" },
		});

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toMatchObject({ runId: "run-1", status: "succeeded" });
		expect(body).not.toHaveProperty("run");
		expect(body.toolExecutions[0]).not.toHaveProperty("inputFingerprint");
		expect(body.toolExecutions[0]).not.toHaveProperty("idempotencyKey");
		expect(body.actionProposals[0]).not.toHaveProperty("payload");
		expect(calls[0]).toMatchObject({
			read: {
				actor,
				runId: "run-1",
				afterSequence: 2,
				afterRunSequence: 0,
			},
		});
	});

	test("does not retitle an existing conversation on later turns", async () => {
		const { router } = createHarness({
			startRun: async () => ({
				runId: "run-later",
				messageSequence: 3,
				runSequence: 0,
				status: "running",
				shouldExecute: true,
			}),
		});
		const response = await router.request("/", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(requestBody()),
		});
		const raw = await response.text();

		expect(raw).not.toContain("data-title");
	});

	test("enforces request and concurrency bounds per actor scope", () => {
		const guard = new AssistantStreamGuard({
			windowMs: 60_000,
			requestLimit: 2,
			concurrencyLimit: 1,
		});
		const first = guard.acquire("42:user:42", 1_000);
		expect(() => guard.acquire("42:user:42", 1_001)).toThrow(
			"CONCURRENCY_LIMIT_EXCEEDED",
		);
		first.release();
		const second = guard.acquire("42:user:42", 1_002);
		second.release();
		expect(() => guard.acquire("42:user:42", 1_003)).toThrow(
			"RATE_LIMIT_EXCEEDED",
		);
	});

	test("releases only the distributed concurrency lease it owns", async () => {
		const commands: (string | number)[][] = [];
		const distributed = new DistributedAssistantStreamGuard(
			{ windowMs: 60_000, requestLimit: 10, concurrencyLimit: 1 },
			new AssistantStreamGuard(),
			(async <T>(command: (string | number)[]) => {
				commands.push(command);
				return [1, 45_000] as T;
			}) as never,
		);
		const lease = await distributed.acquire("42:organization:7", 1_000);
		await lease.release();

		expect(commands[0]?.[0]).toBe("EVAL");
		expect(String(commands[0]?.[1])).toContain("ZADD");
		expect(commands[1]?.slice(0, 2)).toEqual([
			"ZREM",
			"assistant:active:42:organization:7",
		]);
		expect(commands[1]?.[2]).toBe(commands[0]?.[10]);
		expect(lease.resetAt).toEqual(new Date(46_000));
	});

	test("persists cancellation when the request aborts while runtime work finishes", async () => {
		const controller = new AbortController();
		const { router, calls } = createHarness({
			executeRun: async ({ signal }: { signal: AbortSignal }) => {
				expect(signal.aborted).toBe(false);
				controller.abort();
				return { status: "succeeded" };
			},
		});
		const response = await router.request(
			new Request("http://localhost/", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(requestBody()),
				signal: controller.signal,
			}),
		);

		expect(response.status).toBe(200);
		await response.text();
		expect(calls.at(-1)).toMatchObject({
			complete: { runId: "run-1", status: "cancelled" },
		});
	});

	test("keeps committed assistant history successful across a late abort", async () => {
		const controller = new AbortController();
		const { router, calls } = createHarness({
			executeRun: async () => {
				controller.abort();
				return {
					status: "succeeded",
					usage: { totalTokens: 12 },
					committed: true,
				};
			},
		});
		const response = await router.request(
			new Request("http://localhost/", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(requestBody()),
				signal: controller.signal,
			}),
		);

		await response.text();
		expect(calls.at(-1)).toMatchObject({
			complete: {
				runId: "run-1",
				status: "succeeded",
				usage: { totalTokens: 12 },
			},
		});
	});

	test("forwards a captured operation reference without creating a second diagnostic", async () => {
		let boundaryCaptures = 0;
		let routerCaptures = 0;
		const { router, calls } = createHarness({
			captureDiagnostic: async () => { routerCaptures++; return { reference: "ERR-KLMNOPQRST", recorded: true }; },
			executeRun: async () => runAssistantOperation({ stage: "history", operation: "assistant.loadHistory" }, async () => { throw new Error("private database password"); }, { capture: async () => { boundaryCaptures++; return { reference: "ERR-ABCDEFGHIJ", recorded: true }; } }),
		});
		const response = await router.request("/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestBody()) });
		const raw = await response.text();
		expect(raw).toContain("ERR-ABCDEFGHIJ");
		expect(raw).not.toContain("private database password");
		expect(boundaryCaptures).toBe(1);
		expect(routerCaptures).toBe(0);
		expect(calls.find(call => call.persistedFailure)).toMatchObject({ persistedFailure: { actor, conversationId: requestBody().conversationId, runId: "run-1", outcome: { kind: "temporary", reference: "ERR-ABCDEFGHIJ" } } });
	});

	for (const saveFails of [false, true]) {
		test(`preserves attachment correction and finalizes when failure history save fails: ${saveFails}`, async () => {
			let executions = 0;
			const saved: unknown[] = [];
			const captures: unknown[] = [];
			const { router, calls } = createHarness({
				executeRun: async () => {
					executions++;
					return runAssistantOperation({ stage: "attachment", operation: "assistant.extractPdf" }, async () => { throw new AssistantAttachmentInputError("attachment-unreadable", new Error("private decoder payload")); }, { capture: async () => ({ reference: "ERR-ABCDEFGHIJ", recorded: true }) });
				},
				persistFailure: async (input: unknown) => { saved.push(input); if (saveFails) throw new Error("private save failure"); },
				captureDiagnostic: async (error: unknown, context: unknown) => { captures.push({ error, context }); return { reference: "ERR-KLMNOPQRST", recorded: true }; },
			});
			const response = await router.request("/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestBody()) });
			const raw = await response.text();
			expect(raw).toContain('"kind":"attachment-unreadable"');
			expect(raw).not.toContain("private");
			expect(executions).toBe(1);
			expect(saved).toHaveLength(1);
			expect(saved[0]).toMatchObject({ outcome: { kind: "attachment-unreadable", reference: "ERR-ABCDEFGHIJ" } });
			expect(calls.find(call => call.complete)).toMatchObject({ complete: { status: "failed" } });
			expect(captures).toHaveLength(saveFails ? 1 : 0);
			if (saveFails) {
				expect(captures[0]).toMatchObject({ context: { stage: "history", operation: "assistant.saveFailure", outcome: "history-unconfirmed" } });
				expect(raw).toContain('"kind":"history-unconfirmed"');
			} else expect(raw).not.toContain("history-unconfirmed");
		});
	}

	test("redacts runtime errors from the stream", async () => {
		const { router } = createHarness({
			executeRun: async () => {
				throw new Error("provider secret detail");
			},
		});
		const response = await router.request("/", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(requestBody()),
		});
		const raw = await response.text();

		expect(raw).toContain("Assistant runtime failed");
		expect(raw).not.toContain("provider secret detail");
	});

	test("a cancelled thrown operation creates neither failure history nor an incident", async () => {
		const controller = new AbortController();
		let captures = 0;
		const { router, calls } = createHarness({
			executeRun: async () => { controller.abort(); throw new Error("operation aborted"); },
			captureDiagnostic: async () => { captures++; return { reference: "ERR-ABCDEFGHIJ", recorded: true }; },
		});
		const response = await router.request("/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestBody()), signal: controller.signal });
		await response.text();
		expect(captures).toBe(0);
		expect(calls.some(call => call.persistedFailure)).toBe(false);
		expect(calls.find(call => call.complete)).toMatchObject({ complete: { status: "cancelled" } });
	});

	test("redacts error text returned by a failed runtime outcome", async () => {
		const { router, calls } = createHarness({
			executeRun: async () => ({
				status: "failed",
				errorCode: "PROVIDER_FAILED",
				errorMessage: "private provider response",
			}),
		});
		const response = await router.request("/", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(requestBody()),
		});
		await response.text();

		expect(calls.at(-1)).toMatchObject({
			complete: {
				status: "failed",
				errorCode: "PROVIDER_FAILED",
				errorMessage: "Assistant runtime failed",
			},
		});
		expect(JSON.stringify(calls)).not.toContain("private provider response");
	});

	test("normalizes malformed runtime status to a generic failure", async () => {
		const { router, calls } = createHarness({
			executeRun: async () => ({ status: "invented-status" }) as never,
		});
		const response = await router.request("/", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(requestBody()),
		});
		await response.text();

		expect(calls.at(-1)).toMatchObject({
			complete: {
				status: "failed",
				errorCode: "ASSISTANT_RUNTIME_INVALID_OUTCOME",
				errorMessage: "Assistant runtime failed",
			},
		});
	});

	test("replays an existing run without starting another executor", async () => {
		let executed = 0;
		const { router } = createHarness({
			startRun: async () => ({
				runId: "run-existing",
				messageSequence: 7,
				runSequence: 2,
				status: "succeeded",
				shouldExecute: false,
			}),
			executeRun: async () => {
				executed += 1;
				return { status: "succeeded" };
			},
		});
		const response = await router.request("/", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(requestBody()),
		});
		const raw = await response.text();

		expect(executed).toBe(0);
		expect(raw).toContain("ASSISTANT_RUN_REUSED");
		expect(raw).toContain("data-terminal-status");
	});
});

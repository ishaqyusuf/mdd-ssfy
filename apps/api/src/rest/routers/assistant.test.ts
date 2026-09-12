import { describe, expect, test } from "bun:test";
import { readUIMessageStream } from "ai";
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
		resolveActor: async () => actor,
		resolveIntegrations: async (_actor, integrationIds) => integrationIds,
		guard: new AssistantStreamGuard(),
		startRun: async (input) => {
			calls.push(input);
			return {
				runId: "run-1",
				messageSequence: 3,
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
	test("rejects unauthenticated requests before persistence", async () => {
		const { router, calls } = createHarness({ resolveActor: async () => null });
		const response = await router.request("/", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(requestBody()),
		});

		expect(response.status).toBe(401);
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
				return 1 as T;
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

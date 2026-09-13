import { describe, expect, test } from "bun:test";
import { MailboxProviderError, mailboxProviderErrorEvidence } from "./errors";
import {
	MailboxProviderRequestAbort,
	readBoundedMailboxProviderResponse,
	runMailboxProviderRequest,
} from "./provider-request";

describe("bounded mailbox provider requests", () => {
	test("does not dispatch an already-cancelled provider operation", async () => {
		const caller = new AbortController();
		caller.abort();
		let calls = 0;

		await expect(
			runMailboxProviderRequest({
				provider: "gmail",
				signal: caller.signal,
				request: async () => {
					calls += 1;
					return "late";
				},
			}),
		).rejects.toMatchObject({ reason: "caller-cancelled" });
		expect(calls).toBe(0);
	});

	test("composes the caller signal and classifies caller cancellation safely", async () => {
		const caller = new AbortController();
		let receivedSignal: AbortSignal | undefined;
		const request = runMailboxProviderRequest({
			provider: "gmail",
			signal: caller.signal,
			timeoutMs: 1_000,
			request: async (signal) => {
				receivedSignal = signal;
				return new Promise<Response>((_resolve, reject) => {
					signal.addEventListener(
						"abort",
						() => reject(new Error("raw caller secret")),
						{ once: true },
					);
				});
			},
		});

		caller.abort("raw caller secret");

		await expect(request).rejects.toBeInstanceOf(MailboxProviderRequestAbort);
		await expect(request).rejects.toMatchObject({
			provider: "gmail",
			reason: "caller-cancelled",
		});
		await expect(request).rejects.not.toThrow("raw caller secret");
		expect(receivedSignal).toBeDefined();
		expect(receivedSignal).not.toBe(caller.signal);
	});

	test("aborts a hanging request at its bounded timeout without leaking the raw error", async () => {
		let aborted = false;
		const request = runMailboxProviderRequest({
			provider: "microsoft-graph",
			timeoutMs: 1,
			request: async (signal) =>
				new Promise<Response>((_resolve, reject) => {
					signal.addEventListener(
						"abort",
						() => {
							aborted = true;
							reject(new Error("raw timeout secret"));
						},
						{ once: true },
					);
				}),
		});

		await expect(request).rejects.toMatchObject({
			code: "network",
			provider: "microsoft-graph",
			requestFailure: "request-timeout",
		});
		await expect(request).rejects.not.toThrow("raw timeout secret");
		expect(aborted).toBe(true);
	});

	test("discards a late result when a provider ignores the timeout signal", async () => {
		await expect(
			runMailboxProviderRequest({
				provider: "gmail",
				timeoutMs: 1,
				request: async () => {
					await new Promise((resolve) => setTimeout(resolve, 5));
					return "must-not-escape";
				},
			}),
		).rejects.toMatchObject({
			provider: "gmail",
			requestFailure: "request-timeout",
		});
	});

	test("settles a deadline even when the provider never observes its signal", async () => {
		const outcome = await Promise.race([
			runMailboxProviderRequest({
				provider: "gmail",
				timeoutMs: 1,
				request: async () => new Promise<never>(() => undefined),
			}).then(
				() => "unexpected-success",
				(error: unknown) =>
					error instanceof MailboxProviderError &&
					error.requestFailure === "request-timeout"
						? "deadline"
						: "unexpected-error",
			),
			new Promise<string>((resolve) =>
				setTimeout(() => resolve("still-pending"), 25),
			),
		]);
		expect(outcome).toBe("deadline");
	});

	test("aborts sibling work while preserving a provider failure", async () => {
		let siblingAborted = false;
		const primary = new MailboxProviderError({
			provider: "gmail",
			code: "rate-limited",
		});
		await expect(
			runMailboxProviderRequest({
				provider: "gmail",
				request: async (signal) => {
					signal.addEventListener(
						"abort",
						() => {
							siblingAborted = true;
						},
						{ once: true },
					);
					throw primary;
				},
			}),
		).rejects.toBe(primary);
		expect(siblingAborted).toBe(true);
	});

	test("does not misclassify an unexpected adapter bug as network failure", async () => {
		const bug = new Error("adapter invariant");
		await expect(
			runMailboxProviderRequest({
				provider: "microsoft-graph",
				request: async () => {
					throw bug;
				},
			}),
		).rejects.toBe(bug);
	});

	test("does not dispatch when a lease has no settlement reserve remaining", async () => {
		let calls = 0;
		await expect(
			runMailboxProviderRequest({
				provider: "microsoft-graph",
				deadlineAt: new Date("2026-09-13T12:00:00.250Z"),
				deadlineKind: "lease-expired",
				now: new Date("2026-09-13T12:00:00.000Z"),
				request: async () => {
					calls += 1;
					return "late";
				},
			}),
		).rejects.toMatchObject({ reason: "lease-expired" });
		expect(calls).toBe(0);
	});

	test("can classify a lease deadline separately from a regular request timeout", async () => {
		const request = runMailboxProviderRequest({
			provider: "gmail",
			timeoutMs: 1,
			timeoutKind: "lease-expired",
			request: async (signal) =>
				new Promise<Response>((_resolve, reject) => {
					signal.addEventListener(
						"abort",
						() => reject(new Error("raw deadline secret")),
						{ once: true },
					);
				}),
		});

		await expect(request).rejects.toMatchObject({
			provider: "gmail",
			reason: "lease-expired",
		});
	});

	test("lets an authority deadline win an exact timeout tie", async () => {
		await expect(
			runMailboxProviderRequest({
				provider: "gmail",
				timeoutMs: 1,
				deadlineAt: new Date("2026-09-13T12:00:00.001Z"),
				deadlineReserveMs: 0,
				deadlineKind: "lease-expired",
				now: new Date("2026-09-13T12:00:00.000Z"),
				request: async () => new Promise<never>(() => undefined),
			}),
		).rejects.toMatchObject({ reason: "lease-expired" });
	});

	test("cancels and releases an oversized response body", async () => {
		let cancelled = false;
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new Uint8Array(8));
			},
			cancel() {
				cancelled = true;
			},
		});

		await expect(
			readBoundedMailboxProviderResponse({
				provider: "gmail",
				response: new Response(body),
				maxBytes: 4,
			}),
		).rejects.toMatchObject({
			code: "malformed-response",
			provider: "gmail",
		});
		expect(cancelled).toBe(true);
	});

	test("cancels an in-flight response body when the caller aborts", async () => {
		const caller = new AbortController();
		let cancelled = false;
		const body = new ReadableStream<Uint8Array>({
			pull() {
				return new Promise<void>(() => undefined);
			},
			cancel() {
				cancelled = true;
			},
		});
		const response = new Response(body);
		const read = readBoundedMailboxProviderResponse({
			provider: "microsoft-graph",
			response,
			maxBytes: 64,
			signal: caller.signal,
		});

		caller.abort();

		await expect(read).rejects.toBeInstanceOf(MailboxProviderRequestAbort);
		await expect(read).rejects.toMatchObject({
			provider: "microsoft-graph",
			reason: "caller-cancelled",
		});
		expect(cancelled).toBe(true);
	});

	test("keeps safe evidence bounded for request failures", () => {
		const error = new MailboxProviderError({
			provider: "gmail",
			code: "network",
			requestFailure: "request-timeout",
		});
		expect(mailboxProviderErrorEvidence(error)).toEqual({
			code: "network",
			provider: "gmail",
			retryable: true,
			requiresReauthorization: false,
			retryAfterMs: null,
			requestFailure: "request-timeout",
		});
	});
});

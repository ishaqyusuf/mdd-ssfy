import { describe, expect, test } from "bun:test";
import { dispatchCompletionFingerprint, resolveDispatchCompletionAttempt } from "./dispatch-completion";

describe("dispatch completion idempotency", () => {
	test("rejects changed completion evidence under the same request ID", () => {
		const task = { dispatchId: 42, receivedBy: "Customer", receivedDate: new Date("2026-09-09T12:00:00Z") };
		const fingerprint = dispatchCompletionFingerprint(task);
		const input = { status: "completed", requestId: "request-1", meta: { dispatchCompletion: { requestId: "request-1", fingerprint } } };
		expect(resolveDispatchCompletionAttempt({ ...input, fingerprint })).toBe("replay");
		expect(resolveDispatchCompletionAttempt({ ...input, fingerprint: dispatchCompletionFingerprint({ ...task, receivedBy: "Different recipient" }) })).toBe("conflict");
	});
	test("replays the same completed request without another note or payment review", () => {
		expect(
			resolveDispatchCompletionAttempt({
				status: "completed",
				requestId: "dispatch:42:request-1",
				meta: {
					dispatchCompletion: {
						requestId: "dispatch:42:request-1",
					},
				},
			}),
		).toBe("replay");
	});

	test("rejects a different request after completion", () => {
		expect(
			resolveDispatchCompletionAttempt({
				status: "completed",
				requestId: "dispatch:42:request-2",
				meta: {
					dispatchCompletion: {
						requestId: "dispatch:42:request-1",
					},
				},
			}),
		).toBe("conflict");
	});

	test("allows unfinished completion but rejects completed calls without retry identity", () => {
		expect(
			resolveDispatchCompletionAttempt({
				status: "in progress",
				requestId: "dispatch:42:request-1",
				meta: {},
			}),
		).toBe("continue");
		expect(
			resolveDispatchCompletionAttempt({
				status: "completed",
				requestId: null,
				meta: {},
			}),
		).toBe("conflict");
	});
});

import { describe, expect, test } from "bun:test";
import { resolveDispatchCompletionAttempt } from "./dispatch-completion";

describe("dispatch completion idempotency", () => {
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

	test("preserves legacy and unfinished completion behavior", () => {
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
		).toBe("continue");
	});
});

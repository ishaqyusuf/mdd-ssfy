import { expect, test } from "bun:test";
import { assistantReadRetryDelay, createAssistantReadRecovery } from "./read-recovery";

const transient = () => Object.assign(new Error("private failure"), { statusCode: 503, responseHeaders: { "retry-after": "0" } });

test("transient read retries once and logs the original attempt", async () => {
	const attempts: number[] = [];
	const captured: unknown[] = [];
	const original = transient();
	const result = await createAssistantReadRecovery()({ effect: "read", signal: new AbortController().signal,
		operation: async attempt => { attempts.push(attempt); if (attempt === 1) throw original; return "fresh authorized result"; },
		onRetry: async error => { captured.push(error); },
	});
	expect(result).toBe("fresh authorized result");
	expect(attempts).toEqual([1, 2]);
	expect(captured).toEqual([original]);
});

test("one request budget is shared across concurrent tools", async () => {
	const recover = createAssistantReadRecovery();
	let retries = 0;
	const results = await Promise.allSettled([1, 2].map(() => recover({ effect: "read", signal: new AbortController().signal,
		operation: async attempt => { if (attempt === 1) throw transient(); retries++; return "ok"; }, onRetry: async () => {},
	})));
	expect(retries).toBe(1);
	expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
});

test("non-read effects never replay and returned results are never guessed to be retryable", async () => {
	for (const effect of ["draft", "artifact", "external_send", "write", "destructive", "unknown"]) {
		let calls = 0;
		await expect(createAssistantReadRecovery()({ effect, signal: new AbortController().signal, operation: async () => { calls++; throw transient(); }, onRetry: async () => { throw new Error("must not be called"); } })).rejects.toThrow("private failure");
		expect(calls).toBe(1);
	}
	let calls = 0;
	expect(await createAssistantReadRecovery()({ effect: "read", signal: new AbortController().signal, operation: async () => { calls++; return { status: "failed" }; }, onRetry: async () => {} })).toEqual({ status: "failed" });
	expect(calls).toBe(1);
});

test("cancellation during recovery prevents the second operation", async () => {
	const controller = new AbortController();
	let calls = 0;
	await expect(createAssistantReadRecovery()({ effect: "read", signal: controller.signal,
		operation: async () => { calls++; throw transient(); },
		onRetry: async () => { controller.abort(new Error("User stopped")); },
	})).rejects.toThrow("User stopped");
	expect(calls).toBe(1);
});

test("retry-after is respected without shortening excessive waits or retrying permissions", () => {
	expect(assistantReadRetryDelay({ statusCode: 429, responseHeaders: { "retry-after": "1" } })).toBe(1000);
	expect(assistantReadRetryDelay({ statusCode: 503, responseHeaders: { "retry-after": "30" } })).toBeNull();
	expect(assistantReadRetryDelay({ statusCode: 503, responseHeaders: { "retry-after": "bad" } })).toBeNull();
	expect(assistantReadRetryDelay({ statusCode: 403, code: "ECONNRESET" })).toBeNull();
	expect(assistantReadRetryDelay(new Error("timeout"))).toBeNull();
	expect(assistantReadRetryDelay({ statusCode: 503, responseHeaders: { "retry-after": "Tue, 15 Sep 2026 10:00:01 GMT" } }, Date.parse("2026-09-15T10:00:00Z"))).toBe(1000);
});

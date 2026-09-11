import { expect, test } from "bun:test";
import { restoreFulfillmentCompletionAttempt, retainFulfillmentCompletionAttempt } from "./fulfillment-completion-attempt";

test("remount restores the original attempt and isolates another actor", () => {
	const values = new Map<string, string>();
	const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
	const input = { dispatchId: 1, scopeRevision: 2, actorId: 3, mode: "pack_all" as const };
	const first = restoreFulfillmentCompletionAttempt(storage, null, input);
	expect(restoreFulfillmentCompletionAttempt(storage, null, input)).toEqual(first);
	expect(restoreFulfillmentCompletionAttempt(storage, null, { ...input, actorId: 4 }).completionRequestId).not.toBe(first.completionRequestId);
});

test("retry preserves request identity and actual date even when the clock advances", () => {
	const input = { dispatchId: 1, scopeRevision: 2, actorId: 3, mode: "pack_all" as const };
	const first = retainFulfillmentCompletionAttempt(null, input, () => "request-1", () => new Date("2026-09-10T12:00:00Z"));
	const retry = retainFulfillmentCompletionAttempt(first, input, () => "request-2", () => new Date("2026-09-11T12:00:00Z"));
	expect(retry.completionRequestId).toBe("request-1");
	expect(retry.receivedDate.toISOString()).toBe("2026-09-10T12:00:00.000Z");
	expect(retainFulfillmentCompletionAttempt(first, { ...input, scopeRevision: 3 }, () => "request-3").completionRequestId).toBe("request-3");
	expect(retainFulfillmentCompletionAttempt(first, { ...input, mode: "packed_only" }, () => "request-4").completionRequestId).toBe("request-4");
});

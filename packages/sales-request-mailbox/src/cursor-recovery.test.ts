import { describe, expect, test } from "bun:test";
import {
	DEFAULT_MAILBOX_SYNC_BUDGET,
	advanceMailboxSync,
	beginMailboxSync,
} from "./cursor-recovery";
import { MailboxProviderError } from "./errors";

function message(providerMessageId: string) {
	return {
		providerMessageId,
		labelIds: [],
		fromEmail: "customer@example.com",
		receivedAt: new Date("2026-09-13T12:00:00.000Z"),
		hasAttachments: false,
		headers: {},
	};
}

describe("bounded mailbox cursor recovery", () => {
	test("continues pages and completes without exposing provider cursors", () => {
		const state = beginMailboxSync({
			cursor: "cursor-1",
			since: new Date("2026-09-01T00:00:00.000Z"),
		});
		const next = advanceMailboxSync({
			state,
			outcome: {
				kind: "page",
				page: {
					messages: [message("m1")],
					nextPageToken: "page-2",
					cursorInvalid: false,
				},
			},
		});
		expect(next.kind).toBe("fetch");
		if (next.kind !== "fetch") throw new Error("Expected fetch");
		expect(next.request).toEqual({
			cursor: "cursor-1",
			pageToken: "page-2",
			since: state.since,
			fullSync: false,
			limit: 50,
		});
		const complete = advanceMailboxSync({
			state: next.state,
			outcome: {
				kind: "page",
				page: {
					messages: [],
					nextCursor: "cursor-2",
					cursorInvalid: false,
				},
			},
		});
		expect(complete).toMatchObject({ kind: "complete", truncated: false });
	});

	test("resets an invalid cursor once while preserving the bounded since window", () => {
		const since = new Date("2026-09-01T00:00:00.000Z");
		const state = beginMailboxSync({ cursor: "expired", since });
		const reset = advanceMailboxSync({
			state,
			outcome: {
				kind: "error",
				error: new MailboxProviderError({
					provider: "gmail",
					code: "cursor-invalid",
				}),
			},
		});
		expect(reset).toMatchObject({
			kind: "reset-cursor",
			request: {
				cursor: undefined,
				pageToken: undefined,
				since,
				fullSync: true,
			},
		});
		if (reset.kind !== "reset-cursor") throw new Error("Expected reset");
		const exhausted = advanceMailboxSync({
			state: reset.state,
			outcome: {
				kind: "error",
				error: new MailboxProviderError({
					provider: "gmail",
					code: "cursor-invalid",
				}),
			},
		});
		expect(exhausted).toEqual({
			kind: "fail",
			reason: "cursor-recovery-exhausted",
		});

		const pageReset = advanceMailboxSync({
			state,
			outcome: {
				kind: "page",
				page: { messages: [], cursorInvalid: true },
			},
		});
		expect(pageReset).toMatchObject({
			kind: "reset-cursor",
			state: { mode: "recovery-full", cursorResets: 1, since },
		});
	});

	test("stops continuation loops and truncates at configured budgets", () => {
		const loopState = {
			...beginMailboxSync({ cursor: null, since: null }),
			pageToken: "same",
			seenContinuations: ["page:same"],
		};
		expect(
			advanceMailboxSync({
				state: loopState,
				outcome: {
					kind: "page",
					page: {
						messages: [],
						nextPageToken: "same",
						cursorInvalid: false,
					},
				},
			}),
		).toEqual({ kind: "fail", reason: "continuation-loop" });

		const limited = advanceMailboxSync({
			state: beginMailboxSync({ cursor: null, since: null }),
			budget: { ...DEFAULT_MAILBOX_SYNC_BUDGET, maxMessages: 2 },
			outcome: {
				kind: "page",
				page: {
					messages: [message("m1"), message("m2")],
					nextPageToken: "next",
					cursorInvalid: false,
				},
			},
		});
		expect(limited).toMatchObject({ kind: "complete", truncated: true });
	});

	test("preserves state for retry and transitions revoked authorization", () => {
		const state = beginMailboxSync({ cursor: "c1", since: null });
		const retry = advanceMailboxSync({
			state,
			outcome: {
				kind: "error",
				error: new MailboxProviderError({
					provider: "microsoft-graph",
					code: "rate-limited",
					retryAfterMs: 12_000,
				}),
			},
		});
		expect(retry).toEqual({ kind: "retry", state, retryAfterMs: 12_000 });
		expect(
			advanceMailboxSync({
				state,
				outcome: {
					kind: "error",
					error: new MailboxProviderError({
						provider: "microsoft-graph",
						code: "authorization-revoked",
					}),
				},
			}),
		).toEqual({ kind: "reauthorize", state });
	});
});

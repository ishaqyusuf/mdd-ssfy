import type { MailboxSyncPage } from "./adapter.js";
import { type MailboxProviderError, resolveMailboxRetry } from "./errors.js";

export const DEFAULT_MAILBOX_SYNC_BUDGET = {
	pageSize: 50,
	maxPages: 20,
	maxMessages: 500,
	maxCursorResets: 1,
	maxEmptyContinuationPages: 2,
	maxRetryAttempts: 5,
} as const;

export type MailboxSyncBudget = {
	pageSize: number;
	maxPages: number;
	maxMessages: number;
	maxCursorResets: number;
	maxEmptyContinuationPages: number;
	maxRetryAttempts: number;
};

export type MailboxSyncState = {
	mode: "incremental" | "recovery-full";
	cursor: string | null;
	pageToken: string | null;
	pagesFetched: number;
	messagesFetched: number;
	cursorResets: number;
	emptyContinuationPages: number;
	retryAttempts: number;
	since: Date | null;
	seenContinuations: readonly string[];
};

export function beginMailboxSync(input: {
	cursor: string | null;
	since: Date | null;
}): MailboxSyncState {
	return {
		mode: "incremental",
		cursor: input.cursor,
		pageToken: null,
		pagesFetched: 0,
		messagesFetched: 0,
		cursorResets: 0,
		emptyContinuationPages: 0,
		retryAttempts: 0,
		since: input.since,
		seenContinuations: [],
	};
}

type MailboxSyncRequest = {
	cursor?: string;
	pageToken?: string;
	since: Date | null;
	fullSync: boolean;
	limit: number;
};

type MailboxSyncResult =
	| {
			kind: "fetch" | "reset-cursor";
			state: MailboxSyncState;
			request: MailboxSyncRequest;
	  }
	| { kind: "retry"; state: MailboxSyncState; retryAfterMs: number }
	| { kind: "reauthorize"; state: MailboxSyncState }
	| { kind: "complete"; state: MailboxSyncState; truncated: boolean }
	| { kind: "fail"; reason: string };

function requestFor(
	state: MailboxSyncState,
	budget: MailboxSyncBudget,
): MailboxSyncRequest {
	return {
		cursor: state.cursor ?? undefined,
		pageToken: state.pageToken ?? undefined,
		since: state.since,
		fullSync: state.mode === "recovery-full",
		limit: Math.max(
			0,
			Math.min(budget.pageSize, budget.maxMessages - state.messagesFetched),
		),
	};
}

function validBudget(budget: MailboxSyncBudget) {
	return (
		Number.isSafeInteger(budget.pageSize) &&
		budget.pageSize > 0 &&
		budget.pageSize <= 100 &&
		Number.isSafeInteger(budget.maxPages) &&
		budget.maxPages > 0 &&
		budget.maxPages <= 100 &&
		Number.isSafeInteger(budget.maxMessages) &&
		budget.maxMessages > 0 &&
		budget.maxMessages <= 5_000 &&
		Number.isSafeInteger(budget.maxCursorResets) &&
		budget.maxCursorResets >= 0 &&
		budget.maxCursorResets <= 1 &&
		Number.isSafeInteger(budget.maxEmptyContinuationPages) &&
		budget.maxEmptyContinuationPages > 0 &&
		budget.maxEmptyContinuationPages <= 10 &&
		Number.isSafeInteger(budget.maxRetryAttempts) &&
		budget.maxRetryAttempts > 0 &&
		budget.maxRetryAttempts <= 10
	);
}

export function advanceMailboxSync(input: {
	state: MailboxSyncState;
	outcome:
		| {
				kind: "page";
				page: Pick<
					MailboxSyncPage,
					"messages" | "nextPageToken" | "nextCursor" | "cursorInvalid"
				>;
		  }
		| { kind: "error"; error: MailboxProviderError };
	budget?: MailboxSyncBudget;
}): MailboxSyncResult {
	const budget = input.budget ?? DEFAULT_MAILBOX_SYNC_BUDGET;
	if (!validBudget(budget))
		return { kind: "fail", reason: "invalid-sync-budget" };

	if (input.outcome.kind === "error") {
		const recovery = resolveMailboxRetry(input.outcome.error, {
			attempt: input.state.retryAttempts,
			maxAttempts: budget.maxRetryAttempts,
		});
		if (recovery.action === "reauthorize")
			return { kind: "reauthorize", state: input.state };
		if (recovery.action === "retry") {
			return {
				kind: "retry",
				state: {
					...input.state,
					retryAttempts: input.state.retryAttempts + 1,
				},
				retryAfterMs: recovery.retryAfterMs,
			};
		}
		if (recovery.action === "bounded-recovery") {
			if (!input.state.since) {
				return { kind: "fail", reason: "recovery-window-required" };
			}
			if (input.state.cursorResets >= budget.maxCursorResets) {
				return { kind: "fail", reason: "cursor-recovery-exhausted" };
			}
			const state: MailboxSyncState = {
				...input.state,
				mode: "recovery-full",
				cursor: null,
				pageToken: null,
				cursorResets: input.state.cursorResets + 1,
				seenContinuations: [],
			};
			return {
				kind: "reset-cursor",
				state,
				request: requestFor(state, budget),
			};
		}
		return { kind: "fail", reason: "provider-error" };
	}

	const page = input.outcome.page;
	if (page.cursorInvalid) {
		if (page.messages.length > 0) {
			return { kind: "fail", reason: "malformed-cursor-page" };
		}
		if (input.state.cursorResets >= budget.maxCursorResets) {
			return { kind: "fail", reason: "cursor-recovery-exhausted" };
		}
		if (!input.state.since) {
			return { kind: "fail", reason: "recovery-window-required" };
		}
		const state: MailboxSyncState = {
			...input.state,
			mode: "recovery-full",
			cursor: null,
			pageToken: null,
			cursorResets: input.state.cursorResets + 1,
			seenContinuations: [],
		};
		return {
			kind: "reset-cursor",
			state,
			request: requestFor(state, budget),
		};
	}
	const remainingMessages = budget.maxMessages - input.state.messagesFetched;
	if (page.messages.length > Math.min(budget.pageSize, remainingMessages)) {
		return {
			kind: "fail",
			reason: "page-size-exceeded",
		};
	}
	if (page.nextPageToken && page.nextCursor) {
		// A cursor may accompany the final page, but not an active page token; persist it only after completion.
		return { kind: "fail", reason: "ambiguous-continuation" };
	}

	const continuation = page.nextPageToken
		? `page:${page.nextPageToken}`
		: page.nextCursor
			? `cursor:${page.nextCursor}`
			: null;
	if (continuation && input.state.seenContinuations.includes(continuation)) {
		return { kind: "fail", reason: "continuation-loop" };
	}

	const pagesFetched = input.state.pagesFetched + 1;
	const messagesFetched = input.state.messagesFetched + page.messages.length;
	const hasContinuation = Boolean(page.nextPageToken);
	const emptyContinuationPages =
		hasContinuation && page.messages.length === 0
			? input.state.emptyContinuationPages + 1
			: 0;
	const state: MailboxSyncState = {
		...input.state,
		cursor: page.nextCursor ?? input.state.cursor,
		pageToken: page.nextPageToken ?? null,
		pagesFetched,
		messagesFetched,
		emptyContinuationPages,
		retryAttempts: 0,
		seenContinuations: continuation
			? [...input.state.seenContinuations, continuation]
			: input.state.seenContinuations,
	};
	const truncated =
		pagesFetched >= budget.maxPages ||
		messagesFetched >= budget.maxMessages ||
		emptyContinuationPages >= budget.maxEmptyContinuationPages;
	if (truncated || !hasContinuation)
		return { kind: "complete", state, truncated };
	return { kind: "fetch", state, request: requestFor(state, budget) };
}

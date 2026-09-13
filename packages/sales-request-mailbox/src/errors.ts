import type { MailboxProvider } from "./contracts.js";

export type MailboxProviderErrorCode =
	| "authorization-revoked"
	| "cursor-invalid"
	| "rate-limited"
	| "network"
	| "provider-unavailable"
	| "malformed-response"
	| "account-mismatch";

const retryableCodes = new Set<MailboxProviderErrorCode>([
	"cursor-invalid",
	"rate-limited",
	"network",
	"provider-unavailable",
]);

export class MailboxProviderError extends Error {
	readonly code: MailboxProviderErrorCode;
	readonly provider: MailboxProvider;
	readonly retryAfterMs: number | null;
	readonly retryDelayExceeded: boolean;
	readonly retryable: boolean;
	readonly requiresReauthorization: boolean;

	constructor(input: {
		code: MailboxProviderErrorCode;
		provider: MailboxProvider;
		retryAfterMs?: number;
	}) {
		super("Mailbox provider operation failed");
		this.name = "MailboxProviderError";
		this.code = input.code;
		this.provider = input.provider;
		this.retryDelayExceeded =
			Number.isSafeInteger(input.retryAfterMs) &&
			(input.retryAfterMs ?? 0) > 15 * 60_000;
		this.retryAfterMs =
			Number.isSafeInteger(input.retryAfterMs) && !this.retryDelayExceeded
				? Math.max(0, input.retryAfterMs ?? 0)
				: null;
		this.retryable = retryableCodes.has(input.code);
		this.requiresReauthorization = input.code === "authorization-revoked";
	}
}

export function mailboxProviderErrorEvidence(error: MailboxProviderError) {
	return {
		code: error.code,
		provider: error.provider,
		retryable: error.retryable,
		requiresReauthorization: error.requiresReauthorization,
		retryAfterMs: error.retryAfterMs,
	};
}

export function resolveMailboxRetry(
	error: MailboxProviderError,
	budget: { attempt: number; maxAttempts: number },
):
	| { action: "reauthorize"; retryAfterMs: null }
	| { action: "bounded-recovery"; retryAfterMs: 0 }
	| { action: "retry"; retryAfterMs: number }
	| { action: "dead-letter"; retryAfterMs: null } {
	if (error.requiresReauthorization) {
		return { action: "reauthorize", retryAfterMs: null };
	}
	if (error.code === "cursor-invalid") {
		return { action: "bounded-recovery", retryAfterMs: 0 };
	}
	if (
		error.retryDelayExceeded ||
		budget.attempt >= budget.maxAttempts ||
		budget.attempt < 0 ||
		budget.maxAttempts < 1
	) {
		return { action: "dead-letter", retryAfterMs: null };
	}
	if (error.retryable) {
		return { action: "retry", retryAfterMs: error.retryAfterMs ?? 5_000 };
	}
	return { action: "dead-letter", retryAfterMs: null };
}

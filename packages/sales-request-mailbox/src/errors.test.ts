import { describe, expect, test } from "bun:test";
import {
	MailboxProviderError,
	mailboxProviderErrorEvidence,
	resolveMailboxRetry,
} from "./errors";

describe("mailbox provider errors", () => {
	test("exposes only bounded operational evidence", () => {
		const error = new MailboxProviderError({
			code: "rate-limited",
			provider: "gmail",
			retryAfterMs: 90_000,
		});
		expect(mailboxProviderErrorEvidence(error)).toEqual({
			code: "rate-limited",
			provider: "gmail",
			retryable: true,
			requiresReauthorization: false,
			retryAfterMs: 90_000,
		});
		expect(error.message).toBe("Mailbox provider operation failed");
	});

	test("bounds retry and distinguishes cursor recovery from reauthorization", () => {
		expect(
			resolveMailboxRetry(
				new MailboxProviderError({
					code: "cursor-invalid",
					provider: "microsoft-graph",
				}),
				{ attempt: 0, maxAttempts: 5 },
			),
		).toEqual({ action: "bounded-recovery", retryAfterMs: 0 });
		expect(
			resolveMailboxRetry(
				new MailboxProviderError({
					code: "authorization-revoked",
					provider: "gmail",
				}),
				{ attempt: 0, maxAttempts: 5 },
			),
		).toEqual({ action: "reauthorize", retryAfterMs: null });
	});

	test("dead-letters exhausted attempts and provider delays above the safe bound", () => {
		const rateLimit = new MailboxProviderError({
			code: "rate-limited",
			provider: "gmail",
			retryAfterMs: 60 * 60_000,
		});
		expect(
			resolveMailboxRetry(rateLimit, { attempt: 0, maxAttempts: 5 }),
		).toEqual({
			action: "dead-letter",
			retryAfterMs: null,
		});
		expect(
			resolveMailboxRetry(
				new MailboxProviderError({ code: "network", provider: "gmail" }),
				{ attempt: 5, maxAttempts: 5 },
			),
		).toEqual({ action: "dead-letter", retryAfterMs: null });
	});
});

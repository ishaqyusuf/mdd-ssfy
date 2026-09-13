import { describe, expect, test } from "bun:test";
import {
	createMailboxOAuthAttempt,
	digestMailboxOAuthState,
	validateMailboxOAuthAttempt,
} from "./oauth-state";

describe("mailbox OAuth state", () => {
	test("stores only a digest in a short-lived server-owned attempt", () => {
		const now = new Date("2026-09-13T12:00:00.000Z");
		const result = createMailboxOAuthAttempt({
			organizationId: 2,
			ownerUserId: 7,
			provider: "gmail",
			redirectKey: "sales-request-inbox",
			now,
		});
		expect(result.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(result.attempt).toMatchObject({
			stateDigest: digestMailboxOAuthState(result.state),
			organizationId: 2,
			ownerUserId: 7,
			provider: "gmail",
			consumedAt: null,
		});
		expect(result.attempt.expiresAt.getTime() - now.getTime()).toBe(
			10 * 60_000,
		);
		expect(JSON.stringify(result.attempt)).not.toContain(result.state);
	});

	test("fails closed for a mismatch, expiry, consumption, or malformed state", () => {
		const now = new Date("2026-09-13T12:00:00.000Z");
		const created = createMailboxOAuthAttempt({
			organizationId: 2,
			ownerUserId: 7,
			provider: "gmail",
			redirectKey: "sales-settings-mailbox",
			now,
		});
		expect(
			validateMailboxOAuthAttempt({
				state: created.state,
				attempt: created.attempt,
				provider: "gmail",
				now,
			}),
		).toEqual({ valid: true });
		expect(
			validateMailboxOAuthAttempt({
				state: created.state,
				attempt: created.attempt,
				provider: "microsoft-graph",
				now,
			}),
		).toEqual({ valid: false, reason: "provider-mismatch" });
		expect(
			validateMailboxOAuthAttempt({
				state: created.state,
				attempt: created.attempt,
				provider: "gmail",
				now: created.attempt.expiresAt,
			}),
		).toEqual({ valid: false, reason: "expired" });
		expect(
			validateMailboxOAuthAttempt({
				state: created.state,
				attempt: { ...created.attempt, consumedAt: now },
				provider: "gmail",
				now,
			}),
		).toEqual({ valid: false, reason: "already-consumed" });
		expect(
			validateMailboxOAuthAttempt({
				state: "bad",
				attempt: created.attempt,
				provider: "gmail",
				now,
			}),
		).toEqual({ valid: false, reason: "state-invalid" });
	});
});

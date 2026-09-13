import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { MailboxProvider } from "./contracts.js";

export const MAILBOX_OAUTH_STATE_TTL_MS = 10 * 60_000;
export const MAILBOX_OAUTH_REDIRECT_KEYS = [
	"sales-request-inbox",
	"sales-settings-mailbox",
] as const;
export type MailboxOAuthRedirectKey =
	(typeof MAILBOX_OAUTH_REDIRECT_KEYS)[number];

export type MailboxOAuthAttempt = {
	stateDigest: string;
	organizationId: number;
	ownerUserId: number;
	provider: MailboxProvider;
	redirectKey: MailboxOAuthRedirectKey;
	issuedAt: Date;
	expiresAt: Date;
	consumedAt: Date | null;
};

export function digestMailboxOAuthState(state: string) {
	return `mso1:${createHash("sha256")
		.update("gnd:sales-request-mailbox-oauth-state:v1\0")
		.update(state)
		.digest("hex")}`;
}

export function createMailboxOAuthAttempt(input: {
	organizationId: number;
	ownerUserId: number;
	provider: MailboxProvider;
	redirectKey: MailboxOAuthRedirectKey;
	now?: Date;
}) {
	const issuedAt = input.now ?? new Date();
	const state = randomBytes(32).toString("base64url");
	return {
		state,
		attempt: {
			stateDigest: digestMailboxOAuthState(state),
			organizationId: input.organizationId,
			ownerUserId: input.ownerUserId,
			provider: input.provider,
			redirectKey: input.redirectKey,
			issuedAt,
			expiresAt: new Date(issuedAt.getTime() + MAILBOX_OAUTH_STATE_TTL_MS),
			consumedAt: null,
		} satisfies MailboxOAuthAttempt,
	};
}

export function validateMailboxOAuthAttempt(input: {
	state: string;
	attempt: MailboxOAuthAttempt;
	provider: MailboxProvider;
	now?: Date;
}):
	| { valid: true }
	| {
			valid: false;
			reason:
				| "state-invalid"
				| "provider-mismatch"
				| "expired"
				| "already-consumed";
	  } {
	if (!/^[A-Za-z0-9_-]{43}$/.test(input.state)) {
		return { valid: false, reason: "state-invalid" };
	}
	const expected = Buffer.from(input.attempt.stateDigest);
	const actual = Buffer.from(digestMailboxOAuthState(input.state));
	if (
		expected.byteLength !== actual.byteLength ||
		!timingSafeEqual(expected, actual)
	) {
		return { valid: false, reason: "state-invalid" };
	}
	if (input.attempt.provider !== input.provider) {
		return { valid: false, reason: "provider-mismatch" };
	}
	if (input.attempt.consumedAt) {
		return { valid: false, reason: "already-consumed" };
	}
	if (
		(input.now ?? new Date()).getTime() >= input.attempt.expiresAt.getTime()
	) {
		return { valid: false, reason: "expired" };
	}
	return { valid: true };
}

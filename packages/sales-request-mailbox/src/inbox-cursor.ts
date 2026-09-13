import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
	MAILBOX_INBOX_CURSOR_MAX_CHARS,
	mailboxInboxCursorSchema,
	mailboxInboxPageRequestSchema,
} from "./inbox-read";

const CURSOR_VERSION = 1 as const;
const CURSOR_PREFIX = "mbx1";
const CURSOR_DEFAULT_TTL_MS = 15 * 60_000;
const CURSOR_MAX_TTL_MS = 60 * 60_000;
const CURSOR_KEY_BYTES = 32;

function hasControlCharacters(value: string) {
	return Array.from(value).some((character) => {
		const code = character.codePointAt(0) ?? 0;
		return code < 32 || code === 127;
	});
}

const identifierSchema = z
	.string()
	.trim()
	.min(1)
	.max(255)
	.refine((value) => !hasControlCharacters(value));
const queueIdentitySchema = z
	.string()
	.regex(/^srq[1-9][0-9]*:[a-f0-9]{64}$/)
	.max(80);
const scopeSchema = z
	.object({
		ownerUserId: z.number().int().positive(),
		organizationId: z.number().int().positive(),
		connectionId: identifierSchema,
		connectionRevision: z.number().int().nonnegative(),
		authorityRevision: identifierSchema,
		status: z
			.enum([
				"new",
				"processing",
				"needs-review",
				"ready-to-apply",
				"completed",
				"dismissed",
				"failed",
			])
			.optional(),
		search: z.string().trim().max(120).optional(),
	})
	.strict();
const claimsSchema = z
	.object({
		v: z.literal(CURSOR_VERSION),
		s: z.string().regex(/^[a-f0-9]{64}$/),
		r: z.number().int().nonnegative(),
		q: queueIdentitySchema,
		e: z.number().int().positive(),
	})
	.strict();

export type MailboxInboxCursorScope = z.input<typeof scopeSchema>;
export type MailboxInboxKeyset = {
	receivedAt: Date;
	queueIdentity: string;
};

function requireKey(key: Uint8Array) {
	if (!(key instanceof Uint8Array) || key.byteLength !== CURSOR_KEY_BYTES) {
		throw new Error("mailbox-inbox-cursor-key-invalid");
	}
	return key;
}

function normalizeScope(input: MailboxInboxCursorScope) {
	const scope = scopeSchema.parse(input);
	const filters = mailboxInboxPageRequestSchema.parse({
		status: scope.status,
		search: scope.search,
	});
	return {
		ownerUserId: scope.ownerUserId,
		organizationId: scope.organizationId,
		connectionId: scope.connectionId,
		connectionRevision: scope.connectionRevision,
		authorityRevision: scope.authorityRevision,
		status: filters.status ?? null,
		search: filters.search ?? null,
	};
}

function hmac(key: Uint8Array, domain: string, value: string) {
	return createHmac("sha256", key)
		.update(domain)
		.update("\0")
		.update(value)
		.digest();
}

function scopeDigest(key: Uint8Array, scope: MailboxInboxCursorScope) {
	return hmac(
		key,
		"gnd:sales-request-mailbox-inbox-scope:v1",
		JSON.stringify(normalizeScope(scope)),
	).toString("hex");
}

function validDate(value: Date) {
	return value instanceof Date && !Number.isNaN(value.getTime());
}

export function issueMailboxInboxCursor(input: {
	key: Uint8Array;
	scope: MailboxInboxCursorScope;
	keyset: MailboxInboxKeyset;
	now?: Date;
	ttlMs?: number;
}) {
	const key = requireKey(input.key);
	const now = input.now ?? new Date();
	if (!validDate(now) || !validDate(input.keyset.receivedAt)) {
		throw new Error("mailbox-inbox-cursor-date-invalid");
	}
	const ttlMs = input.ttlMs ?? CURSOR_DEFAULT_TTL_MS;
	if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0 || ttlMs > CURSOR_MAX_TTL_MS) {
		throw new Error("mailbox-inbox-cursor-ttl-invalid");
	}
	const claims = claimsSchema.parse({
		v: CURSOR_VERSION,
		s: scopeDigest(key, input.scope),
		r: input.keyset.receivedAt.getTime(),
		q: input.keyset.queueIdentity,
		e: now.getTime() + ttlMs,
	});
	const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
	const signature = hmac(
		key,
		"gnd:sales-request-mailbox-inbox-cursor:v1",
		payload,
	).toString("base64url");
	return mailboxInboxCursorSchema.parse(
		`${CURSOR_PREFIX}.${payload}.${signature}`,
	);
}

export function readMailboxInboxCursor(input: {
	key: Uint8Array;
	scope: MailboxInboxCursorScope;
	cursor: string;
	now?: Date;
}): MailboxInboxKeyset | null {
	const key = requireKey(input.key);
	const parsedCursor = mailboxInboxCursorSchema.safeParse(input.cursor);
	if (!parsedCursor.success) return null;
	const now = input.now ?? new Date();
	if (!validDate(now)) throw new Error("mailbox-inbox-cursor-date-invalid");
	const parts = parsedCursor.data.split(".");
	if (parts.length !== 3 || parts[0] !== CURSOR_PREFIX) return null;
	const [, payload, suppliedSignature] = parts;
	if (
		!payload ||
		!suppliedSignature ||
		input.cursor.length > MAILBOX_INBOX_CURSOR_MAX_CHARS
	) {
		return null;
	}
	const expectedSignature = hmac(
		key,
		"gnd:sales-request-mailbox-inbox-cursor:v1",
		payload,
	);
	let supplied: Buffer;
	try {
		supplied = Buffer.from(suppliedSignature, "base64url");
	} catch {
		return null;
	}
	if (
		supplied.toString("base64url") !== suppliedSignature ||
		supplied.byteLength !== expectedSignature.byteLength ||
		!timingSafeEqual(supplied, expectedSignature)
	) {
		return null;
	}
	let claims: z.infer<typeof claimsSchema>;
	try {
		claims = claimsSchema.parse(
			JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
		);
	} catch {
		return null;
	}
	const expectedScope = Buffer.from(scopeDigest(key, input.scope), "hex");
	const suppliedScope = Buffer.from(claims.s, "hex");
	if (
		suppliedScope.byteLength !== expectedScope.byteLength ||
		!timingSafeEqual(suppliedScope, expectedScope) ||
		claims.e <= now.getTime()
	) {
		return null;
	}
	const receivedAt = new Date(claims.r);
	if (!validDate(receivedAt)) return null;
	return { receivedAt, queueIdentity: claims.q };
}

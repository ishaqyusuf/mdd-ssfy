import {
	mailboxConnectionStateSchema,
	mailboxHealthStatusSchema,
	mailboxInboxPageRequestSchema,
	mailboxProviderSchema,
} from "@gnd/sales-request-mailbox";
import { z } from "zod";

const connectionIdSchema = z
	.string()
	.trim()
	.min(1)
	.max(255)
	.refine(
		(value) =>
			!Array.from(value).some((character) => {
				const codePoint = character.codePointAt(0) ?? 0;
				return codePoint < 32 || codePoint === 127;
			}),
		"Connection identity contains unsupported characters.",
	);

const boundedIdentifierSchema = z
	.string()
	.trim()
	.min(1)
	.max(255)
	.refine(
		(value) =>
			!Array.from(value).some((character) => {
				const codePoint = character.codePointAt(0) ?? 0;
				return codePoint < 32 || codePoint === 127;
			}),
		"Identifier contains unsupported characters.",
	);

const queueIdentitySchema = z
	.string()
	.trim()
	.max(80)
	.regex(/^srq[1-9][0-9]*:[a-f0-9]{64}$/, "Invalid mailbox queue identity.");

export const salesRequestMailboxBeginConnectSchema = z
	.object({ provider: mailboxProviderSchema })
	.strict();

export const salesRequestMailboxInboxListSchema = z
	.object({ connectionId: connectionIdSchema })
	.merge(mailboxInboxPageRequestSchema)
	.strict();

export const salesRequestMailboxInboxDetailSchema = z
	.object({
		connectionId: connectionIdSchema,
		queueIdentity: queueIdentitySchema,
	})
	.strict();

export const salesRequestMailboxPreviewSchema = z
	.object({
		queueIdentity: queueIdentitySchema,
		type: z.enum(["order", "quote"]),
	})
	.strict();

export const salesRequestMailboxDisconnectSchema = z
	.object({
		connectionId: connectionIdSchema,
		expectedConnectionRevision: z.number().int().nonnegative().safe(),
	})
	.strict();

/**
 * Server-resolved authority fence for Inbox reads. The client can submit only
 * a connection ID; owner, office, revision, and policy evidence are resolved
 * from the authenticated session before an adapter is called.
 */
export const salesRequestMailboxInboxAuthoritySchema = z
	.object({
		connectionId: connectionIdSchema,
		ownerUserId: z.number().int().positive().safe(),
		organizationId: z.number().int().positive().safe(),
		officeAuthorityKey: boundedIdentifierSchema,
		connectionRevision: z.number().int().nonnegative().safe(),
		authorityRevision: boundedIdentifierSchema,
		policyRevision: z.number().int().nonnegative().safe(),
	})
	.strict();
export type SalesRequestMailboxInboxAuthority = z.infer<
	typeof salesRequestMailboxInboxAuthoritySchema
>;

const normalizedEmailSchema = z
	.string()
	.trim()
	.email()
	.max(320)
	.transform((value) => value.toLowerCase());

export const salesRequestMailboxConnectionStatusSchema = z
	.object({
		connectionId: connectionIdSchema,
		provider: mailboxProviderSchema,
		accountEmail: normalizedEmailSchema.nullable(),
		displayName: z.string().trim().max(255).nullable(),
		state: mailboxConnectionStateSchema,
		healthStatus: mailboxHealthStatusSchema,
		revision: z.number().int().nonnegative().safe(),
		lastSyncAt: z.date().nullable(),
	})
	.strict();

export const salesRequestMailboxConnectionsSchema = z
	.object({
		items: z.array(salesRequestMailboxConnectionStatusSchema).max(100),
	})
	.strict();

const boundedHttpsAuthorizationUrlSchema = z
	.string()
	.trim()
	.min(1)
	.max(2048)
	.url()
	.refine((value) => new URL(value).protocol === "https:", {
		message: "Mailbox authorization URL must use HTTPS.",
	});

const salesRequestMailboxConnectRejectionReasonSchema = z.enum([
	"missing-session",
	"employee-inactive",
	"profile-inactive",
	"office-unavailable",
	"settings-unavailable",
	"invalid-authority",
	"policy-disabled",
	"emergency-disabled",
	"owner-ineligible",
	"provider-ineligible",
	"provider-unavailable",
	"authority-changed",
]);

/** Public connect output. Provider state and credentials never cross this boundary. */
export const salesRequestMailboxConnectionStartResultSchema =
	z.discriminatedUnion("kind", [
		z
			.object({
				kind: z.literal("authorization-ready"),
				authorizationUrl: boundedHttpsAuthorizationUrlSchema,
			})
			.strict(),
		z
			.object({
				kind: z.literal("rejected"),
				reason: salesRequestMailboxConnectRejectionReasonSchema,
			})
			.strict(),
	]);

const salesRequestMailboxDisconnectRejectionReasonSchema = z.enum([
	"missing-session",
	"connection-unavailable",
	"connection-changed",
]);

/** Public disconnect output; cleanup claims and provider details are private. */
export const salesRequestMailboxDisconnectResultSchema = z.discriminatedUnion(
	"kind",
	[
		z.object({ kind: z.literal("disconnected") }).strict(),
		z.object({ kind: z.literal("cancelled") }).strict(),
		z.object({ kind: z.literal("retry-pending") }).strict(),
		z
			.object({
				kind: z.literal("rejected"),
				reason: salesRequestMailboxDisconnectRejectionReasonSchema,
			})
			.strict(),
	],
);

import { z } from "zod";
import {
	type MailboxProvider,
	mailboxProviderSchema,
	resolveMailboxAccess,
} from "./contracts";
import type { MailboxProviderErrorCode } from "./errors";
import { prepareMailboxDisplayText } from "./sanitization";
import type { MailboxTokenHealthErrorCode } from "./token-health-lifecycle";

/**
 * The Inbox is a queue projection, not a second mail client. Keep its read
 * surface small so a page cannot accidentally become a provider-payload
 * transport or a model-input transport.
 */
export const MAILBOX_QUEUE_STATUSES = [
	"new",
	"processing",
	"needs-review",
	"ready-to-apply",
	"completed",
	"dismissed",
	"failed",
] as const;
export const mailboxQueueStatusSchema = z.enum(MAILBOX_QUEUE_STATUSES);
export type MailboxQueueStatus = z.infer<typeof mailboxQueueStatusSchema>;

export const MAILBOX_INBOX_PAGE_DEFAULT_LIMIT = 50;
export const MAILBOX_INBOX_PAGE_MAX_LIMIT = 100;
export const MAILBOX_INBOX_SEARCH_MAX_CHARS = 120;
export const MAILBOX_INBOX_CURSOR_MAX_CHARS = 2048;
export const MAILBOX_INBOX_TEXT_MAX_CHARS = 100_000;
export const MAILBOX_INBOX_MAX_RECIPIENTS = 100;
export const MAILBOX_INBOX_MAX_RETRY_ATTEMPTS = 5;

const boundedCursorSchema = z
	.string()
	.min(1)
	.max(MAILBOX_INBOX_CURSOR_MAX_CHARS)
	.refine((value) => value === value.trim(), "Inbox cursor must be trimmed.")
	.regex(
		/^mbx1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
		"Inbox cursor must be opaque.",
	);

/** A cursor is an API-issued keyset envelope, never a provider cursor. */
export const mailboxInboxCursorSchema = boundedCursorSchema;
export type MailboxInboxCursor = z.infer<typeof mailboxInboxCursorSchema>;

const boundedSearchSchema = z
	.string()
	.trim()
	.max(MAILBOX_INBOX_SEARCH_MAX_CHARS)
	.refine(
		(value) =>
			!Array.from(value).some((character) => {
				const code = character.codePointAt(0) ?? 0;
				return code < 32 || code === 127;
			}),
		"Search contains unsupported control characters.",
	)
	.transform((value) => value || undefined)
	.optional();

/** Client filters intentionally contain no owner, organization, or provider ID. */
export const mailboxInboxPageRequestSchema = z
	.object({
		status: mailboxQueueStatusSchema.optional(),
		search: boundedSearchSchema,
		limit: z
			.number()
			.int()
			.min(1)
			.max(MAILBOX_INBOX_PAGE_MAX_LIMIT)
			.default(MAILBOX_INBOX_PAGE_DEFAULT_LIMIT),
		cursor: mailboxInboxCursorSchema.optional(),
	})
	.strict();
export type MailboxInboxPageRequest = z.infer<
	typeof mailboxInboxPageRequestSchema
>;

const positiveIdSchema = z.number().int().positive();
const boundedConnectionIdSchema = z.string().trim().min(1).max(255);

export const mailboxInboxReadAuthorizationInputSchema = z
	.object({
		actorUserId: positiveIdSchema,
		ownerUserId: positiveIdSchema,
		isOrganizationAdmin: z.boolean(),
		/** Server-resolved evidence; clients cannot opt into these fields. */
		actorActive: z.literal(true),
		authorityCurrent: z.literal(true),
		actorOrganizationId: positiveIdSchema,
		connectionOrganizationId: positiveIdSchema,
		connectionId: boundedConnectionIdSchema,
	})
	.strict()
	.superRefine((value, context) => {
		if (value.actorOrganizationId !== value.connectionOrganizationId) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["connectionOrganizationId"],
				message: "Mailbox connection is outside the actor office.",
			});
		}
	});
export type MailboxInboxReadAuthorizationInput = z.infer<
	typeof mailboxInboxReadAuthorizationInputSchema
>;

/**
 * Content is always owner-only. This delegates the policy decision to the
 * existing shared access helper and fails closed for malformed server context.
 */
export function authorizeMailboxInboxContentRead(
	input: unknown,
): ReturnType<typeof resolveMailboxAccess> {
	const parsed = mailboxInboxReadAuthorizationInputSchema.safeParse(input);
	if (!parsed.success) return { allowed: false, reason: "owner-required" };
	return resolveMailboxAccess({ ...parsed.data, resource: "content" });
}

/** Administrators may receive health metadata, but never message content. */
export function authorizeMailboxInboxHealthRead(
	input: unknown,
): ReturnType<typeof resolveMailboxAccess> {
	const parsed = mailboxInboxReadAuthorizationInputSchema.safeParse(input);
	if (!parsed.success) return { allowed: false, reason: "owner-required" };
	return resolveMailboxAccess({ ...parsed.data, resource: "health" });
}

const queueIdentitySchema = z
	.string()
	.trim()
	.regex(/^srq[1-9][0-9]*:[a-f0-9]{64}$/, "Invalid mailbox queue identity.")
	.max(80);
const mailboxDateSchema = z.date();
const normalizedEmailSchema = z
	.string()
	.trim()
	.email()
	.max(320)
	.transform((value) => value.toLowerCase());
const boundedNullableText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.nullable()
		.optional()
		.transform((value) => value ?? null);
const boundedRecipientListSchema = z
	.array(normalizedEmailSchema)
	.max(MAILBOX_INBOX_MAX_RECIPIENTS)
	.transform((values) => [...new Set(values)].sort());

const mailboxInboxSummarySourceSchema = z.object({
	queueIdentity: queueIdentitySchema,
	status: mailboxQueueStatusSchema,
	receivedAt: mailboxDateSchema,
	fromEmail: normalizedEmailSchema,
	fromName: boundedNullableText(255),
	subject: boundedNullableText(998),
	hasAttachments: z.boolean(),
});

/** Safe summary fields used by status tabs and keyset pages. */
export const mailboxInboxSummarySchema = z
	.object({
		queueIdentity: queueIdentitySchema,
		status: mailboxQueueStatusSchema,
		receivedAt: mailboxDateSchema,
		fromEmail: normalizedEmailSchema,
		fromName: z.string().max(255).nullable(),
		subject: z.string().max(998).nullable(),
		hasAttachments: z.boolean(),
	})
	.strict();
export type MailboxInboxSummary = z.infer<typeof mailboxInboxSummarySchema>;

export type MailboxInboxSummarySource = {
	queueIdentity: string;
	status: MailboxQueueStatus;
	receivedAt: Date;
	fromEmail: string;
	fromName?: string | null;
	subject?: string | null;
	hasAttachments: boolean;
};

function cloneDate(value: Date) {
	return new Date(value.getTime());
}

export function projectMailboxInboxSummary(
	input: unknown,
): MailboxInboxSummary {
	const source = mailboxInboxSummarySourceSchema.parse(input);
	return mailboxInboxSummarySchema.parse({
		queueIdentity: source.queueIdentity,
		status: source.status,
		receivedAt: cloneDate(source.receivedAt),
		fromEmail: source.fromEmail,
		fromName: source.fromName,
		subject: source.subject,
		hasAttachments: source.hasAttachments,
	});
}

const mailboxInboxDetailSourceSchema = mailboxInboxSummarySourceSchema.extend({
	displayText: z.string().trim().min(1).max(MAILBOX_INBOX_TEXT_MAX_CHARS),
	toEmails: boundedRecipientListSchema,
	ccEmails: boundedRecipientListSchema,
});

/** Full content is still sanitized text, never HTML, provider payload, or model input. */
export const mailboxInboxDetailProjectionSchema = mailboxInboxSummarySchema
	.extend({
		displayText: z.string().min(1).max(MAILBOX_INBOX_TEXT_MAX_CHARS),
		toEmails: boundedRecipientListSchema,
		ccEmails: boundedRecipientListSchema,
	})
	.strict();
export type MailboxInboxDetail = z.infer<
	typeof mailboxInboxDetailProjectionSchema
>;

export type MailboxInboxDetailSource = MailboxInboxSummarySource & {
	displayText: string;
	toEmails: readonly string[];
	ccEmails: readonly string[];
};

export function projectMailboxInboxDetail(input: unknown): MailboxInboxDetail {
	const source = mailboxInboxDetailSourceSchema.parse(input);
	const displayText = prepareMailboxDisplayText({ text: source.displayText });
	if (!displayText) throw new Error("invalid-sanitized-message");
	return mailboxInboxDetailProjectionSchema.parse({
		...projectMailboxInboxSummary(source),
		displayText,
		toEmails: source.toEmails,
		ccEmails: source.ccEmails,
	});
}

const statusCountSchema = z.number().int().min(0).max(1_000_000_000);

export const mailboxInboxStatusCountsSchema = z
	.object({
		new: statusCountSchema,
		processing: statusCountSchema,
		"needs-review": statusCountSchema,
		"ready-to-apply": statusCountSchema,
		completed: statusCountSchema,
		dismissed: statusCountSchema,
		failed: statusCountSchema,
	})
	.strict();
export type MailboxInboxStatusCounts = z.infer<
	typeof mailboxInboxStatusCountsSchema
>;

export const DEFAULT_MAILBOX_INBOX_STATUS_COUNTS: MailboxInboxStatusCounts = {
	new: 0,
	processing: 0,
	"needs-review": 0,
	"ready-to-apply": 0,
	completed: 0,
	dismissed: 0,
	failed: 0,
};

export const mailboxInboxPageResultSchema = z
	.object({
		items: z.array(mailboxInboxSummarySchema).max(MAILBOX_INBOX_PAGE_MAX_LIMIT),
		nextCursor: mailboxInboxCursorSchema.nullable(),
		statusCounts: mailboxInboxStatusCountsSchema,
	})
	.strict();
export type MailboxInboxPageResult = z.infer<
	typeof mailboxInboxPageResultSchema
>;

export type MailboxInboxPageSource = {
	items: readonly MailboxInboxSummarySource[];
	nextCursor?: string | null;
	statusCounts: MailboxInboxStatusCounts;
};

const mailboxInboxPageSourceSchema = z
	.object({
		items: z.array(z.unknown()).max(MAILBOX_INBOX_PAGE_MAX_LIMIT),
		nextCursor: mailboxInboxCursorSchema.nullable().optional(),
		statusCounts: mailboxInboxStatusCountsSchema,
	})
	.strip();

export function projectMailboxInboxPage(
	input: unknown,
): MailboxInboxPageResult {
	const source = mailboxInboxPageSourceSchema.parse(input);
	return mailboxInboxPageResultSchema.parse({
		items: source.items.map(projectMailboxInboxSummary),
		nextCursor: source.nextCursor ?? null,
		statusCounts: source.statusCounts,
	});
}

export const MAILBOX_CONNECTION_STATES = [
	"active",
	"disconnecting",
	"disconnected",
] as const;
export const mailboxConnectionStateSchema = z.enum(MAILBOX_CONNECTION_STATES);
export type MailboxConnectionState = z.infer<
	typeof mailboxConnectionStateSchema
>;

export const MAILBOX_HEALTH_STATUSES = [
	"healthy",
	"temporarily-unavailable",
	"reauthorization-required",
	"dead-lettered",
	"unknown",
] as const;
export const mailboxHealthStatusSchema = z.enum(MAILBOX_HEALTH_STATUSES);
export type MailboxHealthStatus = z.infer<typeof mailboxHealthStatusSchema>;

const mailboxHealthErrorCodeValues = [
	"authorization-revoked",
	"cursor-invalid",
	"rate-limited",
	"network",
	"provider-unavailable",
	"not-found",
	"malformed-response",
	"account-mismatch",
	"scope-mismatch",
	"provider-mismatch",
	"credentials-unavailable",
	"refresh-outcome-unknown",
	"internal-failure",
] as const satisfies readonly (
	| MailboxProviderErrorCode
	| MailboxTokenHealthErrorCode
)[];
export const mailboxHealthErrorCodeSchema = z.enum(
	mailboxHealthErrorCodeValues,
);
export type MailboxHealthErrorCode = z.infer<
	typeof mailboxHealthErrorCodeSchema
>;

const mailboxAdminHealthSourceSchema = z.object({
	connectionId: z.string().trim().min(1).max(255),
	ownerUserId: z.number().int().positive(),
	provider: mailboxProviderSchema,
	connectionState: mailboxConnectionStateSchema,
	healthStatus: mailboxHealthStatusSchema,
	lastCheckedAt: mailboxDateSchema.nullable().optional(),
	lastSuccessfulSyncAt: mailboxDateSchema.nullable().optional(),
	nextAttemptAt: mailboxDateSchema.nullable().optional(),
	retryAttempt: z.number().int().min(0).max(MAILBOX_INBOX_MAX_RETRY_ATTEMPTS),
	errorCode: mailboxHealthErrorCodeSchema.nullable().optional(),
});

/**
 * Deliberately excludes account email, provider message IDs, source content,
 * encrypted credentials, raw errors, and model input. It is safe for the
 * organization-health view after the caller performs health authorization.
 */
export const mailboxAdminHealthProjectionSchema = z
	.object({
		connectionId: z.string().min(1).max(255),
		ownerUserId: z.number().int().positive(),
		provider: mailboxProviderSchema,
		connectionState: mailboxConnectionStateSchema,
		healthStatus: mailboxHealthStatusSchema,
		lastCheckedAt: mailboxDateSchema.nullable(),
		lastSuccessfulSyncAt: mailboxDateSchema.nullable(),
		nextAttemptAt: mailboxDateSchema.nullable(),
		retryAttempt: z.number().int().min(0).max(MAILBOX_INBOX_MAX_RETRY_ATTEMPTS),
		errorCode: mailboxHealthErrorCodeSchema.nullable(),
	})
	.strict();
export type MailboxAdminHealthProjection = z.infer<
	typeof mailboxAdminHealthProjectionSchema
>;

export type MailboxAdminHealthSource = {
	connectionId: string;
	ownerUserId: number;
	provider: MailboxProvider;
	connectionState: MailboxConnectionState;
	healthStatus: MailboxHealthStatus;
	lastCheckedAt?: Date | null;
	lastSuccessfulSyncAt?: Date | null;
	nextAttemptAt?: Date | null;
	retryAttempt: number;
	errorCode?: MailboxHealthErrorCode | null;
};

export function projectMailboxAdminHealth(
	input: unknown,
): MailboxAdminHealthProjection {
	const source = mailboxAdminHealthSourceSchema.parse(input);
	return mailboxAdminHealthProjectionSchema.parse({
		connectionId: source.connectionId,
		ownerUserId: source.ownerUserId,
		provider: source.provider,
		connectionState: source.connectionState,
		healthStatus: source.healthStatus,
		lastCheckedAt:
			source.lastCheckedAt === null || source.lastCheckedAt === undefined
				? null
				: cloneDate(source.lastCheckedAt),
		lastSuccessfulSyncAt:
			source.lastSuccessfulSyncAt === null ||
			source.lastSuccessfulSyncAt === undefined
				? null
				: cloneDate(source.lastSuccessfulSyncAt),
		nextAttemptAt:
			source.nextAttemptAt === null || source.nextAttemptAt === undefined
				? null
				: cloneDate(source.nextAttemptAt),
		retryAttempt: source.retryAttempt,
		errorCode: source.errorCode ?? null,
	});
}

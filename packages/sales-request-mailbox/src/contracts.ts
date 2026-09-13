import { createHash } from "node:crypto";
import { z } from "zod";

export const MAILBOX_PROVIDERS = ["gmail", "microsoft-graph"] as const;
export const mailboxProviderSchema = z.enum(MAILBOX_PROVIDERS);
export type MailboxProvider = z.infer<typeof mailboxProviderSchema>;

export const MAILBOX_AUTOMATION_MODES = [
	"manual",
	"classify",
	"generate",
] as const;
export const mailboxAutomationModeSchema = z.enum(MAILBOX_AUTOMATION_MODES);
export type MailboxAutomationMode = z.infer<typeof mailboxAutomationModeSchema>;

export const MAILBOX_PROVIDER_AUTHORIZATION = {
	gmail: {
		scopes: [
			"https://www.googleapis.com/auth/gmail.readonly",
			"https://www.googleapis.com/auth/userinfo.email",
		],
		credentialEnvironment: [
			"SALES_REQUEST_GMAIL_CLIENT_ID",
			"SALES_REQUEST_GMAIL_CLIENT_SECRET",
			"SALES_REQUEST_GMAIL_REDIRECT_URI",
		],
	},
	"microsoft-graph": {
		scopes: ["offline_access", "User.Read", "Mail.Read"],
		credentialEnvironment: [
			"SALES_REQUEST_MICROSOFT_CLIENT_ID",
			"SALES_REQUEST_MICROSOFT_CLIENT_SECRET",
			"SALES_REQUEST_MICROSOFT_REDIRECT_URI",
		],
	},
} as const satisfies Record<
	MailboxProvider,
	{ scopes: readonly string[]; credentialEnvironment: readonly string[] }
>;

const uniqueSortedStrings = z
	.array(z.string().trim().min(1).max(255))
	.max(100)
	.transform((values) => [...new Set(values)].sort());
const normalizedEmail = z
	.string()
	.trim()
	.email()
	.max(320)
	.transform((value) => value.toLowerCase());
const normalizedDomain = z
	.string()
	.trim()
	.min(1)
	.max(253)
	.transform((value) => value.toLowerCase().replace(/^@/, ""));

export const salesRequestMailboxPolicyInputSchema = z
	.object({
		enabled: z.boolean(),
		supportedProviders: z
			.array(mailboxProviderSchema)
			.max(MAILBOX_PROVIDERS.length),
		eligibleUserIds: z.array(z.number().int().positive()).max(100),
		retentionDays: z.number().int().min(1).max(90),
		maximumAutomationMode: mailboxAutomationModeSchema,
		emergencyDisabled: z.boolean(),
		allowAttachments: z.boolean(),
		maxAttachmentBytes: z
			.number()
			.int()
			.min(0)
			.max(10 * 1024 * 1024),
	})
	.strict()
	.superRefine((value, context) => {
		if (value.enabled && value.supportedProviders.length === 0) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["supportedProviders"],
				message: "Select at least one mailbox provider before enabling.",
			});
		}
		if (value.enabled && value.eligibleUserIds.length === 0) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["eligibleUserIds"],
				message: "Name at least one eligible employee before enabling.",
			});
		}
		if (!value.allowAttachments && value.maxAttachmentBytes !== 0) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["maxAttachmentBytes"],
				message: "Attachment size must be zero when attachments are disabled.",
			});
		}
	});

export type SalesRequestMailboxPolicyInput = z.input<
	typeof salesRequestMailboxPolicyInputSchema
>;

export const salesRequestMailboxPolicySchema =
	salesRequestMailboxPolicyInputSchema.extend({
		revision: z.number().int().min(0),
		changedAt: z.string().datetime().nullable(),
	});
export type SalesRequestMailboxPolicy = z.infer<
	typeof salesRequestMailboxPolicySchema
>;

export const DEFAULT_SALES_REQUEST_MAILBOX_POLICY: SalesRequestMailboxPolicy = {
	enabled: false,
	supportedProviders: [],
	eligibleUserIds: [],
	retentionDays: 30,
	maximumAutomationMode: "manual",
	emergencyDisabled: true,
	allowAttachments: false,
	maxAttachmentBytes: 0,
	revision: 0,
	changedAt: null,
};

export function normalizeMailboxPolicy(value: SalesRequestMailboxPolicyInput) {
	return salesRequestMailboxPolicyInputSchema.parse({
		...value,
		supportedProviders: [...new Set(value.supportedProviders)].sort(),
		eligibleUserIds: [...new Set(value.eligibleUserIds)].sort(
			(left, right) => left - right,
		),
	});
}

const automationRank: Record<MailboxAutomationMode, number> = {
	manual: 0,
	classify: 1,
	generate: 2,
};

export function resolveMailboxAutomationMode(
	requested: MailboxAutomationMode,
	maximum: MailboxAutomationMode,
): MailboxAutomationMode {
	return automationRank[requested] <= automationRank[maximum]
		? requested
		: maximum;
}

export const mailboxConnectionPreferencesInputSchema = z
	.object({
		folderIds: uniqueSortedStrings,
		labelIds: uniqueSortedStrings,
		excludedSenders: z
			.array(normalizedEmail)
			.max(100)
			.transform((values) => [...new Set(values)].sort()),
		excludedDomains: z
			.array(normalizedDomain)
			.max(100)
			.transform((values) => [...new Set(values)].sort()),
		automationMode: mailboxAutomationModeSchema,
		notifyOnNeedsReview: z.boolean(),
	})
	.strict();
export type MailboxConnectionPreferencesInput = z.infer<
	typeof mailboxConnectionPreferencesInputSchema
>;

export const mailboxConnectionAuthoritySchema = z
	.object({
		organizationId: z.number().int().positive(),
		ownerUserId: z.number().int().positive(),
	})
	.strict();
export type MailboxConnectionAuthority = z.infer<
	typeof mailboxConnectionAuthoritySchema
>;

export const mailboxProviderAccountIdentitySchema = z
	.object({
		provider: mailboxProviderSchema,
		providerAccountId: z.string().trim().min(1).max(255),
		accountEmail: normalizedEmail,
	})
	.strict();
export type MailboxProviderAccountIdentity = z.infer<
	typeof mailboxProviderAccountIdentitySchema
>;

/** Server-composed record; never use this schema as a client input boundary. */
export const mailboxConnectionConfigurationSchema = z
	.object({
		...mailboxConnectionAuthoritySchema.shape,
		...mailboxProviderAccountIdentitySchema.shape,
		...mailboxConnectionPreferencesInputSchema.shape,
	})
	.strict();
export type MailboxConnectionConfiguration = z.infer<
	typeof mailboxConnectionConfigurationSchema
>;

const boundedAutomationHeader = z.string().trim().min(1).max(512).optional();
export const mailboxAutomationHeadersSchema = z
	.object({
		autoSubmitted: boundedAutomationHeader,
		autoResponseSuppress: boundedAutomationHeader,
		precedence: boundedAutomationHeader,
		listId: boundedAutomationHeader,
		loopMarker: boundedAutomationHeader,
	})
	.strict();
export type MailboxAutomationHeaders = z.infer<
	typeof mailboxAutomationHeadersSchema
>;

export type MailboxExclusionReason =
	| "folder-not-selected"
	| "mailbox-loop"
	| "excluded-sender"
	| "excluded-domain"
	| "automatic-message";

export type MailboxExclusionInput = {
	folderId?: string | null;
	labelIds: readonly string[];
	fromEmail: string;
	headers: MailboxAutomationHeaders;
};

export function applyMailboxExclusions(
	message: MailboxExclusionInput,
	preferences: MailboxConnectionConfiguration,
): { accepted: true } | { accepted: false; reason: MailboxExclusionReason } {
	const selectedFolder =
		preferences.folderIds.length === 0 ||
		(message.folderId != null &&
			preferences.folderIds.includes(message.folderId));
	const selectedLabel =
		preferences.labelIds.length === 0 ||
		message.labelIds.some((label) => preferences.labelIds.includes(label));
	if (!selectedFolder || !selectedLabel) {
		return { accepted: false, reason: "folder-not-selected" };
	}

	const fromEmail = message.fromEmail.trim().toLowerCase();
	if (fromEmail === preferences.accountEmail) {
		return { accepted: false, reason: "mailbox-loop" };
	}
	if (preferences.excludedSenders.includes(fromEmail)) {
		return { accepted: false, reason: "excluded-sender" };
	}
	const domain = fromEmail.split("@").at(-1);
	if (domain && preferences.excludedDomains.includes(domain)) {
		return { accepted: false, reason: "excluded-domain" };
	}

	const autoSubmitted = message.headers.autoSubmitted?.trim().toLowerCase();
	if (
		(autoSubmitted && autoSubmitted !== "no") ||
		message.headers.autoResponseSuppress ||
		message.headers.loopMarker ||
		message.headers.precedence?.toLowerCase() === "bulk"
	) {
		return { accepted: false, reason: "automatic-message" };
	}
	return { accepted: true };
}

export type MailboxAccessResource = "health" | "settings" | "content";

export function resolveMailboxAccess(input: {
	actorUserId: number;
	ownerUserId: number;
	isOrganizationAdmin: boolean;
	resource: MailboxAccessResource;
}):
	| { allowed: true; scope: "owner" | "administrator-health" }
	| { allowed: false; reason: "owner-required" } {
	if (input.actorUserId === input.ownerUserId) {
		return { allowed: true, scope: "owner" };
	}
	if (input.isOrganizationAdmin && input.resource === "health") {
		return { allowed: true, scope: "administrator-health" };
	}
	return { allowed: false, reason: "owner-required" };
}

export function buildMailboxQueueIdentity(input: {
	connectionId: string;
	providerMessageId: string;
	contentHash: string;
}) {
	const digest = createHash("sha256")
		.update("gnd:sales-request-mailbox-queue:v1\0")
		.update(input.connectionId)
		.update("\0")
		.update(input.providerMessageId)
		.update("\0")
		.update(input.contentHash)
		.digest("hex");
	return `srq1:${digest}`;
}

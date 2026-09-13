import type { MailboxAutomationHeaders, MailboxProvider } from "./contracts.js";

export type MailboxTokenSet = {
	accessToken: string;
	refreshToken?: string;
	expiresAt?: Date;
	grantedScopes: readonly string[];
};

export type MailboxAccountIdentity = {
	provider: MailboxProvider;
	providerAccountId: string;
	email: string;
	displayName?: string;
};

export type MailboxMessageSummary = {
	providerMessageId: string;
	providerThreadId?: string;
	folderId?: string;
	labelIds: readonly string[];
	fromEmail: string;
	fromName?: string;
	subject?: string;
	receivedAt: Date;
	hasAttachments: boolean;
	headers: MailboxAutomationHeaders;
};

export type MailboxMessageDetail = MailboxMessageSummary & {
	textBody?: string;
	htmlBody?: string;
	toEmails: readonly string[];
	ccEmails: readonly string[];
};

export type MailboxSyncPage = {
	messages: readonly MailboxMessageSummary[];
	removedProviderMessageIds: readonly string[];
	nextPageToken?: string;
	nextCursor?: string;
	cursorInvalid: boolean;
};

/**
 * Provider boundary only. Routes exchange OAuth state; jobs call synchronization;
 * neither owns provider-specific message semantics.
 */
export interface SalesRequestMailboxAdapter {
	readonly provider: MailboxProvider;
	createAuthorizationUrl(input: { state: string }): Promise<string>;
	exchangeAuthorizationCode(input: {
		code: string;
		signal?: AbortSignal;
	}): Promise<{ tokens: MailboxTokenSet; account: MailboxAccountIdentity }>;
	refreshTokens(input: {
		tokens: MailboxTokenSet;
		signal?: AbortSignal;
	}): Promise<MailboxTokenSet>;
	revoke(input: {
		tokens: MailboxTokenSet;
		signal?: AbortSignal;
	}): Promise<void>;
	listMessages(input: {
		tokens: MailboxTokenSet;
		cursor?: string;
		pageToken?: string;
		folderId?: string;
		labelId?: string;
		since: Date | null;
		fullSync: boolean;
		limit: number;
		signal?: AbortSignal;
	}): Promise<MailboxSyncPage>;
	getMessage(input: {
		tokens: MailboxTokenSet;
		providerMessageId: string;
		signal?: AbortSignal;
	}): Promise<MailboxMessageDetail>;
	renewSubscription?(input: {
		tokens: MailboxTokenSet;
		callbackUrl: string;
		currentSubscriptionId?: string;
		signal?: AbortSignal;
	}): Promise<{ subscriptionId: string; expiresAt: Date }>;
}

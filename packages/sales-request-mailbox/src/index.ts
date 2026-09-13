export type {
	MailboxAccountIdentity,
	MailboxMessageDetail,
	MailboxMessageSummary,
	MailboxSyncPage,
	MailboxTokenSet,
	SalesRequestMailboxAdapter,
} from "./adapter";
export {
	buildMailboxScopeFingerprint,
	completeMailboxConnection,
	startMailboxConnection,
	validateMailboxGrantedScopes,
} from "./connection-lifecycle";
export type {
	CompleteMailboxConnectionResult,
	MailboxConnectionAttemptRecord,
	MailboxConnectionAttemptTerminalReason,
	MailboxConnectionAuthoritySnapshot,
	MailboxConnectionCommitRecord,
	MailboxConnectionConsumedAttempt,
	MailboxConnectionKeyRing,
	MailboxConnectionLifecycleDependencies,
	MailboxConnectionLifecycleStore,
	MailboxConnectionStartAuthorityRejection,
	MailboxConnectionTarget,
	StartMailboxConnectionResult,
} from "./connection-lifecycle";
export {
	DEFAULT_SALES_REQUEST_MAILBOX_POLICY,
	MAILBOX_AUTOMATION_MODES,
	MAILBOX_PROVIDERS,
	MAILBOX_PROVIDER_AUTHORIZATION,
	applyMailboxExclusions,
	buildMailboxQueueIdentity,
	mailboxAutomationModeSchema,
	mailboxAutomationHeadersSchema,
	mailboxConnectionAuthoritySchema,
	mailboxConnectionConfigurationSchema,
	mailboxConnectionPreferencesInputSchema,
	mailboxProviderSchema,
	mailboxProviderAccountIdentitySchema,
	normalizeMailboxPolicy,
	resolveMailboxAccess,
	resolveMailboxAutomationMode,
	salesRequestMailboxPolicyInputSchema,
	salesRequestMailboxPolicySchema,
} from "./contracts";
export type {
	MailboxAccessResource,
	MailboxAutomationMode,
	MailboxAutomationHeaders,
	MailboxConnectionAuthority,
	MailboxConnectionConfiguration,
	MailboxConnectionPreferencesInput,
	MailboxExclusionInput,
	MailboxExclusionReason,
	MailboxProvider,
	MailboxProviderAccountIdentity,
	SalesRequestMailboxPolicy,
	SalesRequestMailboxPolicyInput,
} from "./contracts";
export {
	decryptMailboxSecret,
	encryptMailboxSecret,
	mailboxEncryptedSecretSchema,
} from "./crypto";
export type { MailboxEncryptedSecret } from "./crypto";
export {
	createMailboxEnvironmentKeyRing,
	createSalesRequestMailboxAdaptersFromEnvironment,
	deriveMailboxInboxCursorKey,
} from "./environment";
export type { MailboxEnvironmentKeyRing } from "./environment";
export {
	MAILBOX_DISCONNECT_AUTHORITY_BEHAVIOR,
	MAILBOX_DISCONNECT_CLAIM_BEHAVIOR,
	MAILBOX_DISCONNECT_CLEANUP_BEHAVIOR,
	disconnectMailboxConnection,
} from "./disconnect-lifecycle";
export type {
	DisconnectMailboxConnectionResult,
	MailboxDisconnectClaim,
	MailboxDisconnectCleanupClaim,
	MailboxDisconnectDependencies,
	MailboxDisconnectFailurePhase,
	MailboxDisconnectFailureReason,
	MailboxDisconnectKeyRing,
	MailboxDisconnectStore,
} from "./disconnect-lifecycle";
export {
	MailboxProviderError,
	mailboxProviderErrorEvidence,
	resolveMailboxRetry,
} from "./errors";
export type {
	MailboxProviderErrorCode,
	MailboxProviderRequestFailure,
} from "./errors";
export {
	MAILBOX_PROVIDER_DEADLINE_RESERVE_MS,
	MAILBOX_PROVIDER_REQUEST_TIMEOUT_MS,
	MAILBOX_PROVIDER_REVOKE_TIMEOUT_MS,
	MailboxProviderRequestAbort,
	classifyMailboxProviderTransportError,
	readBoundedMailboxProviderResponse,
	runMailboxProviderRequest,
} from "./provider-request";
export type {
	MailboxProviderRequestAbortReason,
	MailboxProviderRequestTimeoutKind,
} from "./provider-request";
export {
	MAILBOX_OAUTH_REDIRECT_KEYS,
	MAILBOX_OAUTH_STATE_TTL_MS,
	createMailboxOAuthAttempt,
	digestMailboxOAuthState,
	validateMailboxOAuthAttempt,
} from "./oauth-state";
export type {
	MailboxOAuthAttempt,
	MailboxOAuthRedirectKey,
} from "./oauth-state";
export {
	MAILBOX_MODEL_INPUT_GUARD,
	parseMailboxModelInput,
	prepareMailboxDisplayText,
	prepareMailboxModelInput,
} from "./sanitization";
export {
	advanceMailboxSync,
	beginMailboxSync,
	DEFAULT_MAILBOX_SYNC_BUDGET,
} from "./cursor-recovery";
export type {
	MailboxSyncBudget,
	MailboxSyncState,
} from "./cursor-recovery";
export {
	GmailSalesRequestMailboxAdapter,
	MicrosoftGraphMailboxAdapter,
	createSalesRequestMailboxAdapter,
} from "./providers/index";
export type {
	GmailMailboxAdapterConfig,
	MicrosoftGraphMailboxAdapterConfig,
	SalesRequestMailboxAdapterFactoryInput,
} from "./providers/index";
export {
	mailboxSyncSourceProvider,
	resolveMailboxSyncSources,
	runMailboxSyncStream,
} from "./sync-orchestrator";
export {
	MAILBOX_TOKEN_HEALTH_LEASE_MS,
	MAILBOX_TOKEN_HEALTH_MAX_RETRY_ATTEMPTS,
	MAILBOX_TOKEN_REFRESH_BEFORE_EXPIRY_MS,
	MAILBOX_TOKEN_REFRESH_COMMIT_BEHAVIOR,
	runMailboxTokenHealthLifecycle,
} from "./token-health-lifecycle";
export type {
	MailboxTokenHealthClaim,
	MailboxTokenHealthDependencies,
	MailboxTokenHealthErrorCode,
	MailboxTokenHealthReason,
	MailboxTokenHealthResult,
	MailboxTokenHealthStore,
} from "./token-health-lifecycle";
export {
	MAILBOX_MESSAGE_DETAIL_MAX_RETRY_ATTEMPTS,
	buildMailboxMessageContentHash,
	buildMailboxSourceMembershipIdentity,
	runMailboxMessageDetail,
} from "./message-detail";
export type {
	MailboxMessageDetailDependencies,
	MailboxMessageDetailLeaseScope,
	MailboxMessageDetailRunResult,
	MailboxMessageDetailStore,
	MailboxMessageDetailStoreLease,
	MailboxMessageDetailSuppressionReason,
	MailboxMessageDetailWithdrawalReason,
	MailboxMessageDetailWorkInput,
	MailboxMessageSnapshot,
	MailboxQueueProjection,
	MailboxSourceMembershipProjection,
} from "./message-detail";
export type {
	MailboxSyncAuthorityFence,
	MailboxSyncCheckpoint,
	MailboxSyncDependencies,
	MailboxSyncLeaseFence,
	MailboxSyncMutationResult,
	MailboxSyncRunResult,
	MailboxSyncSource,
	MailboxSyncStore,
	MailboxSyncStoreLease,
	MailboxSyncSummaryProjection,
	MailboxSyncSuppressionReason,
	MailboxSyncTombstoneProjection,
} from "./sync-orchestrator";
export {
	DEFAULT_MAILBOX_INBOX_STATUS_COUNTS,
	MAILBOX_CONNECTION_STATES,
	MAILBOX_HEALTH_STATUSES,
	MAILBOX_INBOX_CURSOR_MAX_CHARS,
	MAILBOX_INBOX_MAX_RECIPIENTS,
	MAILBOX_INBOX_MAX_RETRY_ATTEMPTS,
	MAILBOX_INBOX_PAGE_DEFAULT_LIMIT,
	MAILBOX_INBOX_PAGE_MAX_LIMIT,
	MAILBOX_INBOX_SEARCH_MAX_CHARS,
	MAILBOX_INBOX_TEXT_MAX_CHARS,
	MAILBOX_QUEUE_STATUSES,
	authorizeMailboxInboxContentRead,
	authorizeMailboxInboxHealthRead,
	mailboxAdminHealthProjectionSchema,
	mailboxConnectionStateSchema,
	mailboxHealthErrorCodeSchema,
	mailboxHealthStatusSchema,
	mailboxInboxCursorSchema,
	mailboxInboxDetailProjectionSchema,
	mailboxInboxPageRequestSchema,
	mailboxInboxPageResultSchema,
	mailboxInboxReadAuthorizationInputSchema,
	mailboxInboxStatusCountsSchema,
	mailboxInboxSummarySchema,
	mailboxQueueStatusSchema,
	projectMailboxAdminHealth,
	projectMailboxInboxDetail,
	projectMailboxInboxPage,
	projectMailboxInboxSummary,
} from "./inbox-read";
export {
	issueMailboxInboxCursor,
	readMailboxInboxCursor,
} from "./inbox-cursor";
export type {
	MailboxInboxCursorScope,
	MailboxInboxKeyset,
} from "./inbox-cursor";
export type {
	MailboxAdminHealthProjection,
	MailboxAdminHealthSource,
	MailboxConnectionState,
	MailboxHealthErrorCode,
	MailboxHealthStatus,
	MailboxInboxCursor,
	MailboxInboxDetail,
	MailboxInboxDetailSource,
	MailboxInboxPageRequest,
	MailboxInboxPageResult,
	MailboxInboxPageSource,
	MailboxInboxReadAuthorizationInput,
	MailboxInboxStatusCounts,
	MailboxInboxSummary,
	MailboxInboxSummarySource,
	MailboxQueueStatus,
} from "./inbox-read";
export {
	MAILBOX_RETENTION_PURGE_BEHAVIOR,
	purgeExpiredMailboxContent,
} from "./retention-cleanup";
export type {
	MailboxRetentionCleanupStore,
	MailboxRetentionPurgeCounts,
} from "./retention-cleanup";

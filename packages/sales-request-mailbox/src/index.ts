export type {
	MailboxAccountIdentity,
	MailboxMessageDetail,
	MailboxMessageSummary,
	MailboxSyncPage,
	MailboxTokenSet,
	SalesRequestMailboxAdapter,
} from "./adapter.js";
export {
	buildMailboxScopeFingerprint,
	completeMailboxConnection,
	startMailboxConnection,
	validateMailboxGrantedScopes,
} from "./connection-lifecycle.js";
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
} from "./connection-lifecycle.js";
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
} from "./contracts.js";
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
} from "./contracts.js";
export {
	decryptMailboxSecret,
	encryptMailboxSecret,
	mailboxEncryptedSecretSchema,
} from "./crypto.js";
export type { MailboxEncryptedSecret } from "./crypto.js";
export {
	MAILBOX_DISCONNECT_AUTHORITY_BEHAVIOR,
	MAILBOX_DISCONNECT_CLAIM_BEHAVIOR,
	MAILBOX_DISCONNECT_CLEANUP_BEHAVIOR,
	disconnectMailboxConnection,
} from "./disconnect-lifecycle.js";
export type {
	DisconnectMailboxConnectionResult,
	MailboxDisconnectClaim,
	MailboxDisconnectCleanupClaim,
	MailboxDisconnectDependencies,
	MailboxDisconnectFailurePhase,
	MailboxDisconnectFailureReason,
	MailboxDisconnectKeyRing,
	MailboxDisconnectStore,
} from "./disconnect-lifecycle.js";
export {
	MailboxProviderError,
	mailboxProviderErrorEvidence,
	resolveMailboxRetry,
} from "./errors.js";
export type {
	MailboxProviderErrorCode,
	MailboxProviderRequestFailure,
} from "./errors.js";
export {
	MAILBOX_PROVIDER_DEADLINE_RESERVE_MS,
	MAILBOX_PROVIDER_REQUEST_TIMEOUT_MS,
	MAILBOX_PROVIDER_REVOKE_TIMEOUT_MS,
	MailboxProviderRequestAbort,
	classifyMailboxProviderTransportError,
	readBoundedMailboxProviderResponse,
	runMailboxProviderRequest,
} from "./provider-request.js";
export type {
	MailboxProviderRequestAbortReason,
	MailboxProviderRequestTimeoutKind,
} from "./provider-request.js";
export {
	MAILBOX_OAUTH_REDIRECT_KEYS,
	MAILBOX_OAUTH_STATE_TTL_MS,
	createMailboxOAuthAttempt,
	digestMailboxOAuthState,
	validateMailboxOAuthAttempt,
} from "./oauth-state.js";
export type {
	MailboxOAuthAttempt,
	MailboxOAuthRedirectKey,
} from "./oauth-state.js";
export {
	prepareMailboxDisplayText,
	prepareMailboxModelInput,
} from "./sanitization.js";
export {
	advanceMailboxSync,
	beginMailboxSync,
	DEFAULT_MAILBOX_SYNC_BUDGET,
} from "./cursor-recovery.js";
export type {
	MailboxSyncBudget,
	MailboxSyncState,
} from "./cursor-recovery.js";
export {
	GmailSalesRequestMailboxAdapter,
	MicrosoftGraphMailboxAdapter,
	createSalesRequestMailboxAdapter,
} from "./providers/index.js";
export type {
	GmailMailboxAdapterConfig,
	MicrosoftGraphMailboxAdapterConfig,
	SalesRequestMailboxAdapterFactoryInput,
} from "./providers/index.js";
export {
	mailboxSyncSourceProvider,
	resolveMailboxSyncSources,
	runMailboxSyncStream,
} from "./sync-orchestrator.js";
export {
	MAILBOX_TOKEN_HEALTH_LEASE_MS,
	MAILBOX_TOKEN_HEALTH_MAX_RETRY_ATTEMPTS,
	MAILBOX_TOKEN_REFRESH_BEFORE_EXPIRY_MS,
	MAILBOX_TOKEN_REFRESH_COMMIT_BEHAVIOR,
	runMailboxTokenHealthLifecycle,
} from "./token-health-lifecycle.js";
export type {
	MailboxTokenHealthClaim,
	MailboxTokenHealthDependencies,
	MailboxTokenHealthErrorCode,
	MailboxTokenHealthReason,
	MailboxTokenHealthResult,
	MailboxTokenHealthStore,
} from "./token-health-lifecycle.js";
export {
	MAILBOX_MESSAGE_DETAIL_MAX_RETRY_ATTEMPTS,
	buildMailboxMessageContentHash,
	buildMailboxSourceMembershipIdentity,
	runMailboxMessageDetail,
} from "./message-detail.js";
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
} from "./message-detail.js";
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
} from "./sync-orchestrator.js";

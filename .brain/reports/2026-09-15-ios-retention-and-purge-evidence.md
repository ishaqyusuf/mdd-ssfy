# GND Millwork iOS retention and purge evidence

Date: 2026-09-15
Status: source-backed implementation inventory and owner decision aid; no
production data, provider setting, privacy statement, or retention schedule was
changed by this review.

## Purpose

This report separates retention behavior that the repository actually enforces
from policy decisions and provider facts that remain unknown. It is an input to
the public iOS privacy policy and App Privacy questionnaire, not authorization
to promise a deletion deadline or run a purge.

## Source-proven lifecycle behavior

| Data class | Current behavior proven by source | Physical deletion proven? | Release implication |
| --- | --- | --- | --- |
| Legacy authenticated session | `AUTH_SESSION_MAX_AGE_SECONDS` is seven days and `buildSessionExpiry` creates the expiry timestamp. | No scheduled deletion of every expired legacy `Session` row was found in this review. | State the access-token/session lifetime only after reconciling the exact first-release auth path; expiry is not the same as database purge. |
| Better Auth web/mobile session | Standard sessions are one day; remember-me sessions are 30 days. An expired `WebAuthSession` found by token is deleted, and sessions are deleted when their linked company member is no longer active. | Row deletion is proven on those resolution paths; a general batch purge for never-read expired sessions was not found. | A policy may describe authentication expiry, but must not claim all expired rows disappear immediately. |
| Legacy JWT returned by `user.login` | The signed JWT has a 30-day expiry. | Token expiry is cryptographic; it does not itself delete the related database session or server logs. | Reconcile whether this path is present in the submitted build before final disclosure. |
| Production login-limit counters | Upstash keys expire 60 seconds after the first IP attempt and 600 seconds after the first account attempt. Subjects are HMAC-hashed before becoming keys. | Redis expiry is explicitly configured for these counters. Provider backup/replica behavior is not established locally. | These are short-lived security counters, not durable account history. Confirm provider retention and region. |
| Mobile Logly queue and visitor ID | When enabled, queued events are capped at 250; events older than 24 hours are dropped during flush; delivered events are removed. A random visitor record remains in secure storage until app storage is cleared or a future reset path removes it. | Local queue removal is proven. Collector-side deletion and retention are not. | Final-build enablement and Logly operator/contract/retention remain gates. The persistent visitor identifier may require Apple's Device ID/linkage disclosures. |
| Employee documents | Deleting a user document sets `UserDocuments.deletedAt` and marks the related `StoredDocument` deleted/non-current. | No Blob-byte deletion occurs in `deleteUserDocument`. A separate storage route physically deletes only an authenticated staged browser upload that it successfully claims; it does not establish purge for adopted employee documents. | Describe current deletion as access restriction/tombstoning. Do not promise immediate erasure until a retryable Blob purge and backup-expiry process exists. |
| Dispatch recipient, note, signature, and photos | Completion proof is retained in dispatch metadata; related `StoredDocument` records use `ownerType: "dispatch"`. The source exposes proof-registration evidence only after parent/child and role checks. | No dispatch-proof age-based purge or owner-request deletion path was found. | Adopt an operational/legal retention rule before publishing the policy. Preserve required delivery records and legal holds while bounding media retention where allowed. |
| Mobile access requests and events | One durable request per user/platform records lifecycle timestamps, reviewer, notes, invitation reference, and current status. Append-style events record actor, old/new status, note, metadata, and time. Events cascade only if the parent request is deleted. | No normal request deletion, expiry, archival, or scheduled purge is defined. | Treat this as an auditable access-control record. Approve an audit retention period and post-expiry disposition before promising deletion. |
| Sentry diagnostics | Source proves conditional Sentry integration, not that it is enabled in the exact candidate or what the final payload contains. | No Sentry organization retention or deletion setting is proven locally. | Inspect the exact build and provider configuration; approve a short operational retention window and scrubbers before disclosure. |
| Production database, Blob, hosting logs, and backups | Application records and uploaded files are stored through the configured database/Vercel paths; provider identities and live regions/settings are not fully verified. | Database/Blob backup expiry, hosting log retention, replication, and physical-purge timing are not established by source. | Obtain provider/account evidence and document backup expiry, legal holds, failed-deletion retries, and proof of completion. |

## Important distinctions

- **Expiry** makes a credential or counter unusable after a time; it does not
  prove that every stored row, replica, log, or backup was physically erased.
- **Tombstoning** hides a record from normal active queries while preserving
  the database row. It does not delete the corresponding Blob unless a
  separate storage operation succeeds.
- **Physical purge** requires an authorized deletion operation, retries and
  observable completion across the primary store. Backups normally require a
  separately documented expiry rather than immediate selective deletion.
- **Legal hold** must override routine purge only for the scoped records and
  duration approved by the responsible owner; the repository currently does
  not encode a general legal-hold workflow for these data classes.

## Owner-selectable policy decisions

The responsible legal/data owner should approve exact durations or documented
decision rules. The following are implementation-shaped options, not selected
policy:

1. **Authentication and security:** allow credentials to expire at their
   source-proven limits; batch-delete expired session rows after an approved
   short security/audit buffer; let limiter keys expire at their configured
   TTLs; document provider backup expiry.
2. **Employee profile and documents:** retain while the account/employment and
   applicable record obligation remain active, then restrict access promptly
   and purge eligible Blob/database content after an approved offboarding or
   rights-request period, subject to scoped legal hold.
3. **Dispatch records and proof media:** retain the minimum record required for
   delivery, warranty, dispute, accounting, or legal obligations. The owner may
   choose a shorter media window than the underlying dispatch record if the
   evidence requirement permits it.
4. **Mobile-access audit:** retain request and transition history for an
   approved access-control audit period after the employee or request becomes
   inactive, then delete or irreversibly minimize it unless held.
5. **Analytics and diagnostics:** disable unneeded services for the first
   release or select the shortest useful provider retention after verifying
   final payloads, regions, access, subprocessors, deletion controls, and
   linkage/tracking behavior.
6. **Backups and failed deletions:** define backup expiry, retry/dead-letter
   handling, reconciliation, operator ownership, and evidence that an eligible
   object was removed from each primary store.

## Minimum implementation before an immediate-erasure claim

If the approved policy requires physical deletion rather than tombstoning, the
current employee-document and dispatch-proof flows need a server-owned adapter
and scheduled reconciliation that:

1. resolves only authorized, eligible, non-held records;
2. claims each database record idempotently before deleting storage bytes;
3. records success or a retryable failure without exposing storage secrets;
4. tombstones or removes the database record only under the approved rule;
5. retries failures and provides an auditable operator view; and
6. accounts for provider backups through a documented expiry commitment.

That implementation is not part of this evidence-only step. No record, Blob,
session, provider object, or environment variable was changed.

## Exact gate to clear

Before publishing the app-specific policy or saving Apple App Privacy answers,
the accountable owner must record:

- the controller and Apple seller relationship;
- one duration or decision rule for every row above;
- offboarding and verified privacy-request procedures;
- which records can be held and who authorizes a hold;
- the production providers, regions, backup/log retention, and deletion SLAs;
- whether Logly and Sentry are enabled in the exact candidate; and
- whether the existing tombstone behavior is acceptable or a purge workflow
  must ship first.

Then reconcile those facts with the exact IPA, deployed backend, provider
settings, public policy text, and Apple's questionnaire. Until that review is
complete, do not save or publish a retention/deletion statement in App Store
Connect.

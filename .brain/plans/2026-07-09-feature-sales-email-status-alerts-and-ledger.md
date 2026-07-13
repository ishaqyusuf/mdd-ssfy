# Sales Email Status Alerts And Transaction Ledger

## Status
- Implemented
- GitHub Issue: https://github.com/ishaqyusuf/mdd-ssfy/issues/37
- Created Date: 2026-07-09
- Implemented Date: 2026-07-09

## Source Request
Sales reps currently send sales emails, custom emails, and quote emails without reliable visible confirmation that the email was sent or failed. They have to check Resend outside the app to confirm whether an email went through. The requested feature is an in-app sent/failed alert plus an Email page where reps see their own email transactions and Super Admin can see all transactions and resend failed emails.

## Problem
Sales document email workflows are customer-facing and revenue-impacting, but the current feedback loop is incomplete. The app can show task progress for some sends, and activity records can say an email was sent, but there is no durable in-app provider-status ledger for sales email attempts. That creates uncertainty for reps and leaves Super Admin without a searchable audit/retry surface.

## Current Codebase Context
- Standard quote/invoice email and custom composed sales document email already route through the notification and Trigger.dev task infrastructure.
- The browser task monitor is useful for progress visibility but is same-browser state and not a durable audit ledger.
- Sales document email handlers create activity records, but those activities do not distinguish provider accepted/sent from task completion with enough detail for audit and resend.
- Existing sales table/workspace patterns provide the right UI direction for a dense, filterable Email page.
- The current Resend integration can report immediate send acceptance or provider errors, but the app does not persist those results per sales email attempt.

## Product Direction
Add a durable sales email delivery ledger and a sales Email page.

Sales reps should receive immediate visible status feedback after sending standard quote/invoice emails or custom composed emails. The UI should show queued/sending while the task runs, sent when the provider accepts the email, and failed/skipped when the send does not complete.

Sales reps should be able to review email attempts attached to them, either because they sent the email or because the related sale is assigned to them. Super Admin should be able to review all sales email attempts and resend failed or retryable skipped emails.

## Implementation Direction
- Add a persistent sales email attempt record for each actual recipient/send attempt.
- Record sender/actor, attached sales rep, customer, recipient, related sales ids/order numbers, document type, email kind, subject, optional custom message snapshot, status, provider, provider message id, task run id, failure details, timestamps, and original attempt id for resends.
- Normalize standard quote/invoice sends and custom composed sends through the same delivery-recording contract, while preserving their existing template behavior.
- Make send success/failure alerts depend on the delivery result, not only the background task terminal state.
- Add protected list/detail APIs for the Email page with sales-rep scoping and Super Admin all-access scoping.
- Add a protected resend API for failed/skipped attempts. V1 resend should be Super Admin-only unless implementation confirms an existing sales-management permission is already product-equivalent.
- Resend must create a new linked attempt instead of mutating the failed attempt into success.
- Keep existing PDF, payment link, quote acceptance, and template behavior intact except where delivery context must be recorded for audit and resend.

## Testing Seam
Primary seam: the protected sales email delivery/notification contract. Tests should exercise standard and composed sales document email sends through the highest available backend contract and assert the externally visible results: durable attempt rows, provider ids/errors, statuses, permission-scoped reads, and resend behavior.

Secondary checks:
- UI send controls show queued/sent/failed feedback for standard and custom sales document email sends.
- The Email page filters and searches by status, customer, recipient email, order/quote number, sales rep, date range, and email type.
- Resend creates a new linked attempt and leaves the original failed attempt unchanged.

## Acceptance Criteria
- Sending a standard quote email shows a visible sent or failed result in the app.
- Sending a standard invoice/order email shows a visible sent or failed result in the app.
- Sending a custom composed sales document email shows a visible sent or failed result in the app.
- Email attempts are persisted and visible after refresh or browser changes.
- A sales rep can see their own or attached sales email attempts.
- Super Admin can see all sales email attempts.
- Super Admin can resend a retryable failed email from the Email page.
- Failed/skipped attempts show readable failure reasons.
- Resends are tracked as new attempts linked to the original attempt.
- The Email page supports operational filtering/searching and pagination.

## Out Of Scope
- WhatsApp and SMS delivery, which is tracked separately.
- Customer reply inbox handling.
- Open/click analytics, read receipts, and engagement scoring.
- Broad historical backfill from Resend.
- Switching email providers.
- Major redesign of existing sales email templates.

## Brain Update Requirements
- Update `brain/database/schema.md`, `brain/database/relationships.md`, and `brain/database/migrations.md` for the delivery ledger schema.
- Update `brain/api/endpoints.md`, `brain/api/contracts.md`, and `brain/api/permissions.md` for list/detail/resend APIs and permission scoping.
- Update `brain/features/sales-pdf-system.md` or create a dedicated sales email feature doc when delivery behavior changes.
- Update `brain/features/background-task-monitor.md` if task monitor behavior changes.
- Update this plan, `brain/tasks/roadmap.md`, `brain/tasks/in-progress.md`, `brain/tasks/done.md`, and `brain/progress.md` as execution state changes.

## Lower-Agent Readiness
- Implementation scope is clear: Yes
- File boundaries are clear: Mostly; schema/API/UI boundaries are clear, exact model names can be chosen during implementation.
- Acceptance criteria are observable: Yes
- Required checks are listed: Yes
- Brain update requirements are listed: Yes
- Ready for handoff: Yes

## Completion Report Requirements
Lower agent must report:
- Changed files
- Checks run
- Brain docs updated
- Whether provider-status semantics mean provider-accepted only or include webhook delivery events
- Any skipped acceptance criteria
- Any remaining resend limitations

## Implementation Report
- Added the `SalesEmailAttempt` ledger schema and `SalesEmailAttemptStatus` enum, including sender/sales-rep/user relations and linked resend attempts through `originalAttemptId`.
- Added sales email attempt list/resend API routes under `emails.salesEmailAttempts` and `emails.resendSalesEmailAttempt`.
- Added `/sales-book/emails` with search, status filtering, pagination, scoped sales-rep visibility, Super Admin all-access visibility, and Super Admin resend controls for retryable failures/skips.
- Updated the notification email service and sales document notification handlers so provider accepted/failed/skipped results are captured per recipient and persisted to the ledger.
- Updated the sales send task to record skipped rows for missing send context and to return attempt ids.
- Updated the task monitor path so sales document email tasks report provider failure/skipped output visibly instead of treating Trigger task completion alone as success.
- Provider-status semantics are immediate provider acceptance/failure/skipped results; webhook delivery events, open/click/read analytics, and historical Resend backfill remain out of scope.
- Resend v1 is Super Admin-only and creates a linked child attempt instead of mutating the original failed/skipped row.
- Database migration/application is still required in the target environment before persisted ledger writes can run outside generated-client validation.

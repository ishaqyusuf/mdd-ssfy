# Sales Email Delivery Ledger

## Purpose
Give sales reps and Super Admin in-app visibility into sales document email delivery attempts, so they do not need to check Resend manually after sending quote, invoice/order, or custom composed sales document emails.

## Current Implementation
- Prisma schema lives in `packages/db/src/schema/sales-email-attempts.prisma`.
- Delivery attempts are recorded by the notifications pipeline for:
  - `simple_sales_document_email`
  - `composed_sales_document_email`
- Standard sales email batches that cannot resolve a customer email, customer name, sales rep id, or sales rep email write `SKIPPED` attempt rows directly from the sales send task.
- The email service returns per-recipient delivery results with `SENT`, `FAILED`, or `SKIPPED` status, provider message id/status when available, and readable error text.
- The notification pipeline creates or updates `SalesEmailAttempt` rows before send, completes them from provider results, and returns `emailAttemptIds` in notification results.
- Local jobs/dev commands now resolve the development database through the shared `../../local-infra-kit` GND profile, so `bun run dev --filter jobs` uses the selected dev DB profile from the root dev router.
- Sales email attempt writes catch only Prisma missing-table errors for `SalesEmailAttempt`, log a warning, and continue the email send path so a migration-lagged environment does not block customer-facing email delivery.
- Local/dev runs can set `MOCK_EMAIL_SENDS=true` to mock email sends after rendering, recipient resolution, and notification preference filtering. Mocked sends do not call Resend, but return sent delivery results with `providerStatus: "mocked_by_environment"` so notification tasks and `SalesEmailAttempt` rows behave like provider-accepted sends. The flag is ignored in production runtimes.
- Sales document email PDF attachments are opt-in through `ATTACH_SALES_EMAIL_PDF=true`; invoice and quote emails otherwise use generated download links only. Simple invoice emails also require the payload to explicitly set `skipPdfAttachment: false` before an attachment can be built.
- Direct sales document email notification runs treat expected user-fixable validation failures, such as no eligible sale metadata or mixed recipients, as structured failed email results with readable `emails.errorMessage` output instead of throwing raw Trigger errors.

## User Experience
- Sales email background tasks now treat provider failed/skipped sales document email output as a visible failure state instead of a generic completed task.
- A sales document is eligible for direct document email only when the selected order/quote has a saved or provided customer email, customer name or business name, and sales rep email. Missing data is surfaced to the user as an email failure instead of only appearing in job logs.
- The task monitor labels simple/composed sales document notification runs as sales email tasks.
- Shared `SalesMenu` direct invoice/quote email actions keep their Trigger run watcher on the stable menu root instead of the dropdown item, so closing the dropdown does not drop follow-up success/failure feedback. This covers row actions, sales overview sheet menus, and the sales overview system More menu that reuse `SalesMenu`.
- Sales email send actions use the bottom-right task monitor as the feedback surface instead of toast notifications once a background email task is queued. If the shared `SalesMenu` already knows the customer email is missing, it shows an immediate destructive toast and does not queue the notification task or create a task monitor entry.
- Email task failures automatically open the monitor, expand the failed task row, and show the full error details; failed sales email monitor rows link to `/sales-book/emails`.
- Task monitor rows can be expanded from the compact list to inspect full run information, including run id, status, task type, entity, timestamps, and full error text.
- The sales Email page lives at `/sales-book/emails`.
- Sales reps can review attempts they sent or attempts attached to them as the sales rep.
- Super Admin can review all attempts and retry `FAILED` or `SKIPPED` attempts.

## Resend Behavior
- Resend is Super Admin-only in v1.
- Resend creates a new linked child attempt through `SalesEmailAttempt.originalAttemptId`; the original failed/skipped row remains unchanged as audit evidence.
- Retryable payload snapshots are stored in attempt metadata for simple/composed sales document email types.
- Resend queues the notification Trigger task and records queue failure as a failed child attempt when queueing itself fails.

## Boundaries
- Status is immediate provider acceptance/failure/skipped status, not webhook delivery, open, click, or read analytics.
- The ledger is for email only; WhatsApp and SMS are out of scope.
- Historical Resend backfill is out of scope.
- Provider switching is out of scope.
- Migration application is still required for any environment whose actual database is behind the Prisma schema; hosted dev was verified to already expose `SalesEmailAttempt` even though its Prisma migration history is not aligned with the configured migration folder.

## Implementation Touchpoints
- `apps/www/src/app/(sidebar)/(sales)/sales-book/emails/page.tsx`
- `apps/www/src/components/sales-email-ledger-page.tsx`
- `apps/api/src/db/queries/sales-email-attempts.ts`
- `apps/api/src/schemas/emails.ts`
- `apps/api/src/trpc/routers/emails.route.ts`
- `packages/notifications/src/index.ts`
- `packages/notifications/src/services/email-service.ts`
- `packages/jobs/src/tasks/sales/create-send-sales-email-task.ts`
- `apps/www/src/hooks/use-task-trigger.ts`
- `apps/www/src/store/task-monitor.ts`
- `apps/www/src/components/task-notification.tsx`

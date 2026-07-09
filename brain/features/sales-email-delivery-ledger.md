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

## User Experience
- Sales email background tasks now treat provider failed/skipped sales document email output as a visible failure state instead of a generic completed task.
- The task monitor labels simple/composed sales document notification runs as sales email tasks.
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
- Database migration/application is still required in the intended environment before runtime persistence works.

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

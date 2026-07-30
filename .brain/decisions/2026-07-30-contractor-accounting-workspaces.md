# ADR: Contractor accounting operational workspaces

## Status

Accepted and implemented locally.

## Context

The immutable contractor ledger established a trustworthy reporting authority,
but operators still needed actionable payables, reconciliation resolution,
period-close readiness, contractor-level context, and alerts. The existing
Payment Portal already owns payment execution, so duplicating payout creation
inside accounting would create competing financial authorities.

The workspace also needed to follow the established Sales Orders/Midday page
contract: stable URL-owned tabs in their own top block, followed by the shared
search/filter row and right-side actions.

## Decision

- Add Ledger, Payables, Review queue, and Resolution Center as URL-owned product
  tabs above the standard search/filter/report/action row.
- Project payables, FIFO aging, readiness, trends, and close gates from the
  immutable ledger and stored reconciliation evidence.
- Store payout preparation as immutable proposal snapshots with a constrained
  lifecycle. Hand ready work to Payment Portal; do not create a second payment
  mutation.
- Store reconciliation resolution as append-only events keyed by a canonical
  evidence fingerprint. Changed evidence makes a previous resolution stale.
- Repeat close-readiness checks on the server immediately before closing a
  period.
- Persist alert rules and fingerprint-deduplicated alert events. Track delivery
  per recipient so retries do not resend already successful addresses.

## Consequences

- Accounting gains operational planning and review without weakening the
  ledger or duplicating payment execution.
- Workspace state remains shareable and browser-navigation-safe.
- Old resolution evidence cannot silently suppress changed discrepancies.
- Period close cannot bypass active or stale reconciliation blockers.
- Alert evaluation is idempotent, while partial email failures remain retryable
  and inspectable.
- The additive workspace and delivery migrations must be deployed explicitly
  before these persisted controls are enabled in production.

## Verification

- Focused contractor domain and migration-parity coverage passes 22 tests and
  55 assertions.
- DB and Jobs typechecks pass; API typecheck reaches only the pre-existing
  Sentry instrumentation errors.
- Local Prisma status reports 110 migrations, and datasource-to-datamodel diff
  reports no difference.
- Authenticated in-app browser QA confirms the two-tier page shell, all four
  workspaces, management sheets, and Contractor 360 against real local data.

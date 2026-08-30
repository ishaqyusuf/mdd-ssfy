# Bug: Sales Handoff Source-Projection Backlog

## Date

2026-08-30

## Problem

Local Sales Handoff schedule history `4268` reconciled 35 of 200 candidates and
failed 165. The durable repair queue contained 6,568 missing canonical payment
projections and 569 unavailable inventory projections. Historical orders with
blank lifecycle status could also be interpreted as active and open new actions
without an explicit review.

## Root Causes

- Legacy successful `SalesPayments` rows were authoritative but many orders had
  no canonical `PaymentProjection` row.
- Legacy inventory orders had no durable projection, a stale `syncing` state, or
  deterministic mapping failures. The prior backfill treated a normally returned
  `failed` projection as success.
- Recurring reads, reconciliation, and escalation had no durable lifecycle-review
  gate for ambiguous pre-2026 blank/null order status.
- Schedule history retained only a 25-row failure sample and not aggregate failure
  categories.

## Resolution

- Added the package-owned source-repair service and local-only
  `bun run sales-handoff:source-repair` CLI. It is read-only by default and
  requires both `--apply` and `--confirm-review` for mutation.
- Reused canonical payment and inventory synchronizers, verified durable source
  evidence before resolving markers, and reclassified chained source failures
  instead of losing them.
- Added `sales_handoff_lifecycle_review` quarantine and audited release through
  existing resolution tables. Protected reads, recurring reconciliation, and
  escalation preserve existing epochs while a review is open.
- Added schedule failure-category counts, lifecycle-review skip counts, and a
  deterministic inventory-mapping manifest.

## Local Canary Evidence

- Applied 13 reviewed candidates: five paid payment candidates, five unpaid
  payment candidates, and `not_synced`, stale `syncing`, and `failed` inventory
  candidates.
- Stored `SalesOrders.amountDue` and all legacy payment row counts/totals were
  unchanged. Canonical payment projections matched successful-payment evidence.
- Inventory orders `13098` and `25412` reached durable `ready`; `13098` entered
  lifecycle review without a new handoff action. Mapping failures remained open.
- Re-running the same cohort skipped resolved markers, repaired the remaining
  deterministic-ready candidate, and retained four mapping failures. No new
  escalation was created.
- A real local 200-row schedule tick persisted 51 reconciled, 149 failed,
  `failureCategoryCounts` of 145 payment and 4 inventory, and zero lifecycle
  review skips. The 25-row sample remains bounded while aggregate categories are
  complete.

## Documentation Impact

No database schema, migration, public API contract, or permission documentation
changed. The repair CLI and lifecycle scope use existing internal resolution
models.

## Related Files

- `packages/sales/src/sales-handoff/source-repair.ts`
- `packages/sales/src/sales-handoff/repair.ts`
- `packages/sales/src/sales-handoff/service.ts`
- `packages/jobs/src/tasks/sales/sales-handoff-reconciliation-schedule.ts`
- `packages/jobs/src/tasks/sales/sales-handoff-escalation-schedule.ts`
- `scripts/sales-handoff-source-repair.ts`
- `.brain/decisions/ADR-077-sales-handoff-lifecycle-review-quarantine.md`

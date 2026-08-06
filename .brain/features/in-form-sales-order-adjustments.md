# In-Form Sales Order Adjustments

## Status

Implemented on 2026-08-04 for quantity changes to persisted items on existing
orders in the new sales form.

## Product Contract

- The employee stays in the new sales form. There is no separate internal
  adjustment workspace.
- When an order has successful payments, inventory allocation/inbound,
  production, or fulfillment evidence, the form displays a commitment warning
  before edits are saved.
- Quantity changes are compared with the immutable version loaded into the
  editor. Save, final-save, print, preview, PDF, and autosave paths cannot bypass
  the review requirement.
- The in-form Change Review sheet shows each previous/new quantity and line
  total, the previous/new order totals, amount due, projected wallet credit,
  operational commitments, and any irreversible quantity floor.
- The live sale remains unchanged while approval is pending. The employee
  creates an expiring customer approval link and shares it manually.
- Release one applies quantity changes only to existing persisted sale items.
  Adding a new line through an approved adjustment is rejected because its
  nested configuration cannot yet be recreated safely by the apply job.
- A proposed quantity may fall below completed-production or fulfilled quantity
  only after explicit employee acknowledgement. That operational evidence is
  preserved, the change finishes as `APPLIED_WITH_REVIEW`, and the sales
  representative is notified.

## Settlement Contract

- The complete proposed sales-form total is authoritative; the refund is not
  inferred from quantity delta alone.
- Existing successful payment applications reduce the revised amount due
  first. Only payment above the revised order total becomes customer-wallet
  credit.
- An increase creates additional amount due and never charges the customer
  automatically.
- A wallet outcome writes a negative sales-payment application tied to the
  source customer transaction, mirrors the canonical refund ledger, and writes
  the existing positive legacy wallet-credit transaction. The adjustment ID is
  retained as idempotency/audit evidence.
- A proposal that would create wallet credit is rejected before approval when
  the sale has no customer or no transaction-linked successful payment to
  reconcile across both payment views.

## Lifecycle And Consistency

- Adjustment states are `DRAFT`, `PENDING_CUSTOMER`, `APPROVED`, `APPLYING`,
  `APPLIED`, `APPLIED_WITH_REVIEW`, `REJECTED`, `EXPIRED`, `CANCELLED`, `STALE`,
  and `FAILED`.
- Approval tokens are random, expiring, and stored only as SHA-256 hashes.
- The apply job claims `APPROVED -> APPLYING` atomically. Retries of an already
  applied adjustment are successful no-ops; failures after the commercial
  transaction return to `APPROVED` and resume from the sale's adjustment marker
  without duplicating wallet/refund or quantity writes. A replacement worker may
  take over an `APPLYING` claim after its three-minute lease becomes stale; a
  retry that arrives before expiry schedules that delayed recovery explicitly.
  The durable adjustment commitment snapshot carries the inbound reconciliation
  checkpoint so a later form save cannot erase it and resume does not revalidate
  later-mutated demand notes.
- Both metadata-backed versions and stable legacy `updatedAt` versions are
  checked before applying. A mismatch marks the proposal `STALE` and preserves
  the live order.
- Application updates the order, line totals, wallet/refund outcome, and approved
  inbound disposition in one database transaction, synchronously repairs the
  Sales inventory projection, and only then marks the adjustment applied.
  History and document warming remain non-critical follow-up work.
- Creating a new approved adjustment also writes one actor-attributed Sales
  Activity entry in the same transaction. Quantity reductions show the affected
  item titles, previous/new quantities, and previous/new order total. Replaying
  the same idempotency key returns the existing adjustment without duplicating
  the Activity entry.
- Every successful save of an existing order or quote in the new sales form
  writes an actor-attributed Activity entry in the same transaction as the sale
  update. Manual saves and autosaves are labeled separately; quantity and total
  changes are summarized when present. Initial creation is not mislabeled as an
  update.
- Persisted legacy lines use `sales-item-<database id>` as their stable form UID
  when no UID is present in metadata.

## Implementation Map

- Domain rules: `packages/sales/src/adjustment-system/`
- Prisma schema: `packages/db/src/schema/sales.adjustment.prisma`
- API/query workflow:
  `apps/api/src/db/queries/new-sales-form-adjustments.ts`
- Guarded save integration: `apps/api/src/db/queries/new-sales-form.ts`
- Sales Activity copy and persistence:
  `apps/api/src/db/queries/sales-form-activity.ts`
- Apply job: `packages/jobs/src/tasks/sales/apply-sales-order-adjustment.ts`
- In-form review:
  `apps/dashboard/src/components/forms/new-sales-form/sections/sales-change-review-sheet.tsx`
- Public customer response:
  `apps/dashboard/src/app/(public)/sales/change-approval/[token]/page.tsx`

## Follow-Up Boundary

- Automated email/SMS delivery is not claimed; release one creates a manual
  share link and may retain a contact reference.
- Cash/card provider refunds, returns/RMAs, new-line adjustments, and automatic
  disposition of already produced or fulfilled goods need separate policies.
- The repository's older master-password migration ordering must be repaired or
  baselined before a clean shadow-database replay can validate the full history.

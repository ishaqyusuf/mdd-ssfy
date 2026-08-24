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
- Manual save intent survives the Change Review boundary. After an approved
  change is applied and the refreshed sale version is loaded, the form resumes
  the exact pending Draft, Save & Close, Save & New, or Final action. Save &
  Close then waits for any required Special Order declaration and the
  post-save inventory configurator before navigating away; cancelling any
  confirmation leaves the editor open.
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
- Inbound disposition is requested only when the same persisted line is being
  reduced and has positive unreceived demand linked to an active inbound
  shipment. Automatically projected pending demand that has not been assigned
  to a shipment is material need, not inbound activity, and never creates a
  Cancel/Keep Warehouse decision. Inbound on an increased or unrelated line,
  and completed, closed, cancelled, or fully received inbound, is also ignored.
  When no settlement or other operational decision remains, the edit follows
  the normal direct-save path and inventory sync updates the unassigned need.

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
- When an applied adjustment persists a house-package door array, that array is
  authoritative when the new sales form reopens. Legacy relational door rows may
  enrich matching rows with database identity and metadata, but may not restore
  removed sizes or overwrite approved quantities. An explicitly empty persisted
  array means all configured door rows were removed.
- The same authority applies at the shared sales print-data boundary used by
  Preview, PDF, and Print. Legacy HPT rows may enrich surviving approved rows
  with presentation metadata, but removed sizes cannot reappear in a document.
  Employee HTML Preview force-refreshes its lightweight projection so a cached
  pre-adjustment row is corrected when preview is opened.
- The legacy edit loader now applies that same approved snapshot before its DTO
  builds form rows and totals. Retained relational rows remain available for
  audit/presentation enrichment, but cannot restore an approved-removed size or
  overwrite approved quantity, price, or summary values.
- The new-form edit loader, legacy edit loaders, and print projection now call
  the same package-owned retained-door matcher for approved snapshots; their
  compatibility adapters no longer own separate approved-row matching rules.
- An order governed by an approved snapshot is read-only in the legacy editor.
  Overview, Preview, Print, and PDF remain available, while commercial controls
  and Save variants are disabled with a handoff to the new form. The legacy
  save helper independently rejects a crafted save against the current database
  marker with stable code `LEGACY_ADJUSTMENT_SAVE_BLOCKED`, so client state is
  not the integrity boundary. Access policy and the database-backed write guard
  live under the accepted `domains/sales-form/legacy/application` boundary.

## Validation

- The edit-loader regression covers an applied reduction where stale legacy
  relations still contain a removed `1-6 x 6-8` row and an obsolete `LH 1` on
  `2-6 x 6-8`. Reload keeps only the persisted rows and quantities; an explicit
  empty applied snapshot also stays empty. Unmarked ordinary snapshots retain
  the existing relational-data precedence for compatibility.
- Authenticated browser verification on order `09140DB` showed two configured
  door sizes, no `1-6 x 6-8`, `LH 0 / RH 2` for `2-6 x 6-8`, and the revised
  door-line total of `$535.00` without saving the user's second attempt.
- Authenticated browser verification on order `09187PC` reopened Sales Preview
  after its approved refund adjustment and confirmed retained `24" x 80"` is
  present while removed `30" x 80"` is absent. Focused document coverage passes
  57 tests / 190 assertions; Sales and API typechecks pass.
- Authenticated browser verification on `09187PC` confirmed old/new editor
  parity after the legacy projection fix: one retained `2-0 x 6-8` row at
  `$228.84`, subtotal `$590.13`, tax `$41.31`, CCC `$18.94`, and displayed total
  `$650.38`. The adjusted legacy editor exposed the notice and disabled all
  mutating controls; ordinary order `09166LRG` remained editable. Shared
  projector/print, access-policy, client-control contract, and server-boundary
  tests pass 25 tests / 126 assertions; the new edit-loader retained-row
  regression passes separately with 1 test / 10 assertions.
- The quantity-decision regression covers a reduced line with positive pending
  demand but no `inboundShipmentItemId`; it produces no inbound review reason
  and saves directly. A reduced line linked to an active shipment continues to
  require disposition.
- Authenticated in-app browser verification on local order `09407PC` reduced
  tracked moulding quantity from 38 to 37 while the local inbound workspace had
  no shipments. The editor showed no Review Required banner, Cancel Open
  Inbound choice, or Keep For Warehouse choice. The quantity and displayed
  total were restored without saving; no interaction runtime error appeared.

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

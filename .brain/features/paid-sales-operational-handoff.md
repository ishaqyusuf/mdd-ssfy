# Paid Sales Operational Handoff

## Status

Completed locally on 2026-08-23. Tickets 01 through 07 are implemented,
independently reviewed, and covered by authenticated browser evidence. Material
and Production Handoff Actions use canonical payment and operational evidence,
persist independent action epochs, and share the representative-scoped Sales
Orders alert and permanent Needs Action tab. Bounded repair, organization-wide
escalation, guarded production reporting, guarded packing review, and the
authenticated mobile task boundary are included. The additive migration is
applied locally with no drift; no production deployment or production data
mutation was performed.

## Bounded recurring repair (Ticket 07, 2026-08-23)

- The reusable projection/reconciliation service now belongs to
  `@gnd/sales/sales-handoff`; API callers keep a compatibility export and the
  Trigger worker imports the package directly without an API/jobs cycle.
- A serial 15-minute worker processes no more than 200 unique orders. It
  prioritizes deterministic ResolutionCase repair markers and a rotating open-
  epoch keyset, then always advances a persisted active Sales Order id cursor.
- ScheduleHistory records per-run source counts, scanned/reconciled/failed
  totals, cursor state/wraps, policy fan-out state, and bounded failures. Missing
  orders resolve open epochs; failed evidence projection writes both order/global
  repair evidence and fails visibly.
- Every committed settings revision durably opens its revision fan-out marker
  before the bounded immediate reconciliation, including the success path. The
  marker retains the original policy timestamp and resets/completes one full
  active-order cursor pass, so orders beyond the immediate 200-order cohort
  receive the same policy-change exposure milestone. Routine repair and
  priority candidates preserve the later-evidence-loss clock established by
  Ticket 04.
- A failed policy-pass candidate transfers its policy milestone, revision, and
  change time into the order's durable repair marker before the global policy
  marker may close. Repair-only retries restore that context and preserve the
  policy-time SLA; if the order marker cannot be written, the global fan-out
  remains open and restarts instead of discarding the exposure.
- Canonical payment projection absence and otherwise-empty unavailable
  inventory evidence throw a typed source-projection error instead of silently
  presenting an empty action queue.
- Unavailable inventory evidence never resolves or invents Material. When
  Production remains independently actionable, the exact service reconciles
  Production and preserves Material's last durable state. The protected read
  also returns exact Material and Production counts alongside the total.

## Super Admin escalation (Ticket 04, 2026-08-23)

- Active Super Admins see organization-wide unresolved actions grouped by the
  responsible representative; representatives remain own-scope. Oldest-first
  order is stable and the alert reveals actions six at a time.
- Every epoch stores organization, protected deep-link target, and the same-wall-
  time next-weekday due time in `America/New_York`. Rep transfer preserves that
  epoch/clock, resolution cancels unsent work, and a genuine reopen starts a new
  epoch.
- Qualification and policy timestamps backdate a first epoch only when the
  reconciling writer explicitly identifies that milestone as the action's first
  exposure. Later material or production evidence loss starts at reconciliation
  time, preventing an immediate escalation on a newly visible omission.
- A bounded serializable 15-minute schedule sends one mandatory activity-only
  notification to each active Super Admin and records per-recipient delivery and
  acknowledgement. Ordinary notification preferences cannot hide the activity;
  no external delivery channel is implemented.
- The bounded scan includes only organizations that currently have active Super
  Admin recipients, preventing unresolved fail-closed rows from starving valid
  overdue work. Notification status and acknowledgement commit atomically.
- Organization inference fails closed unless the order owns an organization or
  the responsible representative has exactly one active organization. The
  sender is the explicitly configured active system notification user.
- Notification and alert deep links open Material or the snapshotted Production
  control through the ordinary protected Sales Overview flow.
- Escalation activities store the canonical notification type in their runtime
  tags, so the notification-center parser retains the clickable protected action
  after the database tag serialization round trip.
- The permanent Needs Action table uses the same actor-derived epoch relation as
  its unique-order badge. It does not inherit the legacy current-user rep filter;
  an explicit representative filter remains supported.

## Production Handoff Actions (Ticket 03, 2026-08-23)

- The package-owned Production projection starts from current nondeleted
  `SalesItemControl.produceable` controls and their required `qty` control. It
  covers quantity only with a current active owned assignment, a completed
  owned assignment, or an attributable finalized production submission. The
  existing production-submission review policy remains the finalization
  authority; pending, rejected, cancelled, and deleted evidence does not cover.
- Assignment rows aggregate across workers and are deduplicated by stable
  assignment id. Each assignment contributes the greater of its owned quantity
  or finalized submitted quantity, and item coverage is capped at required
  quantity so the same assignment/submission cannot count twice. Partial and
  active unowned quantities remain actionable.
- Current control/item identity excludes stale, unrelated, superseded, and
  deleted work. Legacy rows without `salesItemControlUid` are admitted only
  through an unambiguous current item, door, or shelf identity; ambiguous rows
  remain uncovered rather than guessing ownership.
- Material applicability, inbound, allocation, and receipt state are absent
  from the Production predicate. Payment qualification and active order
  lifecycle remain required.
- `PRODUCTION` reuses the generic `SalesHandoffActionEpoch` ledger with its own
  `PRODUCTION:<salesOrderId>` open identity. Material and Production can open,
  resolve, and genuinely reopen independently. The current order revision and
  production evidence are included in the stable evidence revision; unchanged
  completed work does not reopen after an unrelated revision.
- The protected read still clamps to 50 output actions, 200 recent candidates,
  and 200 oldest open epochs. It skips transaction work for non-actionable
  action types that have no open epoch and reconciles the relevant Material and
  Production types together per order.
- Sales Orders renders restrained sky Production pills beside amber Material
  pills inside the same semantic list. A Production pill opens canonical Sales
  Overview state with `salesTab=production`, the exact `prod-item-view`, and
  `prod-item-tab=assignments`; existing overview authorization and focus return
  remain authoritative. The payload grants no assignment mutation capability
  and never auto-assigns a worker.
- `sales.production.changed` invalidates the handoff read for assignment and
  submission clients, and finalized production-review mutations now join that
  same targeted invalidation family.

## Material Handoff Actions (Ticket 02, 2026-08-23)

- The server projection combines Ticket 01 payment qualification with the
  canonical inventory applicability state and tracked component demand. It
  subtracts allocation/receipt fulfillment and only counts active inbound
  coverage linked through `InboundDemand`; prompt-only `ORDERED`, unrelated,
  deleted, cancelled, completed, and closed inbound evidence never covers an
  action. Supplier-less inbound is valid only through that demand ownership.
- `SalesHandoffActionEpoch` persists independent `MATERIAL` open/resolve/reopen
  epochs with responsible representative, policy/evidence revisions,
  uncovered quantity, qualification/open/resolution/reconciliation timestamps,
  and authenticated audit identities. Serializable retry plus nullable unique
  `openKey` makes concurrent opening idempotent.
- Protected `sales.getSalesHandoffActions` derives representative scope only
  from the authenticated session, clamps the response to 50, reconciles a
  bounded candidate set, and returns stable oldest-first actions. New-open
  discovery prioritizes the 200 most recently updated active orders so large
  fulfilled histories cannot starve current work; the oldest 200 open epochs
  are loaded independently so old actions can still resolve. Caller input has
  no representative selector.
- Sales Orders renders the independent shadcn alert immediately before the
  table but deliberately excludes its non-Suspense query from server batch
  prefetch. Server markup and first hydration therefore share the compact
  skeleton while the client independently resolves alert/error/empty state,
  without delaying table or summary prefetch. It reveals wrapping native-button
  action pills six at a time, retains explicit Retry, and restores focus after
  the canonical Sales Overview deep link closes. If reconciliation removes the
  invoking pill while Overview is open, focus returns to a stable alert anchor.
- A Material deep link opens the existing Inventory Needs `stock` segment with
  Create inbound expanded. Its `inventoryCreateInbound=true` URL state remains
  while the pane is mounted, survives copied-link reload, and clears on pane or
  outer-overview close. Existing protected inventory procedures remain the only
  write path; the alert creates no purchasing, receipt, allocation, fulfillment,
  or inventory evidence.
- `reconcileMaterialSalesHandoffOrder` now loads and projects one exact Sales
  order and both independent action types. It never delegates correctness to
  the actor-scoped 200-row alert read. Deleted, cancelled, terminal,
  unassigned, or transferred orders close their prior epoch; a transfer opens
  a new representative-owned epoch only when the exact projection remains
  actionable.
- Canonical allocation timelines normalize type and sign together: `payment`
  contributes a positive magnitude while `refund`, `void`, and the negative
  `square_refund` representation contribute a negative magnitude. Falling
  below policy closes the epoch and a later threshold crossing receives a new
  `qualifiedAt` and action epoch. All settlement allocations sharing the
  database's second-resolution timestamp are applied as one deterministic
  bucket, so CUID ordering cannot fabricate an intra-second SLA transition.
- API-owned settings, representative transfer, wallet/refund, finance repair,
  inbound create/status, lifecycle delete/restore, and finalized production
  review writes invoke exact reconciliation after commit. API payment processor
  and checkout writers and current Dashboard production assignment/submission
  writers use the same exact seam. Reconciliation failure never rejects an
  already-committed authoritative mutation: one deterministic open
  `ResolutionCase` repair marker is upserted per order. Completed Square-refund
  workers record the same marker, and settings fan-out failure records a
  revision-scoped marker. Client query events remain freshness hints, not the
  correctness boundary; Ticket 07 owns bounded consumption of repair markers.

## Goal

Prevent payment-qualified Sales Orders from being operationally stranded when
the responsible sales representative has not recorded supplier-order/inbound
coverage or has not completed production assignment.

## Confirmed Product Direction

- A global, Super-Admin-managed Sales Handoff Trigger supports Fully paid, Any
  payment received, and Payment percentage reached. Fully paid is the default.
- Sales Orders shows a shadcn `Paid sales need action` alert immediately before
  the table.
- Clickable `#ORDERID — Material` and `#ORDERID — Production` pills open the
  matching Sales Overview operational surface.
- Sales representatives see their own orders. Super Admin sees all unresolved
  actions and the responsible representative.
- Material means supplier-order/inbound coverage is missing, not merely that
  represented material has not arrived.
- Production means production-capable quantity lacks active owned assignment;
  material readiness is independent.
- Order entry remains available. Automatic inbound creation before a real
  supplier order is explicitly excluded.
- Genuine production and packing work may be reported into protected pending
  review, but no downstream finalization occurs until canonical evidence is
  resolved.
- The sales representative is primary owner. Super Admin receives an in-app
  escalation after one business day; first release excludes email.

## Planning Artifacts

- Map: [`Paid Sales Operational Handoff`](../../.scratch/paid-sales-operational-handoff/map.md)
- Approved comments: all seven Wayfinder tickets contain the user's approved
  proposed answer; synthesis did not close or change the status of any ticket.
- Specification: [`Paid Sales Operational Handoff`](../../.scratch/paid-sales-operational-handoff/spec.md)
  is published as `ready-for-agent`.
- Implementation tickets:
  [`Paid Sales Operational Handoff Implementation`](../../.scratch/paid-sales-operational-handoff-implementation/issues/)
  contains seven approved tracer-bullet slices.
- Initial frontier: Ticket 01, Configure the Sales Handoff Trigger, and Ticket
  05, Restore Guarded Production-Only Reporting, can start independently.
- The local Wayfinder tickets remain the decision history and can be closed by
  the normal Wayfinder workflow; they are not implementation tasks.

## Existing Boundaries To Reconcile

- ADR-035 permits production assignment before material readiness.
- ADR-039 records unresolved admin/supervisor production submissions under
  material review and excludes pending quantity from downstream effects.
- ADR-062 currently blocks production-only worker submissions when configured
  material is unavailable.
- Packing currently rejects production quantity awaiting material review.
- Inbound creation must continue to represent real purchasing/receiving work
  through canonical inventory services.

## Guarded Packing Reports (Ticket 06, 2026-08-23)

- Packing reports are a separate review lifecycle from production material
  review and canonical `OrderItemDelivery` packing rows.
- An authenticated packing-role actor or the assigned dispatch actor may record
  only positive quantity remaining on an exact pending production submission.
  Caller-supplied actor identity is not part of the API contract.
- A pending report retains its evidence revision and exact scalar or LH/RH
  quantity plus its exact canonical `OrderItemDelivery` allocation identity,
  but blocks normal packing, inventory readiness/picking, trip start,
  dispatch completion, and fulfillment until a role-scoped reviewer decides it.
- Approval re-reads the current dispatch, inventory manifest, production review,
  canonical packing, and remaining quantity inside the decision transaction.
  Only an unchanged pending upstream state may enter the canonical packing
  action through the exact approved report. Rejection changes no packing,
  inventory, or production fact.
- Genuine physical shortages remain Dispatch Exceptions. The guarded UI labels
  pending physical evidence separately from finalized Packed Quantity.
- Guarded packing does not have a separate entry section. The ordinary Pack
  Items form checks exact scalar or LH/RH availability when submitted. If the
  unavailable remainder belongs to an eligible pending upstream submission, a
  confirmation lists that guarded quantity and requires an explicit `Proceed`.
  Canonically available quantity is packed first, then the client reloads the
  evidence revision before submitting each guarded remainder. Quantity beyond
  both canonical and guarded availability is rejected and remains a Dispatch
  Exception.
- Pending guarded quantity and role-scoped approve/reject actions render inline
  on the affected item in the same packing list. Pending quantity remains
  visually distinct and does not enter Packed Quantity until approval.
- Dispatch deletion and duplicate cleanup fail closed under the same ordered
  dispatch lock while a packing report is pending, so deletion cannot race a
  report submission or strand an unresolved review outside the active UI. The
  daily duplicate sweeper applies the same serializable hold per sales group;
  a held group is recorded and skipped without preventing later safe groups
  from being cleaned.
- Clearing a dispatch's packing rows and removing one packed item use that same
  dispatch lock and pending-report hold. Scope is re-read after the lock, the
  unpack plus derived-sales reset is one serializable transaction, and
  clear-all retains legacy unscoped packing rows while limiting dispatch-owned
  rows to locked active dispatches.
- The ordinary Sales Overview exposes Packing beside Dispatch and opens Pack
  Items in the canonical secondary pane without replacing the existing sheet
  URL mode. Assignment-only packers can submit but cannot see reviewer actions.

## Ticket 06 API/job boundary hardening (2026-08-23)

- Packing and dispatch mutations reached through the mobile Trigger bridge are
  authenticated and reauthorized at both the API and durable job boundary.
  Server identity replaces forged author metadata, and exact persisted
  sale/dispatch ownership is mandatory before packing or lifecycle writes.
- Single-item unpack records the authenticated actor in `unpackedBy`; cross-sale
  packing cannot replace rows from another order.
- The former generic client notification bridge is closed. The five mobile-used
  operational channels continue through a dedicated route with persisted job or
  dispatch authorization and server-derived scope and recipients.

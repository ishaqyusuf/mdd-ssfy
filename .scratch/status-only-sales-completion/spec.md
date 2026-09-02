# Status-only sales completion — acceptance criteria

## GND compatibility decision

This document preserves the product owner's approved Q1–Q15 intent and applies
the approved 2026-09-01 GND compatibility decision:

- Canonical **Fulfilled** still requires accepted delivery proof plus committed
  inventory/dispatch completion. Status-only Fulfillment creates a separately
  labelled Administrative Completion and never supplies that evidence.
- A dedicated, non-aggregate `SalesCompletionRecord` owns completion provenance.
  `SalesStat` remains a recomputed progress aggregate with one row per
  `(salesId, type)` and must not be written as a completion override.
- `status_only_sales_completion` is the canonical resource identifier. The
  persisted permission rows are `view status only sales completion` and `edit
  status only sales completion`, preserving `viewStatusOnlySalesCompletion` and
  `editStatusOnlySalesCompletion` at runtime.

The compatibility decision changes only the GND representation necessary to
protect existing evidence authorities. This specification is decision-complete;
implementation still requires a separate handoff.

## 1. Outcome

The sales-order completion confirmation supports two deliberate paths:

1. **Complete full workflow** performs the existing stage-wise process and all applicable operational effects.
2. **Update status only** declares that the selected real-world milestone already occurred but its intermediate workflow records are missing.

The feature applies to both **Production Completion** and **Fulfillment**. It must provide a safe way to close historical orders without pretending that missing assignments, production work, fulfillment work, inventory operations, or other workflow effects were performed by the current system.

The current release supports one order or a bounded selection of up to 100
orders. Bulk cancellation remains excluded.

## 2. Canonical concepts

- A `SalesCompletionRecord` is the durable, non-aggregate record of one
  completion milestone and its provenance.
- The milestone is either `PRODUCTION_COMPLETED` or
  `FULFILLMENT_COMPLETED`. `FULFILLMENT_COMPLETED` deliberately does not assert
  canonical `Fulfilled`.
- The `completion_method` is either `STATUS_ONLY` or `FULL_WORKFLOW`.
- The record state is `ACTIVE` or `CANCELLED`.
- `STATUS_ONLY` is an administrative declaration that the milestone actually occurred outside the recorded workflow. It is not a generic forced closure for uncertain work.
- `FULL_WORKFLOW` means every applicable operational stage and business effect is processed through the existing workflow.
- **Administrative Completion** is the order-level completion effect of an
  active Status-only record. It may satisfy completion queues and completion
  action locks but does not create or assert operational workflow facts.
- **Canonical Fulfilled** is the independent operational result defined by GND:
  accepted delivery proof plus committed inventory/dispatch completion.
- Fulfillment Completion implies Production Completion in the administrative
  completion resolver. This implication does not create a separate Production
  Completion record, `QtyControl`, production assignment, or production record.
- The approved user-facing name is **Update status only**. “Express,” “Quick completion,” and “Legacy completion” must not be used as the canonical name.

## 3. Permission contract

The canonical resource identifier is:

```text
status_only_sales_completion
```

The resource is represented as `StatusOnlySalesCompletion` in the established
permission resource lists. It must create exactly these persisted
`Permissions.name` rows:

```text
view status only sales completion
edit status only sales completion
```

The existing normalization must expose them at runtime as:

```text
viewStatusOnlySalesCompletion
editStatusOnlySalesCompletion
```

Acceptance requirements:

- `viewStatusOnlySalesCompletion` controls visibility of Status-only completion information and the Status-only choice in relevant UI surfaces.
- `editStatusOnlySalesCompletion` authorizes creating and cancelling Status-only completion records.
- Mutation authorization must be enforced by the backend; hiding a control in Angular is not sufficient.
- A single persisted `status_only_sales_completion` row is forbidden because it
  does not generate the required view/edit capabilities under the existing role
  contract.
- No role receives the new rows by inference. Super Admin retains its existing
  implicit all-permissions behavior; every other role must be granted the rows
  explicitly.
- Existing permissions continue to control Full workflow completion.
- Status-only availability is permission-based, not age-based. An authorized user may use it for any order that otherwise permits the requested state transition.
- The UI should present a stronger warning for a recent order, but age must not independently grant or deny the capability.

## 4. Confirmation modal

Selecting **Mark production completed** or **Mark fulfilled** opens a confirmation modal.

The modal presents two choices:

### Complete full workflow

- Selected by default.
- Describes that the existing stage-wise workflow and all applicable business effects will run.
- Preserves the current behavior without semantic changes.

### Update status only

- Requires deliberate selection by the user.
- Is shown only according to `viewStatusOnlySalesCompletion`.
- Can be submitted only according to `editStatusOnlySalesCompletion`.
- Uses milestone-specific wording for Production Completion or Fulfillment.
- Explains that it records the completed status without creating missing assignment, production, or operational fulfillment records.
- For Fulfillment, states that the result will be labelled **Fulfillment
  completed — status only** and will not be canonical **Fulfilled** unless the
  independent proof and operational-commit requirements are already satisfied.
- Warns that it will not perform inventory, accounting, notification, commission, or external-integration business operations.
- Explains that it is intended for work that actually happened but is absent from the current workflow history.
- Allows an optional effective completion date.
- Requires the normal confirmation action before submission.

## 5. Status-only persistence

A successful Status-only action creates an active `SalesCompletionRecord` with
at least:

```text
sales_order_id
milestone: PRODUCTION_COMPLETED | FULFILLMENT_COMPLETED
completion_method: STATUS_ONLY
state: ACTIVE
active_key: unique while active
effective_at: optional
recorded_at: required system timestamp
recorded_by_id: required authenticated actor
```

The persistence rules are:

- Production Completion creates one active `PRODUCTION_COMPLETED` record.
- Fulfillment creates one active `FULFILLMENT_COMPLETED` record. It does not
  write `SalesOrders.status = fulfilled`, `deliveredAt`, a completed dispatch,
  delivery proof, or an operational fulfillment status.
- Status-only Fulfillment does not create an artificial Production Completion
  record; the completion resolver supplies the implied administrative state.
- The implementation must enforce one active record per sales order and
  milestone with a database-backed active identity such as a unique nullable
  `active_key`. Application-only duplicate checks are insufficient.
- `SalesStat`, `QtyControl`, `SalesOrders.status`, and `SalesOrders.prodStatus`
  are not modified to represent the Status-only declaration.
- The operation must not create assignments, production records, operational fulfillment records, inventory movements, accounting entries, customer notifications, commissions, shipments, payouts, or external business workflow events.
- An audit entry must record the action, actor, milestone type, completion method, recording time, effective time when provided, and affected sales order.
- Only one active record of a given milestone may exist for a sales order.
- Repeating an already-satisfied request must be idempotent and must not create a duplicate active status.
- Completion-record creation and audit recording must succeed or fail in one
  transaction.

## 6. Full workflow persistence

- Full workflow completion retains its existing stage-wise behavior and side effects.
- New Full workflow completions write a `SalesCompletionRecord` with
  `completion_method: FULL_WORKFLOW` only after the corresponding operational
  evidence has committed. The record is provenance; it cannot substitute for
  canonical operational evidence.
- Introducing the new choice must not silently turn any existing Full workflow path into Status-only completion.
- Canonical Production Completion and Fulfilled projections continue to be
  derived from their existing operational authorities, not from the presence of
  a `FULL_WORKFLOW` record alone.

### 6.1 Bounded bulk Status-only marking

- A user may mark 1-100 selected Sales Orders as Production Completed or
  Fulfillment Completed through one Status-only request.
- Full workflow remains selected by default for a multi-order confirmation.
- The server deduplicates selected ids and applies the same optional effective
  date to every order.
- Each order uses the existing authenticated, serializable, revision-aware,
  request-idempotent mark command and commits independently with bounded
  execution. Orders are processed sequentially to prevent overlapping MySQL
  serializable range locks. The response identifies completed, replayed,
  skipped, and failed orders.
- The bulk Status-only path must not run Full workflow dependency resolution or
  enqueue its background tasks.
- Bulk cancellation is not included.

## 7. Canonical completion resolver

The backend is the single source of truth for both operational lifecycle truth
and order-level completion satisfaction. Angular pages must not independently
reconstruct either axis from raw records, numeric progress, or legacy strings.

The resolver considers active completion records only and follows these rules:

```text
canonicalFulfilled =
  accepted delivery proof exists
  AND required inventory/dispatch completion is committed

administrativeProductionCompleted =
  active STATUS_ONLY PRODUCTION_COMPLETED record exists

administrativeFulfillmentCompleted =
  active STATUS_ONLY FULFILLMENT_COMPLETED record exists

productionCompletionSatisfied =
  operational production is complete
  OR administrativeProductionCompleted
  OR canonicalFulfilled
  OR administrativeFulfillmentCompleted

fulfillmentCompletionSatisfied =
  canonicalFulfilled
  OR administrativeFulfillmentCompleted

fulfillmentDisposition =
  FULFILLED when canonicalFulfilled
  ADMINISTRATIVELY_COMPLETED when administrativeFulfillmentCompleted
  PENDING otherwise
```

Canonical operational evidence wins presentation precedence. If a Status-only
record exists and the order later independently becomes canonical Fulfilled,
the disposition is `FULFILLED`; the Status-only record remains visible in
history as provenance and is not rewritten.

Every order representation used by affected pages must expose a consistent normalized result containing, at minimum:

```text
operationalProductionCompleted
canonicalFulfilled
productionCompletionSatisfied
fulfillmentCompletionSatisfied
fulfillmentDisposition
productionCompletionSource
fulfillmentCompletionSource
productionCompletionMethod
fulfillmentMethod
productionEffectiveAt
fulfillmentEffectiveAt
productionRecordedAt
fulfillmentRecordedAt
availableActions
```

`productionCompletionSource` and `fulfillmentCompletionSource` must distinguish
`OPERATIONAL_WORKFLOW`, `STATUS_ONLY`, `IMPLIED_BY_FULFILLMENT`, and `NONE` as
applicable. When Production Completion exists only because Fulfillment
Completion implies it, the response must identify that implication rather than
claiming that a separate completion record or production record exists.

An unqualified compatibility field named `fulfilled`, if retained temporarily,
must mean `canonicalFulfilled` only. No API, filter, counter, or Angular page may
interpret a Status-only record as canonical Fulfilled. Order-level completion
consumers use `fulfillmentCompletionSatisfied` and
`fulfillmentDisposition` explicitly.

All affected database queries, API formatters, list pages, detail pages, filters, counters, and action menus must consume the same effective-state rules. Raw numeric values such as `5` or `100` must not be used as the meaning of these milestones.

## 8. Action and locking matrix

| Completion state | Production Completion | Fulfillment Completion |
|---|---|---|
| Neither milestone satisfied | Marking is available when otherwise authorized | Direct marking is available when otherwise authorized |
| Production satisfied, Fulfillment not satisfied | Marking is locked; cancellation is available when an active completion record owns the state | Marking remains available |
| Fulfillment satisfied administratively or canonically | Marking is locked | Marking is locked; cancellation is available only for an active completion record and uses its method-specific path |

Additional rules:

- A Production Completion record cannot be cancelled while an active
  Fulfillment Completion record exists.
- The user must cancel Fulfillment first.
- Fulfillment Completion implies Production Completion for order-level display,
  filtering, locking, and available-action calculation.
- Locks must be enforced by backend transition validation as well as by disabled or hidden Angular controls.
- Status-only satisfaction does not automatically lock, complete, cancel, or
  mutate operational inventory, production, packing, dispatch, proof, tax, or
  accounting workflows. Those domains continue to enforce their own evidence
  and permission authorities.

## 9. Cancellation

Cancellation preserves history; it never deletes the original
`SalesCompletionRecord`.

A cancelled status records at least:

```text
state: CANCELLED
cancelled_at
cancelled_by
cancellation_reason: optional
```

Status-only cancellation rules:

- Cancelling a Status-only completion record requires `editStatusOnlySalesCompletion`.
- It cancels only the selected active `SalesCompletionRecord`, clears its active
  identity, and records an audit entry in the same transaction.
- It must not reverse inventory, accounting, assignments, production, operational fulfillment, notifications, commissions, shipments, payouts, or integrations because the Status-only action did not create them.
- Cancelling Status-only Fulfillment returns completion satisfaction to an
  explicit active Production Completion when one exists or to independent
  operational evidence when that evidence exists.
- If neither an explicit Production Completion nor independent operational
  evidence remains, cancelling Fulfillment returns the completion resolver to
  the preceding unresolved state.
- Status-only Production Completion can be cancelled only when no active
  Fulfillment Completion record exists and canonical Fulfilled does not
  independently satisfy the milestone.
- Repeating a completed cancellation must be idempotent.

Full workflow cancellation rules:

- If the active record has `completion_method: FULL_WORKFLOW`, the existing workflow-aware cancellation process applies.
- The system must not use the Status-only cancellation path to bypass reversal or validation required by real workflow records.

## 10. Dates and history

- `recorded_at` always records when the declaration was entered into the system and cannot be supplied by the user.
- `effective_at` optionally records when the milestone happened in the real world.
- If the historical date is unknown, `effective_at` remains empty. The system must not present the recording date as though it were the real-world completion date.
- Order history displays the milestone, completion method, actor, recorded date, effective date when known, and later cancellation information.
- Status-only Fulfillment history and status badges use `Fulfillment completed —
  status only`, `Administratively completed`, or equally explicit wording. They
  must never display an unqualified `Fulfilled` state.

## 11. Reporting

- Order-level pending-production and pending-fulfillment-completion views use
  completion satisfaction, so a relevant Status-only milestone removes the
  order from the corresponding completion queue.
- Operational dispatch, inventory, packing, proof, tax-recognition, and
  exception queues continue to use canonical evidence and may still show the
  missing operational work. The Status-only action does not remove or complete
  those records.
- Workflow-performance, production-volume, fulfillment-volume, inventory-movement, and similar operational reports exclude Status-only completions by default because the underlying workflows were not performed by this action.
- Reports that intentionally include administrative declarations must distinguish `STATUS_ONLY` from `FULL_WORKFLOW`.
- Status-only entries must not inflate inventory, accounting, production throughput, shipping, commission, or notification metrics.
- Effective and recording dates remain separately queryable.

## 12. Existing-data migration

- GND currently has no dedicated `SalesStatus` rows to backfill. The new
  `SalesCompletionRecord` table starts without inferred historical records.
- Existing canonical operational lifecycle remains authoritative and normalizes
  to `FULL_WORKFLOW` provenance where the current resolver can prove the
  operational evidence. It does not require a fabricated completion row.
- `SalesStat`, `SalesOrders.status`, `SalesOrders.prodStatus`, `deliveredAt`, or
  a completed dispatch alone must not be copied into a completion record by a
  broad migration.
- `STATUS_ONLY` is reserved for records created through the new Status-only option.
- The migration must not infer Status-only completion merely because related historical records are missing.
- Any known historical exceptions require a separately reviewed and auditable migration.
- Migration verification must confirm that `SalesStat` rows and percentages are
  unchanged, no completion record was inferred from legacy progress or status
  strings, permission-row creation is idempotent, and no canonical lifecycle or
  operational projection changed solely because the new model exists.

## 13. Concurrency, errors, and auditability

- Marking and cancellation commands validate the latest order state inside their database transaction.
- Concurrent requests cannot create duplicate active completion records or produce an invalid Production Completion/Fulfillment Completion combination.
- Permission failure, invalid transition, stale state, and persistence failure return distinct errors suitable for the Angular UI.
- The UI refreshes from the backend's canonical normalized order after every successful mutation.
- Internal cache invalidation or read-model refresh may occur, but it must remain distinguishable from forbidden business workflow effects.
- Every mark and cancellation is traceable to an authenticated actor.

## 14. Required acceptance scenarios

The implementation is not complete until automated tests cover at least:

1. An authorized user marks Production Completed using Status only and creates
   only an active `PRODUCTION_COMPLETED` `SalesCompletionRecord` plus audit.
2. An authorized user marks Fulfillment completed using Status only without an
   explicit Production Completion record.
3. Status-only Fulfillment causes Production Completion satisfaction to resolve
   as implied without creating a production completion record or workflow row.
4. Full workflow remains selected by default and retains existing behavior.
5. A user without `editStatusOnlySalesCompletion` cannot submit or cancel a Status-only action, including through a direct API request.
6. A user without `viewStatusOnlySalesCompletion` is not shown the Status-only choice or provenance information governed by that permission.
7. A duplicate marking request is idempotent.
8. Cancelling Status-only Fulfillment restores an explicit active Production Completion when one exists or independent operational completion when it is proven.
9. Cancelling Status-only Fulfillment returns to the unresolved state when no explicit Production Completion exists.
10. Production Completion cancellation is rejected while Fulfillment remains active.
11. Cancelling a Status-only completion record preserves its audit history and creates no business reversal effects.
12. Cancelling a Full workflow completion record uses the existing workflow-aware cancellation path.
13. Unknown `effective_at` remains empty while `recorded_at` is populated.
14. Pending-order queries and all affected Angular pages show the same completion satisfaction and disposition.
15. Status-only completion does not create assignments, production records, operational fulfillment records, inventory/accounting movements, notifications, commissions, shipments, payouts, or external business workflow events.
16. Migration creates no inferred completion records from `SalesStat`, legacy
    status strings, or missing workflow rows and does not change canonical
    lifecycle meaning.
17. Concurrent mark or cancel requests cannot create duplicates or invalid state combinations.
18. Operational reports exclude Status-only workflow volume by default while order history still displays the administrative milestone.
19. Status-only Fulfillment sets
    `fulfillmentDisposition = ADMINISTRATIVELY_COMPLETED` and
    `canonicalFulfilled = false` when canonical proof/commit evidence is absent.
20. When canonical proof and committed inventory/dispatch later become true,
    `fulfillmentDisposition` becomes `FULFILLED` while the prior Status-only
    record remains visible in history.
21. Order-level completion queues close from Status-only satisfaction while
    operational dispatch, inventory, proof, tax, and exception projections are
    unchanged.
22. The database contains exactly the `view status only sales completion` and
    `edit status only sales completion` permission rows, and they normalize to
    the required runtime keys.
23. A single persisted `status_only_sales_completion` row does not authorize
    viewing or editing.
24. An authorized multi-order confirmation keeps Full workflow selected by
    default and exposes Update status only without requiring a single-order
    projection.
25. A bulk Status-only request is bounded to 100 unique selected orders,
    deduplicates ids, and replays idempotently without duplicate records or
    audits.
26. A missing or invalid order produces an isolated failed or skipped outcome
    while valid selected orders complete, and the path invokes no Full workflow
    dependency or background-task authority.

## 15. Explicitly excluded from this release

- Bulk cancellation of Status-only completion records.
- Automatic eligibility based solely on order age.
- Generic forced closure when real-world completion is unknown.
- Automatic inference that historical records are Status-only.
- Reimplementation or redesign of the existing Full workflow beyond integrating the method distinction and shared effective-state resolver.
- Treating Administrative Completion as delivery proof, inventory commitment,
  tax recognition, dispatch completion, or canonical Fulfilled.

## Appendix A: approved Q1–Q15 decision ledger

1. **Destination:** Produce a decision-complete engineering specification; implementation is outside the Wayfinder map.
2. **Eligible orders:** Make the capability permission-controlled for any otherwise eligible order, with stronger warnings for recent orders; do not use age as authorization.
3. **Domain meaning:** Status-only completion declares that the real-world milestone occurred but its intermediate system records are missing; it is not an uncertain forced closure.
4. **Side-effect boundary:** Create only the applicable durable completion
   record, audit information, and necessary internal state refresh; do not
   perform operational business workflow effects. In GND this record is
   `SalesCompletionRecord`.
5. **Milestone relationship:** Fulfillment implies Production Completion in effective state without creating an artificial production status or record.
6. **Completion provenance:** Persist milestone `type` separately from `completion_method`, using `STATUS_ONLY` and `FULL_WORKFLOW` methods.
7. **Access control:** Use the exact permission `status_only_sales_completion` through `viewStatusOnlySalesCompletion` and `editStatusOnlySalesCompletion` under the established role-permission standard.
8. **Completion dates:** Record `recorded_at` automatically and accept an optional `effective_at`; never invent an unknown historical date.
9. **Current scope:** Support one order or a bounded batch of up to 100 orders;
   bulk cancellation remains excluded. This supersedes the original
   single-order first-release decision.
10. **Status cancellation:** Preserve cancelled history with actor, time, and optional reason; never delete the original status or run nonexistent business reversals.
11. **Actions and locking:** Follow the approved effective-state matrix, keep Fulfillment available after Production Completion, lock both marking actions after Fulfillment, and require Fulfillment cancellation before Production Completion cancellation.
12. **Query consistency:** Use one canonical backend resolver and make all affected Angular pages consume its normalized state and actions.
13. **Confirmation modal:** Keep Full workflow selected by default; require deliberate selection of Update status only and show milestone-specific skipped-effect guidance.
14. **Reporting:** Use effective state for pending queues, exclude Status-only entries from workflow-volume reporting by default, and retain full order-history visibility.
15. **Existing-data migration:** Backfill existing applicable statuses as `FULL_WORKFLOW`; reserve `STATUS_ONLY` for the new path and handle known historical exceptions separately.

## Appendix B: GND compatibility interpretation

The Q1–Q15 phrase “effective state” means **completion satisfaction** in GND,
not permission to rewrite operational evidence. The approved product behavior
therefore uses two explicit axes:

| Axis | Authority | Status-only effect |
|---|---|---|
| Canonical operational lifecycle | Production workflow, delivery proof, committed inventory/dispatch, and their existing domain resolvers | None |
| Order-level completion satisfaction | Canonical operational lifecycle plus active `SalesCompletionRecord` declarations | May satisfy Production Completion or Fulfillment Completion with explicit Status-only provenance |

The Q15 migration instruction applies only to existing dedicated completion
records. GND has no such records today, so there is no broad historical
`FULL_WORKFLOW` backfill. Existing operational evidence continues to resolve as
Full workflow provenance without fabricating rows; separately reviewed
evidence-based migrations remain possible for named exceptions.

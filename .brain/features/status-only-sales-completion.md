# Status-only Sales Completion

## Status

Done. Tickets 03-06 are approved and landed, and Ticket 07 passed final Brain
review. All 23 acceptance scenarios, affected package health, local migration
safety, authenticated Production/Fulfillment runtime behavior, permission
boundaries, cancellation auditability, queue/reporting parity, and operational
non-effects have direct release evidence.

## Outcome

An authorized user may choose **Update status only** for one Sales Order or a
selection of up to 100 Sales Orders at Production Completion or Fulfillment
Completion when the real-world milestone happened but the intermediate GND
workflow history is absent. Full workflow remains selected by default and
retains all current side effects.

## GND Authority Boundary

- Status-only Production Completion and Fulfillment Completion are
  Administrative Completions stored in a planned `SalesCompletionRecord`.
- Status-only Fulfillment satisfies order-level completion but does not produce
  canonical Fulfilled. Canonical Fulfilled still requires accepted delivery
  proof plus committed inventory/dispatch completion.
- `SalesStat` remains recomputed `QtyControl` progress and receives no override.
- Operational inventory, dispatch, packing, proof, tax, accounting, and volume
  projections remain unchanged by a Status-only action.

## Permission Contract

- Resource identifier: `status_only_sales_completion`
- Resource name: `StatusOnlySalesCompletion`
- Persisted rows: `view status only sales completion` and `edit status only
  sales completion`
- Runtime capabilities: `viewStatusOnlySalesCompletion` and
  `editStatusOnlySalesCompletion`

View controls presentation and provenance visibility. Edit controls mark and
cancel mutations and are rechecked by the backend. Existing Full workflow
permissions remain unchanged.

## Canonical Artifacts

- `.scratch/status-only-sales-completion/map.md`
- `.scratch/status-only-sales-completion/spec.md`
- `.scratch/status-only-sales-completion/issues/02-reconcile-gnd-lifecycle-and-sales-stat-authority.md`
- `.brain/plans/2026-09-01-feature-status-only-sales-completion.md`
- `.brain/decisions/ADR-081-administrative-sales-completion-authority.md`

## Scope Boundary

The status-only mark action supports bounded bulk selection. It does not infer
uncertain historical work, fabricate operational evidence, bulk-cancel records,
or redesign the existing Full workflow.

## Implemented: Bounded Bulk Status-only Completion

- The existing Sales batch confirmation now exposes **Update status only** for
  authorized multi-order selections while keeping **Full workflow** selected by
  default.
- Production and Fulfillment each use one protected bulk mutation for 1-100
  selected orders. The server deduplicates ids and executes the existing
  revision-aware, serializable, audited single-order command sequentially to
  avoid MySQL serializable range-lock conflicts.
- Each order commits independently and returns `completed`, `replayed`,
  `skipped`, or `failed`; one invalid or missing order does not roll back valid
  selections. A shared optional effective date is applied to the batch.
- The quick path bypasses dependency preparation and background Full workflow
  jobs. It writes only the completion ledger and Sales History, then refreshes
  list/count projections so satisfied orders leave completion queues.
- Production queue list and summary queries always add the shared pending
  Production-completion predicate for completion-queue tabs. Due, invoice,
  assignment, material, and sort filters compose with that predicate; Past Due
  and Due Today default to earliest due date. The Completed tab uses the shared
  completed predicate so administrative completions remain discoverable, while
  operational Reviews stays evidence-driven and retains unresolved review work.
- Summary totals remain database-side counts. Production rows project the
  canonical filter result as `productionCompletionSatisfied`, and nested
  assignment constraints are preserved when eligibility and completion
  predicates are composed, keeping list presentation, selection, and counts on
  the same authority. Resolved Completed queries are idempotent across the page
  prefetch and API boundary, so Status-only records remain visible in the
  Completed table.

## Delivered: Status-only Production Completion

- `SalesCompletionRecord` now persists Production administrative completion
  provenance, optional effective time, automatic recording time, authenticated
  actor, cancellation provenance, and one active record per order/milestone.
- The shared projection exposes operational Production truth separately from
  completion satisfaction, source, method, dates, history, and server-owned
  action locks. Canonical Fulfilled remains operational evidence only.
- Protected mark/cancel commands use serializable transactions, request
  idempotency, revision checks, database uniqueness, and same-transaction Sales
  History audit events. They write no operational workflow model.
- The Sales confirmation defaults to Full workflow. The Status-only choice is
  view-permission gated for single or bounded bulk selection, requires edit
  permission to submit,
  warns about skipped effects and recent orders, and preserves method-aware
  cancellation history.
- Status-only Fulfillment is deliberately not exposed or writable in Ticket 03.

## Implemented: Status-only Fulfillment Completion

- A single-order Fulfillment confirmation retains Full workflow as the default
  and adds the exact-permission Status-only path. The administrative warning
  explicitly names delivery proof, inventory commitment, dispatch, shipment,
  tax, accounting, notifications, commission, payout, and integrations as
  skipped effects.
- Status-only Fulfillment writes only an audited `FULFILLMENT_COMPLETED`
  completion record. It yields `ADMINISTRATIVELY_COMPLETED`, implies Production
  satisfaction without manufacturing a Production record, and never changes
  proof-bound `canonicalFulfilled`.
- Independent canonical evidence wins Fulfillment disposition presentation
  while administrative history remains visible. Cancellation preserves the
  record and restores explicit Status-only Production, independent operational
  Production, or unresolved state according to the surviving evidence.
- Mark/cancel use the same serializable, revision-aware, request-idempotent
  command boundary as Production. Full-workflow provenance is rejected by the
  Status-only cancellation command.
- Ticket 04 adds no schema or migration; it reuses the Ticket 03 ledger and
  exact view/edit permission rows.

## Implemented: Full-workflow Provenance And Cancellation

- New Production and Fulfillment operational completions record
  `FULL_WORKFLOW` provenance only after the corresponding canonical evidence
  has committed. The provenance record remains non-authoritative and cannot
  manufacture Production or Fulfillment truth.
- Production submission finalization and material-review approval both attempt
  evidence-gated provenance after their operational transaction. Dispatch
  completion preserves its request-bound proof metadata, then records
  Fulfillment provenance with an independent globally unique ledger identity.
- Retries and active-record races replay the one active milestone record.
  Existing active Status-only provenance is retained rather than rewritten when
  canonical evidence later appears.
- Existing workflow-aware reversal now cancels an active Full-workflow record
  and writes its audit inside the same reversal transaction. Status-only
  cancellation continues to reject Full provenance, and workflow cancellation
  never cancels a Status-only declaration.
- Existing operational orders continue to normalize as Full workflow directly
  from canonical evidence without fabricated historical ledger rows.

## Implemented: Completion Projection, Queue, And Reporting Parity

- Sales list, detail, and persisted list read models now consume the shared
  completion resolver. Their payloads retain operational lifecycle state while
  exposing completion satisfaction, disposition, source, method, separate
  effective/recorded dates, available actions, active records, and history.
- Production and Fulfillment completion labels distinguish `Completed — status
  only`, Fulfillment-implied Production, and `Administratively completed` from
  canonical workflow completion. Unknown effective dates remain null.
- The list projection contract is version 3. Its source revision and warm-task
  identity include the newest completion-record update, so administrative mark
  or cancellation cannot leave a current-looking stale row.
- Explicit `completion.production` and `completion.fulfillment` filters use the
  same shared satisfaction predicate for list, summary, and count queries.
  Existing Production, dispatch, packing, inventory, proof, tax, and exception
  filters retain operational semantics.
- Completion reporting defaults to operational Full-workflow evidence only.
  Intentional administrative scope may include Status-only rows and keeps
  source, method, effective date, and recorded date as separate fields so
  Fulfillment-implied Production is never presented as its own declaration.

## Release Verification

- The focused 13-file release suite passes 134 tests / 702 assertions and maps
  directly to all 23 approved scenarios.
- Affected Sales, DB, and Utils typechecks pass. The exact permission test also
  passes scoped Biome, 3 tests / 9 assertions, and typecheck after correcting
  its local `bun:test` declaration usage without weakening the assertion.
- Authenticated local browser/runtime proof marked and inspected one Production
  and one Fulfillment Status-only declaration. Full workflow remained the
  default, warnings named skipped effects, provenance remained visible, and
  operational rows stayed `Awaiting production` / `Ready to fulfill`. Exact
  cleanup cancellations preserved audit history and performed no operational
  reversal.
- Local Prisma generation, migrate, and push passed against fingerprint
  `mysql://127.0.0.1:3307/gnd-prisma2#identity=4813494d`; no hosted database was
  targeted.
- Repository-wide failures were run and isolated as unrelated baselines. Full
  command evidence and the scenario matrix live in
  `.brain/reports/2026-09-01-status-only-sales-completion-release-verification.md`.

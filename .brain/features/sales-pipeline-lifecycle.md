# Canonical Sales Pipeline Lifecycle

## Purpose

`@gnd/sales` owns one versioned Sales Pipeline Snapshot for lifecycle meaning
across Sales Orders, Sales Overview, Production, Fulfillment, Dispatch, worker,
driver, mobile, dealership, storefront, customer, jobs, documents, reports,
notifications, saved tabs, and exports.

The snapshot composes domain-owned evidence. It does not replace the systems
that own payments, inventory, Production assignments/submissions, packing, or
Dispatch proof.

## Contract

- Contract version: `sales-pipeline/v2`.
- Evidence adapter: `getSalesPipelineSnapshots` in
  `packages/sales/src/sales-pipeline-order.ts`.
- Resolver and exact membership/filter predicates:
  `packages/sales/src/sales-pipeline.ts`.
- Command decision boundary:
  `packages/sales/src/sales-pipeline-commands.ts`.
- Rollout and cohort gates:
  `packages/sales/src/sales-pipeline-rollout.ts`.
- Reconciliation classifier:
  `packages/sales/src/sales-pipeline-reconciliation.ts`.

Every snapshot carries its evidence revision, freshness, headline, explicit
commercial/payment/material/Production/Fulfillment/packing/Dispatch dimensions,
applicability, blockers, conflicts, provenance, and server-owned capabilities.

## Evidence precedence and invariants

- Operational facts outrank legacy strings and derived aggregates.
- Administrative Completion is explicit provenance; it never fabricates
  assignments, submissions, inventory movement, packing, Dispatch, or proof.
- Production is complete only when required quantity is complete and no active
  assignment remains open. A completed submission aggregate cannot hide a
  separate scheduled assignment.
- Fulfilled requires item-bearing Dispatch completion proof and committed
  inventory for every required split. Empty Dispatches never prove completion.
- `not_required`, `unknown`, and `conflict` applicability are distinct. A
  non-production order is excluded from Production membership; contradictory
  operational evidence is routed to review.
- Archive/delete visibility is independent from lifecycle state.
- List, count, summary, Calendar, saved-tab, filter, and export adapters use the
  same canonical predicate at their final membership seam. Sales Orders
  lifecycle filters reduce through indexed, versioned projection columns plus
  operational schedule relations; only the Fulfillment late-date case needs
  bounded fresh-snapshot refinement.

## Production behavior

Due Today, Past Due, Future, Unscheduled, Calendar, and their counts use active
assignment evidence with one submission-aware open predicate. Past Due defaults
to earliest due date and displays the same controlling oldest missed assignment.
The Completed tab uses canonical order-level Production completion for both
membership and the rendered status. Worker-completed assignment history remains
worker scoped and does not redefine whole-order completion.

## Fulfillment behavior

Fulfillment membership and presentation use canonical packing/Dispatch evidence.
Partial and split work remains non-terminal. Quick and batch status operations
return structured success, replay, skip, review-required, and failure outcomes.

## Confirmed admin calendar schedule moves

Ticket 16 extends the canonical command boundary to schedule-date changes in
the existing Production and Fulfillment semantic DOM calendars. Authorized
admins may propose a date by drag or an accessible non-drag action, then must
confirm the exact order/customer, old date, new date, and affected-record count
before a write occurs.

Production moves only the exact active assignment group for one order and
source business date. A group with any completed assignment is locked, other
dates and the Sales Order planning default are untouched, and worker calendars
remain read-only. Fulfillment moves the canonical `OrderDelivery` due date only
before trip start; in-transit, fulfilled, cancelled, deleted, and stale work is
locked. Both domains preserve quantities, assignments, submissions, inventory,
packing, driver assignment, lifecycle state, proof, delivery timestamps,
payment, and accounting evidence.

The UI reuses installed `@dnd-kit/core` and GND dialog primitives rather than
Chart.js or a replacement calendar library. Production, linked Fulfillment V2,
and legacy Fulfillment calendars share package-owned capability/lock reasons,
canonical commands, date-only semantics, audit/notification behavior, and the
deduplicated `sales.pipeline.changed` invalidation path.

## Lifecycle exception actions and headline filter

Ticket 15 keeps one visible Production-completed action and one visible
Fulfilled action. Canonical lifecycle state selects the ordinary workflow or,
when the headline is `unknown` (Status unavailable) or `conflict` (Lifecycle
conflict), the audited exception path. Exceptions require reason,
expected revision, idempotency identity, and immutable provenance, and cannot
fabricate Production, inventory, packing, Dispatch, delivery-proof, payment, or
accounting facts. A successful override makes **Administratively completed** the
visible lifecycle result while retaining the original conflict evidence in the
before/after audit payload.

The command authority binds each override to its exceptional stage and an
explicit stage-specific reason-code allowlist. Any unsupported same-stage or
cross-stage blocking conflict fails closed. Single requests bind the complete
payload to their immutable audit; batch requests additionally persist a
race-safe SalesHistory command identity covering normalized selected IDs,
milestone, effective date, trimmed reason, and the exact one-to-one expected
revision map. Completion writes refresh the indexed list projection in the same
transaction, so successful actions cannot leave headline filters stale.

The quick-action menu does not expose a separate administrative action group;
**Administrative override** is immutable audit provenance only. The same ticket
also restores the canonical completed/green status presentation for completed
orders in Production Calendar.

The same ticket adds one package-owned, multi-select Lifecycle Status filter
over every canonical `pipelineHeadline` value. Its stable URL codes and exact
predicate must be shared by rows, count, summary, pagination, saved views,
analytics, and exports through the indexed projection/freshness boundary.

## Rollout and reconciliation

Local/development reads and commands default to canonical. Production defaults
to shadow until the explicit environment controls and cutover gates approve a
bounded cohort. Rollback changes serving/enforcement mode; it never undoes valid
domain facts.

`bun run sales-pipeline:audit` is read-only. `bun run
sales-pipeline:reconcile --dry-run` classifies clean, deterministic repair,
known compatibility difference, review-required, and unsafe rows. Apply mode
requires actor and reason and may repair only the recomputable
`SalesOrderListProjection` cache in bounded, revision-checked batches.

## Current local verification (2026-09-03)

- Due Today list/summary/Calendar agree on 3 orders: `09502PC`, `09543PC`, and
  `09457DB`.
- Past Due reports 196 and renders oldest-first.
- Completed reports 1,832 and visible rows render canonical `COMPLETED`.
- Reconciliation reports 0 deterministic repairs and 0 unsafe rows after the
  version-2 projection pass; 629 known compatibility differences and 1,316
  review-required historical records remain non-mutating review queues.

### Exact item material status

- `@gnd/sales/item-material-status` owns the versioned
  `item-material-status/v1` projection. It keeps material applicability,
  readiness, review state, quantities, blockers, provenance, and evidence
  revision independent from the order-level Production and Fulfillment stages.
- The safety precedence is Material conflict, Status unknown, Setup needed,
  Material shortage, Awaiting inbound, Allocation approval, Ready/review
  pending, Material ready, then Not required.
- Repeated HPT door items are scoped by the selected inventory variant UID
  derived from the exact normalized dimension. A `2-0 x 6-8` door cannot consume
  the inbound evidence for its `2-4 x 6-8` sibling merely because both share a
  parent sales item.
- Open inbound rows with the same status, supplier, and expected date are
  grouped into one exact-item line and capped by the item's authoritative open
  inbound quantity. `MATERIAL READY` displays the tag alone; non-ready material
  may disclose only its permitted flat evidence line.
- Production item titles and their former subtitle values share one uppercase,
  bullet-separated headline in Sales Overview and worker views. The row keeps
  checkbox/actions top-aligned and reserves the same horizontal border width in
  collapsed and expanded states so opening detail does not alter wrapping.

### Material-review convergence

- One package-owned actionability predicate controls active review list, count,
  detail, notifications, saved views, deep links, and order-scoped results.
- Local reconciliation preserved review history while removing 138
  empty/retracted rows from active membership, reclassifying 3 current reasons,
  and converging 5 material-ready reviews through the existing audited approval
  path. It did not fabricate inventory movement or submission quantity.
- The final dry run is stable at 86 active reviews: 40 eligibility conflicts,
  21 actionable unresolved, and 25 true setup missing, with zero proposed
  automatic operations and zero failures.

### Rollout gate

- The fresh corrected local shadow report compared 6,821 projections and found
  zero unsafe transition differences and zero stale projections. Its 95.30 ms
  p95 spans 97 actual paged database reads and fresh resolver batches.
- A separate read-only end-to-end benchmark exercises Production pending,
  Production Due Today, and Fulfillment pending through the real Sales Orders
  list, count, and summary entry points. Its 36 post-warmup samples pass the
  500 ms gate at 455.07 ms p95 and 465.04 ms maximum.
- It classifies membership differences as 2,571 explained compatibility cases,
  34 explicit operator-review applicability cases, and zero unexplained. It
  also reports 2,985 headline differences. Conflict sampling and operator
  approval are incomplete, so the automated cutover gate correctly fails.
- Ticket 13 is complete at 12/12. Its local read-only classification,
  bounded repair evidence, stable rerun, audit trail, archetype proof,
  revision-safe material operations, and compare-and-set projection undo are
  recorded. Version-2 backups carry the post-repair revision; rollback skips a
  row changed afterward and unsafe version-1 backups fail closed. The
  current-evidence terminal/superseded/empty material-review query seam passes
  focused integration coverage.
- Across the sixteen-ticket Scratch queue, 156/165 acceptance checks are
  verified: Tickets 01–10, 12, 13, and 15 are done; Ticket 11 is in progress;
  Ticket 14 is in production rollout at 6/13; and Ticket 16 is in progress at
  14/15 pending authenticated multi-viewport browser QA. Ticket 15's simplified
  visible action pair now routes ordinary and audited exception commands by
  canonical lifecycle state, and Sales Order editors may use the bounded
  exception path. Ticket 16's confirmation uses the shared shadcn picker with
  no native date input. The focused lifecycle/rescheduling pass covers 254
  tests and 938 assertions with no failures. Scratch is authoritative and Brain
  mirrors its checked evidence.
  Ticket 09 is complete at 10/10: worker lifecycle events refresh the exact affected
  queue, dashboard, Calendar, and detail projections, and actionable review
  counts use the same package-owned current-evidence membership as admin
  Production and Sales Overview. Dev Quick Sign In authenticated the inner
  browser as Izri for order `09502PC`; all three exact-size items, material
  states, and single grouped inbound lines match the admin projection. A full
  reload preserves the exact expanded item. The reproducible worker harness
  passes at 390×844 and 768×1024 with no horizontal overflow and reachable
  inline detail. The redundant worker-only top-level inbound summary is
  removed now that exact item rows own the inline evidence; the admin summary
  is unchanged.
  Ticket 10 is complete at 7/7. Driver and native-mobile retries preserve
  request identity, stale revisions fail inside the canonical transaction,
  committed actions refresh every affected projection, and responsive/device
  contracts preserve safe loading plus restartable proof drafts.
  Ticket 11 is at 8/9. Its customer/dealer item-material projection is verified
  across all canonical states: only approved material can produce a ready
  claim, and customer-safe results omit operational evidence. Retiring the
  temporary channel legacy adapter remains coupled to Ticket 14's approved read
  cutover.
  Ticket 12 is complete at 10/10. Material-review notifications re-evaluate current
  package-owned actionability and carry classification plus evidence revisions.
  The central event registry invalidates review and item-material queries after
  every Production, catalog-metadata, stock, inbound, allocation, and
  fulfillment evidence family. Lists, counts, summaries, saved filters, exports,
  and analytics share canonical scope, and document labels preserve
  Administrative Completion provenance.
  Committed jobs isolate notification failures; material-review timestamps and
  revisions participate in projection freshness, and stale completed reads fail
  visibly. Ticket 14 remains an operational Preview/production rollout gate.
  Its falsifiable classifier rerun reports 0 unexplained, 0 unsafe, and 0 stale
  differences; conflict sampling and operator approval remain incomplete. Its
  incomplete state is not a license to bypass production approval.
- On 2026-09-03 the user explicitly waived Preview and authorized direct
  production deployment plus bounded reconciliation/repair. The guarded
  production schema push completed against the recorded fingerprint and added
  only the derived projection columns/indexes. The approved 59 MB, 157-file
  application snapshot deployed successfully as
  `dpl_E2K1NQqDWTJqy5Vvgy1TqXs5AUQP` and is promoted to
  `www.gndprodesk.com`; both production smoke URLs return HTTP 200.
- The production projection dry run found 6,886 deterministic derived-cache
  repairs, 1,264 review-required conflicts, and 0 unsafe. The authorized apply
  created its 1.1 MB rollback backup and completed 17 batches before a `P1001`
  read disconnect stopped the next batch before upserts. The post-failure dry
  audit proves 1,638 clean, 62 known compatibility differences, 5,186 repairs
  remaining, 1,265 review-required, and 0 unsafe across 8,151 orders. Source
  lifecycle facts were never eligible for rewrite, and material-review repair
  has not started.
- The first 50-row continuation attempt failed in its pre-backup scan after the
  original short read-retry window, so it created no artifact and made no
  mutation. Read-only operations now allow about 95 seconds for a transient
  connection to recover; projection mutation calls remain outside automatic
  retry. The focused operational suite passes 7/7.
- The subsequent part-2 attempt created its 823 KB backup and converged 450
  more rows before another prerequisite-read disconnect. The post-part-2 audit
  across 8,152 orders reports 2,073 clean, 77 known compatibility differences,
  4,736 deterministic repairs remaining, 1,266 review-required, and 0 unsafe.
  An opt-in projection refresh mode now serializes and retries only read phases;
  ordinary application behavior is unchanged and upserts remain un-retried.
  The combined focused suite passes 10/10 and Sales typecheck passes.
- Part 3 created its 752 KB backup, recovered one read outage, and later stopped
  on an unacknowledged cache upsert. Its fresh audit across 8,155 orders reports
  3,497 clean, 252 known compatibility differences, 3,140 deterministic repairs
  remaining, 1,266 review-required, and 0 unsafe. Cumulative convergence is
  3,746/6,886 (54%).
- The runner can now retry an entire deterministic projection batch after a
  connection failure. The retry recomputes canonical evidence and revision
  guards before each cache-only attempt, skips changed source revisions, and is
  not exposed to business-domain mutations. The focused suite passes 11/11,
  Sales typecheck passes, and diff integrity is clean.
- The first part-4 start failed on its initial actor-permission read before any
  scan, backup, report, or mutation. Permission checks now use the same bounded
  read-only recovery while remaining serialized and freshly evaluated. The
  runner suite passes 8/8. The retried part-4 apply created a 499 KB backup and
  was interrupted during a read-only retry after provider failover; its fresh
  audit across 8,158 orders reports 3,738 clean, 261 known compatibility
  differences, 2,891 deterministic repairs remaining, 1,268 review-required,
  and 0 unsafe. This proves 249 fewer deterministic repairs than the part-3
  checkpoint. Read retries now disconnect the failed Prisma client before the
  next attempt so provider resolution can refresh.
- Ticket 14's latest environment-backed broad run executes 4,471 tests across
  868 files: 4,470 pass, 1 opt-in live-database parity test is intentionally
  skipped, 0 fail, and no setup/runtime errors remain. Explicit dependency
  seams prevent notification, Trigger.dev, and environment-backed test doubles
  from leaking between files. The automated matrix and authenticated
  responsive worker/device acceptance are green. The final material-review
  presentation rerun passes 12/12, and the
  Dashboard diagnostic contains no lifecycle/material-review error; its 1,382
  remaining diagnostics are the documented broad repository baseline.

### Canonical command execution

- Production, material-review, Fulfillment, packing, and Dispatch lifecycle
  mutations use one package-owned transaction executor. It locks the Sales
  order, recomputes canonical evidence inside the transaction, validates the
  caller's expected revision, and then applies the domain mutation.
- Exact replays remain idempotent, stale and conflicting writes fail closed,
  and post-commit projection refresh is best effort so a refresh fault cannot
  report a committed mutation as failed.
- Dashboard lifecycle callers now propagate the current pipeline revision.
  Pack-all performs one canonical completion command instead of racing a
  background packing write with immediate completion.
- The deduplicated `sales.pipeline.changed` event covers Sales Orders and
  Overview, Production list/summary/Calendar/worker tasks,
  Fulfillment/Dispatch/packing/driver workspaces, and inventory projections.
  Active queries refetch; inactive queries are marked stale. Direct canonical
  Dispatch mutations and monitored single/batch task completions use this same
  event instead of maintaining caller-local invalidation lists.

### Material-review presentation states

- Production viewers may inspect current or historical material-review
  evidence; the API returns explicit review, inbound-receipt, and manual
  availability capabilities. Mutation authorization remains enforced
  independently at the write boundary.
- Exact deep links to closed, terminal, superseded, or empty reviews render
  read-only audit history. Loading, unavailable evidence, stale evidence,
  conflict, read-only, and partial-permission states are explicit and do not
  expose an unauthorized or unsafe decision control.

Production deployment/general cutover is intentionally not implied by local
completion. The production default remains shadow until measured production
gates and operator approval pass.

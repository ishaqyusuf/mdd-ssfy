### 2026-09-15 — Public web/mobile password-login response boundary

`POST /api/auth/www-mobile-sign-in` and
`POST /api/auth/www-legacy-sign-in` now admit an attempt through a shared
production limiter before legacy-user lookup. Over-quota requests return 429
with `Retry-After`; unavailable trusted-IP/Redis/key infrastructure returns
503. Successful and invalid-credential response shapes are otherwise
unchanged. See [mobile auth abuse protection](mobile-auth-abuse-protection.md).

### 2026-09-15 — Manual request JSON correction budget

The one correction now covers the shared seed semantic checks and native
configuration/source-grounding checks as well as JSON shape. The generation
service supplies a local validation closure; decoded source is not added to model
messages. The final service validation remains. Shape, semantic and catalog errors
share one correction budget, not one retry per stage. Safe provider diagnostics
use configuration-validation/seed for native validation failures; no raw failure
message is returned to clients. Evaluation callers still default to zero repairs.

Preview checks the current published catalog revision before provider I/O, matching
Apply. A stale publication instructs the caller to regenerate AI component
configuration in Sales Settings. This is independent of benchmark approval.

DeepSeek now receives the strict native JSON schema in the initial system prompt;
the adapter response format remains generic JSON for compatibility. Strict local
validation and the shared two-response/45-second ceiling remain unchanged.

Manual generatePreview permits one DeepSeek schema-correction response under the
original 45-second abort signal, with transport retries zero and 4,000 output tokens
per response. Corrections use the unchanged source and strict validation errors;
valid results aggregate usage across both responses. Benchmark/evaluation provider
defaults retain zero corrections. Scalar product selection is normalized to a list
only for catalog-declared multiple steps; unknown fields and invalid quantities
remain rejected. No request/response API shape or benchmark authority changed.

### 2026-09-10 — Completion quantity review read boundary

Added manager-protected fulfillmentCompletionReview with explicit order/fulfillment pairing. It projects physical evidence and delegates assigned/packed/left-behind quantities to the shared sales validator through buildFulfillmentCompletionReview. Unknown scopes, overpacking and unresolved physical evidence return a blocked review instead of guessed quantities. Two shared review tests pass with nine assertions. This is a quantity-only preview, not inventory/evidence/permission readiness to complete. UI consumption, delivered/order remainder context, manifest binding and protected-query integration remain unfinished.

### 2026-09-10 — Empty-load proof guard applies to delivery and pickup

Moved the shared positive-packed-quantity guard outside the pickup-only branch of proof finalization. Both delivery and pickup now require a nondeleted positive packed row for the paired order/fulfillment before completion. This prevents legacy delivery scopes with no packing from being marked delivered through proof submission. Seventeen focused proof/guard tests pass with 39 assertions; these are helper tests, not protected-route persistence evidence. Explicit historical recovery must still confirm and pack actual delivered quantities through the canonical workflow.

### 2026-09-10 — Manifest revision includes planned fulfillment scope

Packing command revision now includes the parsed fulfillment assignment scope (revision, selection mode and quantities) and delivery mode, in addition to driver, physical packing, inventory and pending reports. Previously a planned-quantity-only edit could leave an earlier proof review apparently current. Unrelated metadata such as proof-upload checkpoints is deliberately excluded. Existing packing/proof suites pass 22 tests / 54 assertions; these regressions do not yet exercise a persisted quantity edit against the manifest query. Existing drafts receive a changed revision on rollout and must be reviewed again.

### 2026-09-10 — Proof finalization rechecks the reviewed load

The canonical proof completion callback now locks the fulfillment header and recomputes its packing manifest revision before pickup packing or submitDispatchTask. A change during media upload returns CONFLICT instead of completing from the pre-upload review. The existing early completed-request replay remains separate. Isolated route transpilation passed; concurrent database and protected-route acceptance remain unverified. This guard relies on competing packing/edit commands participating in the same locking protocol; it does not establish proof that every legacy writer does so.

### 2026-09-10 — Proof manifest contract

completeDispatchWithProof requires a nonblank expectedManifestRevision (16–128 characters). The staged proof fingerprint includes it alongside recipient, date, notes and media. Reusing a request ID for another manifest fails. Existing web/mobile callers supply this value; older clients omitting it now fail validation. Prior fingerprint checkpoints need a fresh request. This does not replace a locked finalization-time manifest check.

## Order-first fulfillment overview — Ticket 03

`dispatch.fulfillmentOrder({ salesId, cursor? })` requires the existing dispatch-manager authorization. It reads one non-deleted order requiring fulfillment and returns NOT_FOUND otherwise. The response contains general order context, canonical aggregate quantities, all-history count, open-exception fulfillment count, and up to 20 newest fulfillment summaries with `nextCursor`. Completed and cancelled history remains visible. Summaries distinguish planned quantity (nullable for unknown legacy scope), physical packing and evidence-backed delivery. Item display labels/subtitles are enriched after order page selection. No raw proof metadata is exposed.

Client sheet identity uses `fulfillmentOrderId` separately from table filters and legacy sales overlays. The order sheet loads only when opened; history pages load on demand. Assignment detail and the new selected-quantity form are subsequent ticket work. Local database fixture verifies parent isolation, empty history, 23-record pagination, label enrichment and separate plan/pack/delivery counts with complete rollback.

# API Contracts

## Fulfillment notice replay

The `sales_dispatch_completed` payload and activity tags accept optional `completedByAdmin`. The sales-control worker sends completion notices for both submitDispatch and markAsCompleted, marks the latter as admin completion, and includes the assigned driver among recipients. Durable completion-event recovery remains under implementation.

`confirmFulfillmentShortLoad` also records an updated-notice intent for a changed scope and assigned driver. Its delivery/replay/retry behavior matches create/edit. No-op confirmation produces no intent; existing external notices remain first-execution-only.

Recovery code includes `sweep-fulfillment-notices`, which pages through command audits with intents lacking receipts and queues delivery tasks. A five-minute production schedule is defined but not deployed or activated. Receipt exclusion and full worker acceptance remain under verification.

`createFulfillment` and `updateFulfillment` attempt durable in-app notice delivery after the operational transaction, including idempotent command replay. Delivery failure sets `notificationFailed` without rolling back the saved fulfillment and attempts to enqueue `deliver-fulfillment-notices` with the original request ID. The worker uses eight attempts and existing receipts; queue failure remains visible. In-app activity and receipt commit together. Existing first-execution email/WhatsApp sends suppress activity creation to avoid a duplicate inbox notice; they do not yet have the new retry guarantee. Crash/queue-outage sweep recovery and live worker verification remain in progress.

## Bulk fulfillment outcome verification

`consumeDispatchBoundInventory` excludes released and cancelled allocation history from consumption. Remaining active bound allocations must still be picked; released rows remain available as audit evidence and are never counted in `consumedQty`.

The shared mark-as-completed task preserves physical packing for scoped in-progress fulfillments and calls the existing guarded completion command directly. It does not prepare or pack additional stock after departure. Scoped shortcuts supply `consumeDispatchBoundInventory` inside the completion transaction, recording consumed allocation evidence together with completed status. Explicit completed-request retries also use completion replay/conflict validation without repacking. Pre-trip fulfillments retain the preparation/packing/completion path.

`bulk-mark-sales-fulfilled` resolves all active fulfillment IDs and any newly created remainder, then processes one fulfillment per order per sequential round. Independent orders share a batch. Each round reloads pipeline revisions; child idempotency keys include request, order and fulfillment IDs. Failure stops subsequent fulfillments for that order. After its final planned fulfillment, the worker reloads the order snapshot: `fulfilled` reports success, administrative completion reports `already_fulfilled`, and outstanding quantities, unresolved checks or missing evidence report `review_required`. Review-required outcomes also set batch metadata to `completed_with_errors`. Completed and cancelled history is excluded from the execution list. Full worker retry and lifecycle acceptance remains in progress.

## Fulfillment quantities — Ticket 01, local implementation (2026-09-10)

`dispatch.orderDispatchOverview` now includes additive `fulfillmentQuantities`: per-control-UID ordered, delivered, assigned, packed, remainingToDeliver and availableToAssign quantities, plus resolved/conflicts/backlogQty. Existing permissions and response fields remain. The shared Sales adapter reads physical packing and typed assignment metadata separately. Unknown legacy scope, ambiguous size identity, missing completion evidence and inventory allocations lacking materialized sales-unit packing block assignable quantities. These conflicts must be presented explicitly; a zero backlogQty on unresolved evidence does not mean the order is fulfilled. The existing Dispatch overview displays this projection with an expandable item breakdown. Backlog query and summary now resolve shared quantity membership from persisted controls and delivery evidence in batches of 100 before pagination/counting. An active fulfillment does not exclude a known assignable remainder. Unknown legacy scope remains unresolved and cannot manufacture available stock.

## Sales Orders payment review metadata (2026-09-08)

- Legacy Sales Orders reads now populate the existing latestPaymentReview field
  through a bounded lookup of loaded orders, selecting only their newest
  non-deleted needs_review payment in success/completed/paid state.
- Zero-amount reviewable payments remain actionable. Rows without a qualifying
  payment return null. This fixes a disabled single-row review button despite
  membership in the review queue.
- Review metadata stays separate from invoice/payment totals and full payment
  history. Request/response field names and mutation permissions are unchanged.

## Sales completion presentation (2026-09-08)

- Shared production, fulfillment and headline display labels now use Completed
  for operational and administrative completion, with emerald completion tone.
  This supersedes the earlier Ticket 19 Marked as completed display wording.
- Materialized Sales Orders reads refresh labels/tone from current canonical
  metadata; no persisted snapshot rewrite or data migration is required.
- The single visible Completed lifecycle option uses `fulfilled` and matches
  both `fulfilled` and `administratively_completed` in indexed candidate queries
  and the shared final predicate. Saved administrative-only filters still work.
  Counts, summaries, lists and exports use that same filter expansion.
- Stored codes, revisions, audit records, completion commands and workspace
  eligibility are unchanged. No request shape or permission contract changes.

## Completion confirmation (Ticket21, local implementation)

Direct, bulk and explicit-fallback status-only completion inputs accept omitted
reasons; normalized empty text is not a user-authored explanation. Existing
reasons are preserved. Exception override revisions, command authorization and
fallback attempt linkage remain mandatory. Cancellation/repair contracts are
unchanged. `sales.salesCompletionDateContext` returns business `today` and
`timeZone` to authenticated clients without a database call.

## Dispatch calendar range contract (Ticket20, local work in progress)

`dispatch.calendar` requires either validated `from`/`to` calendar dates (at
most46 days) or `unscheduled: true` without a date-dependent query key.
Both forms preserve existing filters/cursor.
The query applies a business-timezone half-open dueDate interval before loading
details; undated requests select only null dueDate. Sorting is dueDate/id, not
the list's completion-date sort. Pages are capped at100. Returned rows expose
calendarDate, calendarCompleted, calendarLabel and calendarTone; response carries timezone and
business today. SourceDate/revision for rescheduling are not rewritten.
Stage filters are applied to batched canonical results before filling the page;
physical candidate offsets preserve cursor continuation. A filtered count is
omitted rather than presenting the unfiltered candidate count as a total.
Public query and date-boundary regressions pass locally; not deployed yet.

## Dispatch completion membership (Ticket 19, production verified 2026-09-07)

- Shared status-only labels display `Marked as completed`; the stored
  `administratively_completed` code, completion records and provenance remain.
- `dispatch.list` excludes canonical fulfillment completion from Active,
  Due Today and Past Due independently of an underlying open dispatch record.
  Production-only completion does not exclude pending fulfillment. Filtering
  precedes returned-page filling and cursor advancement.
- Sales owns the candidate predicate: ready/current-version revision-bearing
  terminal projections are excluded before detail loading. Unavailable
  projections remain candidates for batched canonical evidence resolution.
  Nullable trust fields have explicit SQL branches (not merely negated equality)
  so SQL UNKNOWN cannot silently suppress fallback. Scoped queues exclude
  known non-required fulfillment and candidate orders exclude quotes/deleted rows.
- `dispatch.workspaceSummary` reconstructs unavailable evidence in batches of
  100 unique orders, reconciles their contribution to Completed/All counts,
  and excludes terminal fallback orders from open-stage counts. Required
  canonical fulfillment, not a populated legacy deliveryOption, determines
  Completed/All eligibility. Counts remain order-based; list rows are dispatches.
- No request schema, permission, database schema or completion audit contract
  changed. Commit cdf57deb9 is deployed on www.gndprodesk.com; authenticated
  membership/label checks and read-only production order-count parity pass.

## Production filter inputs (2026-09-06)

- `filters.salesProductions` returns typed input definitions for `q`,
  `customer.name`, `phone`, `po`, `sales.rep`, `salesNo`, and `item`. Their URL
  keys and server-side filter semantics are unchanged; the endpoint no longer
  returns exhaustive options for these high-cardinality fields.
- `invoice`, `productionStatus`, `priority`, and `assignedToId` remain option
  filters. Assigned To retains the existing active Production-role,
  non-revoked, non-deleted, name-ordered first-20 scope and string-valued IDs.
- Loading metadata performs no Sales-order option scan and does not depend on
  the Sales filter-option cache. A worker read or authorization failure rejects
  the response instead of returning incomplete or public metadata.

## Production filter worker options (2026-09-05)

- The Assigned To option loader selects only worker ID/name and runs alongside
  independent base sales options. It must not invoke employee-management
  permission seeding, counts, document/profile enrichment or grant reporting.
- Existing Production-role and active-access scope, soft-delete exclusion,
  alphabetical first-20 page, empty-label filtering, and string-valued worker
  IDs are preserved. A worker read failure rejects the filter response rather
  than silently returning incomplete options. All other option contracts and
  route authorization are unchanged by this bounded optimization.

## Fulfillment order headline parity (2026-09-05)

- Fulfillment Backlog and both Dispatch list control-read variants project the
  order headline code, label, tone, and Production dimension from the same
  cohort-selected canonical snapshot used by Orders/Overview. Legacy, shadow,
  excluded-cohort, and missing-snapshot reads retain the existing fallback.
- Backlog loads canonical evidence only for the returned page through the
  shared bounded snapshot loader; Dispatch lists reuse their existing snapshot
  batch. No new application-level per-row database call is introduced.
- Dispatch record/workspace status remains separate from the order headline.
  Internal assignment evidence is not returned, and existing driver audience
  projection, permissions, filters, pagination, and mutation semantics remain
  unchanged.

## Production material-review assignment preflight (2026-09-05)

- Review list/count/detail actionability uses classification
  `production-material-review/v2`. It checks the same assignment-scope proof as
  the transactional decision command, not material readiness alone.
- Missing or stale proof returns `ambiguous`, remains actionable for human
  review, and exposes no supported automatic repair. Existing closed,
  terminal, empty/retracted, and superseded precedence is preserved.
- Query selectors load the necessary assignment fields with each bounded
  candidate batch. Commands still validate current evidence inside the
  transaction; permissions and mutation semantics are unchanged.
- The extra assignment proof and submission metadata are internal only. Detail
  responses keep their previous eight-field submission shape for both active
  and retracted rows; current personnel/payroll fields are not newly exposed.

## Canonical Sales Pipeline Lifecycle (2026-09-02)

- `sales-pipeline/v2` is the shared lifecycle response contract. It includes an
  evidence revision and freshness, canonical headline, explicit commercial,
  payment, material, Production, Fulfillment, packing, and Dispatch dimensions,
  applicability, blockers, conflicts, provenance, and server-owned action
  capabilities.
- Sales Orders, Sales Overview, Production, Fulfillment/Dispatch, worker/driver,
  dealership, storefront, and customer adapters project from the same snapshot.
  Audience adapters may reduce detail and wording but cannot reconstruct or
  redefine lifecycle meaning.
- Lifecycle list filters are evaluated through
  `matchesCanonicalSalesPipelineFilter`. Candidate SQL may return a safe
  superset, but list, count, summary, saved-tab, and export results use the same
  exact canonical ID set. Production schedule membership uses the corresponding
  assignment-level workspace predicate.
- Production Completed membership requires canonical order-level Production
  completion and Production applicability `required`; it does not admit
  non-production orders or orders with remaining open assignments. Worker
  assignment-completion history remains separately scoped.
- Production canonical summary/dashboard/admin-list membership requires an
  undeleted sales order and excludes canonical commercial cancellations in both
  projection and source-fallback reads. A missing projection headline requires
  fallback before membership can be determined (2026-09-07).
- Canonical command evaluation validates permission input, expected evidence
  revision, applicability, blockers, conflicts, terminal/replay state, and
  affected scopes before a domain command runs. Batch outcomes distinguish
  success, replay, skip, review-required, and failure.
- `SALES_PIPELINE_READ_MODE`, `SALES_PIPELINE_COMMAND_MODE`, and
  `SALES_PIPELINE_COHORT_PERCENT` control shadow/canonical serving and bounded
  enforcement. Production defaults to shadow; development defaults to
  canonical.
- Reconciliation dry-run returns a versioned run id, timestamps, classification
  counts, reason codes, revisions, and samples. Apply additionally requires
  actor and reason and can update only revision-checked
  `SalesOrderListProjection` cache rows in bounded batches. Payment, inventory,
  Production, packing, Dispatch, proof, and accounting facts are never repaired
  by this command.
- `item-material-status/v1` is the exact-production-item material contract. It
  returns applicability, one approved status code/label/tone, explanation,
  review state, quantity groups (`required`, `received`,
  `committedAllocated`, `pendingAllocation`, and `openInbound`), blockers,
  provenance, inbound facts, and evidence revision. The source adapter scopes
  repeated door/HPT items by exact inventory variant UID and normalized
  dimension before any parent-item compatibility fallback.
- Customer/dealer material projections return only safe deterministic wording;
  they never expose internal component, conflict, or review evidence and never
  translate receipt/coverage alone into `MATERIAL READY`.
- Production material-review list/count/detail, notification, saved-view,
  deep-link, and order-scoped APIs share one current-actionability predicate.
  Empty/retracted, terminal, and superseded records remain history-only.
- A material-review notification is emitted only after the exact review is
  reloaded and still satisfies that predicate. Its typed payload carries the
  current `classification`, `classificationVersion`, and nullable
  `evidenceRevision`, so stale notifications remain attributable instead of
  becoming a second lifecycle authority.
- The central browser query-event registry invalidates material review,
  Production item detail, materials, and readiness projections after every
  Production, catalog-metadata, stock, inbound, allocation, and Fulfillment
  evidence family.
- Shadow observers emit safe comparison evidence while serving the configured
  legacy/canonical mode. `sales-pipeline:cutover-check` fails closed unless
  unexplained membership and unsafe-transition differences are zero, latency is
  acceptable, conflict sampling is complete, and operator approval is explicit.
- Sales performance order workbooks resolve bounded canonical snapshots and
  export the canonical headline label as `Lifecycle Status`. Missing canonical
  resolution fails the report instead of falling back to a legacy status.

## Status-only Sales Completion (2026-09-01)

- Projection input is `{ salesOrderId: positiveInt }`. The response separates
  `operationalProductionCompleted` and `canonicalFulfilled` from
  `productionCompletionSatisfied` / `fulfillmentCompletionSatisfied`, exposes
  source and method, keeps effective and recorded dates distinct, returns active
  records plus immutable history, and includes a SHA-256 revision and
  server-owned available actions.
- Mark input is `{ salesOrderId, requestId: uuid, expectedRevision,
  effectiveAt?: Date | null }`. Cancel input is `{ salesOrderId, requestId:
  uuid, expectedRevision, reason?: string | null }`; reasons are trimmed and
  capped at 500 characters.
- Bulk mark input is `{ salesOrderIds: positiveInt[1..100], requestId: uuid,
  effectiveAt?: Date | null }`. The server deduplicates ids, derives stable
  per-order request identities, reloads each order's current projection, and
  executes isolated serializable commands sequentially. The result
  reports `requested`, `completed`, `replayed`, `skipped`, `failed`, and one
  outcome per unique order. An invalid transition skips only that order; a
  persistence or lookup failure fails only that order.
- Mark and cancel are serializable, request-idempotent, and protected by a
  database-unique active identity. Revision mismatches are conflicts;
  invalid/method-mismatched transitions are precondition failures; persistence
  failures remain internal errors. Record and Sales History audit writes share
  one transaction.
- Ticket 04 exposes the parallel Fulfillment mark/cancel inputs and commands.
  Status-only Fulfillment implies Production satisfaction without creating a
  Production record, returns `ADMINISTRATIVELY_COMPLETED`, and cannot set
  `canonicalFulfilled`. Cancellation restores surviving explicit or operational
  Production evidence, otherwise unresolved state. The Status-only cancel
  command rejects Full-workflow provenance.
- Ticket 05 adds an internal evidence-gated Full-workflow provenance service.
  Production accepts only the shared operational Production projection;
  Fulfillment accepts only completed proof on every item-bearing dispatch.
  It writes one `FULL_WORKFLOW` completion record plus Sales History in a
  serializable transaction after the operational commit, replays active records
  under retries/races, and retains an active Status-only record without
  rewriting its method.
- Existing workflow-aware cancellation cancels matching Full provenance inside
  its guarded reversal transaction. It ignores Status-only records; public
  Status-only cancellation continues to reject Full provenance. No public input,
  permission, or operational side-effect contract is relaxed.
- Ticket 06 makes `salesOrderDto`, Sales list normalization, and persisted list
  projection payloads return the same shared completion projection alongside
  unchanged operational lifecycle fields. Persisted projection version 3 and
  warm identities use the latest of order or completion-record revisions.
- Sales order queries accept `completion.production` and
  `completion.fulfillment` with `pending | completed`. List, summary, and count
  paths route both through the same shared Prisma satisfaction predicate.
  Existing `production`, `production.status`, and `dispatch.status` remain
  operational filters and do not consume administrative records.
- Active Production workspace list and summary reads now compose
  `completion.production = pending` with their existing operational queue and
  due predicates. This removes Status-only Production and Fulfillment
  satisfaction from Past Due/active queue counts without changing invoice,
  assignment, or material semantics. Past Due and Due Today default to
  `dueDateAsc`; explicit sorts still win. The Completed tab uses
  `completion.production = completed`, while the operational Reviews tab does
  not consume administrative completion satisfaction.
- Completion reporting defaults to `OPERATIONAL` and omits Status-only rows.
  Explicit `ADMINISTRATIVE` scope returns `source`, `method`, nullable
  `effectiveAt`, and `recordedAt` independently; implied Production remains
  labelled as implied and recording time never replaces an unknown effective
  time.
- Ticket 07 maps every approved scenario to direct automated evidence. The
  13-file release suite passes 134 tests / 702 assertions, including
  idempotency/races, stale revisions, cancellation restoration/rejection,
  canonical-evidence precedence, queue parity, reporting scope, and operational
  non-effects.

## Bulk Production Completion Task (2026-08-29)

- `bulk-mark-sales-production-completed` accepts a server-stamped actor plus a
  UUID request id and 1-40 deduplicated positive Sales Order ids. Browser
  callers provide only the request id and ids; the task trigger derives the
  authenticated actor and rejects users without Production access.
- One durable parent reloads current lifecycle state, skips orders already past
  production completion, runs eligible canonical sales-control children with
  request/order idempotency, and returns totals for `succeeded`,
  `alreadyCompleted`, `awaitingReview`, and `failed` plus per-order outcomes.
- Task-start schema messages are trusted application-authored messages. The
  dashboard returns and displays their first validation issue (including the
  40-order limit), while unknown exceptions still pass through the shared
  public-error classifier and remain generic.

## Material And Production Sales Handoff Actions (2026-08-23)

- Protected `sales.getSalesHandoffActions({ limit? })` accepts only an optional
  integer limit from 1 through 50. Representative scope is always
  `ctx.userId`; unknown or forged representative fields are stripped and never
  reach the database query.
- Active Super Admins receive organization-wide unresolved actions grouped by
  responsible representative; other active users remain representative-scoped.
  Results are ordered by opening time, order number, Material before Production,
  then epoch id. The alert reveals six more actions per activation.
- Protected `sales.getOpenSalesHandoffOrderScope` returns bounded distinct ids,
  an exact `uniqueOrderCount`, and truncation metadata. Server callers reuse
  `getOpenSalesHandoffEpochWhere` for exact relation filtering/pagination.
- The response is
  `{ actions, total, counts: { MATERIAL, PRODUCTION }, limit, truncated }`.
  `total` and both per-type counts are exact for the authenticated actor scope,
  independent of the bounded returned action page. Actions are stable
  oldest-first Material or Production epochs with scalar action/order/representative identity,
  uncovered quantity, ISO qualification/open timestamps, and policy/evidence
  revisions. Read repair is split into two independently bounded sets: the
  oldest 200 open epochs are always eligible for resolution regardless of order
  age, while up to 200 new-open candidates are nondeleted, nonterminal orders
  for the session representative ordered by newest update/create evidence.
- Production actions add `targetSalesItemId`, `targetControlUid`, optional
  `targetAssignmentId`, and `orderRevision`. Material actions return those
  fields as `null`. No assignment mutation authority or worker identity is
  exposed.

## Sales Handoff escalation contract (2026-08-23)

- First-open action clock is the later of qualification or the policy change
  that newly exposed it. One New York business day is the same wall time on the
  next weekday. Transfer preserves the epoch and clock; genuine reopen creates
  a new epoch and clock; resolution cancels an unsent escalation.
- The 15-minute bounded schedule atomically claims due unresolved epochs and
  creates one activity-only NotePad notification plus one durable ledger row per
  active Super Admin in the epoch organization. No email, SMS, push, or WhatsApp
  handler exists.
- Organization scope prefers `SalesOrders.orgId`, otherwise requires exactly one
  organization from the responsible rep's active role assignments. Missing or
  ambiguous scope fails closed and is logged.
- Notification deep links use the persisted order/action/production-control
  snapshot and re-enter ordinary protected Sales Overview authorization.
- Marking the activity read records the authenticated recipient's
  `acknowledgedAt`; acknowledgement never changes `resolvedAt`.
- The read consumes canonical `PaymentProjection` totals plus identity-bearing
  posted allocation/ledger occurrence evidence and the shared Ticket 01
  qualifier. It does not interpret raw receipt status or create operational
  evidence.
- `reconcileMaterialSalesHandoffOrder({ salesOrderId, actorUserId })` is an
  exact affected-order command. It loads only that order and its canonical
  payment/allocation evidence, reconciles both Material and Production epochs,
  and resolves existing epochs when the row is missing or no longer
  actionable. It never invokes the representative-scoped bounded read.
- `reconcileSalesHandoffOrders` deduplicates explicit affected ids for
  post-commit mutation orchestration. A settings-policy change immediately
  reconciles a bounded union of the 200 oldest opens and 200 newest active
  orders; the recurring repair worker owns remaining global fan-out.
- Reconciliation and Sales Handoff settings persistence are package-owned
  services (`@gnd/sales/sales-handoff` and `@gnd/settings`). API callers retain
  compatibility re-exports, while jobs consume the package contract directly;
  no API-to-jobs or jobs-to-API dependency is introduced.
- Posted allocation evidence recognizes `payment`, `refund`, `void`, and
  `square_refund`; magnitudes are normalized from type semantics before the
  cumulative settlement timeline is built, so negative Square-refund storage
  cannot increase settled value.
- Material actions open Sales Overview with `salesTab=inventory`,
  `inventorySegment=stock`, and `inventoryCreateInbound=true`. The Create
  inbound continuation remains URL-owned while its secondary pane is mounted,
  survives copied-link reload, and is cleared only when that pane or the outer
  Sales Overview closes. A mounted pane suppresses repeat opening, and the
  existing secondary-pane exit path restores focus to its opening control.
- Production actions open Sales Overview with `mode=sales-production`,
  `salesTab=production`, the exact `prod-item-view` control UID, and
  `prod-item-tab=assignments`. Existing Sales Overview session authorization is
  re-applied; the deep link does not authorize assignment or submission writes.
- The read derives Production quantity from current production-capable controls,
  active owned assignments, completed owned assignments, and finalized
  attributable submission evidence. Pending/rejected/deleted reviews,
  unrelated/stale controls, and unowned assignment quantity do not cover.
- The Sales Orders server batch prefetch excludes
  `sales.getSalesHandoffActions`. The alert owns a non-Suspense client query so
  server markup and the first hydration render both begin with its compact
  skeleton, then independently resolve to alert, empty, or explicit retryable
  error state without delaying table or summary prefetch.


## Sales Handoff recurring reconciliation contract (2026-08-23)

- `sales-handoff-reconciliation-schedule` runs every 15 minutes on a queue with
  concurrency one and processes at most 200 unique Sales Order ids per run.
  Durable order repair markers are selected first, then a rotating keyset over
  open Material/Production epochs, while at least 50 slots remain available for
  the active-order primary-key cursor. No full active Sales Orders working set
  is loaded.
- `ScheduleHistory` persists the active-order cursor, open-epoch cursor,
  policy-revision fan-out state, source counts, scanned/reconciled/failed totals,
  cursor wrap evidence, and a bounded failure sample for every run.
- Every committed policy revision first upserts an open revision marker with
  its original policy-change timestamp, then performs the bounded immediate
  reconciliation. The marker resets the active cursor once and stays open until
  the complete active-order pass wraps, including when the immediate pass
  succeeds. Only active-cursor candidates in that pass use the explicit
  `POLICY_CHANGE` initial-exposure milestone. Priority repair/open candidates
  remain unmarked, and ordinary recurring discovery remains unmarked, so later
  evidence loss starts its SLA at reconciliation time.
- When a policy-pass active candidate fails, its deterministic order repair
  marker retains the policy milestone, revision, and change timestamp. A retry
  replays that exact first-exposure context even after the global fan-out has
  wrapped, so the epoch opens at policy time rather than retry time. The global
  policy marker is not resolved if this durable handoff cannot be recorded.
- Missing/deleted orders enter the exact command and resolve their open epochs.
  Per-order projection failures upsert the deterministic order repair marker;
  worker/source failures upsert a global worker marker, persist failed run
  history, and fail the Trigger task. Missing canonical payment evidence and an
  otherwise-empty result caused by unavailable inventory evidence are errors,
  never an implicit empty queue.
- If inventory applicability is unavailable while Production truth is still
  actionable, reconciliation advances Production only and leaves Material
  untouched. It neither resolves a prior Material epoch nor creates a false
  Material epoch from unavailable evidence.

## Dispatch Packing Item Presentation Contract (2026-08-23)

- `dispatch.dispatchOverviewV2` reuses the canonical composed Production item
  title and subtitle for legacy dispatch rows instead of preferring stale
  persisted `SalesItemControl` fallback labels.
- Canonical Production control rows are projected first so distinct door sizes
  and handings remain separate in Packing. Persisted controls without a current
  Production counterpart are appended only as legacy compatibility rows.
- The subtitle retains the Production projection's section/item type, door
  dimension, swing/handing, quantity, and labor context. Existing dispatch ids,
  quantity matrices, packing lines, inventory readiness, permissions, and write
  contracts are unchanged.
- `@gnd/sales/dispatch-packing-plan` is the deterministic packing-selection
  boundary. Pack All prefers submission deliverables, existing listed quantity,
  published deliverable quantity, and finally published available quantity; it
  never infers packability from ordered quantity. Guarded planning accepts
  submission-bound production capacity and explicit stock availability without
  a submission id, while excess quantity remains unavailable.
- `@gnd/sales/production-dispatch-policy` freezes structural production changes
  during dispatch but permits completion of an existing assignment. The
  production submission action remains the authority that creates packable
  production quantity; the policy changes UI availability, not mutation input,
  authorization, review, or persistence contracts.

## Fulfillment Calendar Contract (2026-08-21)

- `dispatch.fulfillmentCalendar({ from, to })` accepts real `YYYY-MM-DD` dates,
  requires `to >= from`, and caps requests at 46 inclusive days so both a week
  and a six-week month grid remain bounded.
- Results contain active dispatches only (`queue`, `packing queue`, `missing
  items`, `packed`, and `in progress`), split into `scheduled` rows within the
  requested inclusive range and `unscheduled` rows with no due date.
- The projection is read-only and does not replace the accepted list, sheet,
  packing, assignment, status, proof, or v2 calendar contracts.

## Mark Sales Order Fulfilled Contract (2026-08-20)

- `inventories.salesInventoryMarkAsPreflight`,
  `resolveSalesInventoryMarkAsAvailabilityForContinue`,
  `overrideSalesInventoryMarkAsAvailabilityForContinue`, and
  `resolveSalesInventoryMarkAsAutoForContinue` require
  `viewMarkSalesOrderFulfilled` only for `action = fulfilled`.
- `dispatch.ensureSalesOrderFulfillmentDispatch({ salesId })` requires the
  dedicated permission, repeats Special Order dispatch enforcement, and runs a
  serializable lookup/create. It reuses the newest active dispatch or creates
  one queued dispatch from the order's delivery option, then returns `{ id }`.
- The shared Dashboard task action rejects `update-sales-control` payloads with
  `markAsCompleted` unless the authenticated session has the dedicated grant.
  It still overwrites client-supplied actor metadata.
- The background job rebuilds the live role plus employee-specific permission
  snapshot for `meta.authorId` and rejects unauthorized direct task invocation
  before Special Order checks or domain writes.

## Sales Form Reliability Contract (2026-08-19)

- `sales.createWorkflowComponent` accepts an active workflow step plus bounded
  component details and creates one selectable catalog component. Creation and
  `sales.saveWorkflowComponentDetails` require `editSalesComponent`; visibility,
  redirect, archive, section override, and pricing retain their existing role
  boundaries.
- Sales-linked customer and direct billing/shipping address schemas accept an
  empty Address Line 1. Storefront checkout schemas are unchanged.
- Adjustment preview derives inbound disposition from a reduced line's own
  mutable open demand. It does not combine an arbitrary reduction with inbound
  on another changed line.
- Quote conversion stores the source sale id in target metadata and reuses the
  same target for retries/concurrent submissions rather than creating a second
  invoice.

## Dispatch Workspace And Durable Exception Contract (2026-08-18)

- Workspace list inputs add URL-compatible lifecycle stages, driver ids, due
  buckets, delivery modes, schedule range, and risk filters. List rows expose a
  shared lifecycle projection plus risk codes while retaining legacy status.
- `dispatch.workspaceSummary` returns backlog, overdue, open-exception,
  permission-aware driver, and per-stage counts used by the admin workspace.
  Open exceptions count native open driver reports plus distinct dispatches
  with pending guarded-packing review batches.
- As of 2026-09-01, lifecycle stage counts project directly from canonical
  `OrderDelivery.status`, driver, delivery mode, and due date. The summary does
  not rebuild the historical sales item/quantity control graph. Explicit
  statuses such as `missing items`, `packed`, `in progress`, `completed`, and
  `cancelled` therefore remain authoritative; a null legacy status retains the
  lifecycle projector's queue/assignment fallback. Response fields,
  dispatch-manager authorization, backlog authority, driver permission filter,
  and guarded-packing exception count are unchanged.
- Dispatch due-date APIs accept runtime timezone configuration through the
  shared date boundary. POSIX-style names with a leading colon are normalized
  (for example, `:UTC` becomes `UTC`), recognized zones are retained, and empty
  or invalid values fall back to `America/New_York`. Invalid deployment
  configuration must not turn `dispatch.workspaceSummary`, `dispatch.list`, or
  their due/risk filters into transport errors.
- `dispatch.backlog` returns eligible delivery/pickup orders with no active
  non-cancelled dispatch. Rows include order title/number, customer,
  delivery-mode, nullable order-level `deliveryDueDate`, and status metadata
  for the Fulfillment selector. `deliveryDueDate` initializes a new plan only;
  it is not an existing dispatch schedule. Backlog
  sorting accepts `createdAt.asc` or `createdAt.desc`, defaults to oldest-first,
  and treats unrelated sort fields as the default rather than applying dispatch
  due-date semantics to Sales Orders.
- `dispatch.exceptions` returns one chronological projection of native driver
  reports and guarded-packing review batches. Each row exposes a stable
  source-qualified key and `source = driver_report | guarded_packing`; pending
  packing reviews map to Open and approved, rejected, or cancelled reviews map
  to Resolved.
- `dispatch.backlog` optionally accepts up to 50 positive `ids` for exact
  hydration of URL-prefilled planner selections while retaining the canonical
  backlog eligibility predicate.
- `dispatch.createDispatches` accepts 1-50 unique `{ salesId, dueDate }` order
  plans, one delivery mode, an optional batch `overrideDueDate`, and an optional
  driver. Every individual date remains explicit in the request. When an
  override is present, the server resolves it as the effective date for every
  created dispatch; otherwise each dispatch receives its individual date. The
  command applies the existing dispatch-manager and Special Order checks,
  rechecks that every order still satisfies backlog eligibility inside the
  database transaction, and creates one dispatch per order atomically. One
  duplicate, stale, or ineligible order rejects the complete batch.

## New Sales Form operational dates (2026-08-30)

- New Sales Form order payloads accept nullable ISO-compatible
  `meta.prodDueDate` and `meta.deliveryDueDate` values.
- The shared New Sales Form payload composer treats `meta.paymentDueDate` as
  the visible Fulfillment due date for orders and copies it into
  `meta.deliveryDueDate` before save. The external payload shape is unchanged.
- Save writes the values to `SalesOrders.prodDueDate` and
  `SalesOrders.deliveryDueDate`, and bootstrap returns those scalar values ahead
  of any stale compatibility metadata.
- Quotes keep both operational dates null. Neither field creates a production
  assignment or dispatch as a side effect of saving the commercial document.
- `dispatch.driverManifest` ignores caller driver scope, applies the
  authenticated user id, and returns `{ queue, summary, nextStop }`.
- `dispatch.reportException` accepts a positive dispatch id, bounded reason,
  optional bounded notes, and UUID request id. Replays return the same record;
  terminal dispatches reject new exceptions.
- `dispatch.resolveException` accepts a positive exception id, a 3-2000
  character resolution note, and only `tripAction = keep_assigned`. Schedule or
  cancel changes use their existing guarded commands instead of piggybacking on
  exception resolution.
- Bulk assignment and cancellation return per-row success/failure evidence.
  Cancellation releases dispatch-bound inventory through canonical logic and
  will not release picked rows without explicit confirmation.

## Driver Work Queue and Manifest Contract (2026-08-06)

- `dispatch.driverWorkQueue` returns paginated, authenticated driver work with
  server-owned date/status/search filters and normalized overdue/today/tomorrow/
  upcoming/unscheduled presentation.
- `dispatch.driverWorkQueueSummary` returns global counts independently of the
  loaded page. Driver routes always replace a requested driver scope with the
  authenticated user id.
- `dispatch.manifest` returns the canonical dispatch detail projection with a
  stable revision, structured legacy configuration facts, per-line execution
  mode, and inventory component readiness. Inventory component demand is
  proportional to the quantity listed on the current dispatch.
- `dispatch.prepareInventoryForDispatch` chooses exact approved allocation
  quantities, splits oversized rows, binds them to the dispatch, and picks them
  before returning the refreshed manifest revision.
- `dispatch.inventoryReconciliation` is a read-only drift report.
  `dispatch.backfillInventoryBindings` defaults to `dryRun=true`, skips
  ambiguous multi-dispatch sales, and applies only exact, shortage-free plans.
- Cancellation accepts `confirmPickedInventoryReturned=true` only as an
  explicit manager assertion permitting picked allocations to be released.


## Sales Workflow Cancellation Contract (2026-08-06)

- `sales.workflowCancellationPreview({ salesOrderId, action })` lazily returns
  `allowed`, a deterministic revision, current/resulting lifecycle, typed
  blockers with resource ids, exact reversible effects, and preserved
  inbound/stock/manual-production evidence.
- `sales.cancelWorkflowLayer({ salesOrderId, action, expectedRevision,
  requestId, reason })` requires a non-empty reason, treats UUID `requestId` as
  idempotent, rejects stale revisions, and rechecks the preview inside a
  serializable transaction.
- Production cancellation requires `editProduction`. Fulfillment cancellation
  uses the existing dispatch-management permission set: `editPickup`,
  `editOrders`, or `viewPacking`. Actor id/name come only from the authenticated
  user.
- In-transit, completed, delivered, proof-bearing, locked-payroll, manual-only,
  and ambiguous legacy ownership return typed precondition blockers. Those
  states require a return, delivery correction, payroll correction, or manual
  production correction workflow instead of evidence deletion.

## New Sales Form Shelf Product Search Contract (2026-08-06)

- `newSalesForm.getShelfProductIndex` returns visible shelf products with
  `id`, `title`, `unitPrice`, category ids, and a compact active parent/child
  `categoryPath`. Full image/detail hydration remains on
  `newSalesForm.getShelfProductDetails` after selection.
- Shelf visibility resolves each category's effective ancestry. A child-linked
  product is hidden when an ancestor is archived even if the product's
  denormalized `parentCategoryId` is null; dealer allowlists evaluate the
  derived breadcrumb as well as raw category ids.
- Dashboard and dealership clients compile this cached projection once and use
  the package-owned matcher locally. The dealer route filters products through
  its category allowlist before returning any searchable title/category data.
- `newSalesForm.searchShelfProducts` uses the same matcher for typed fallback
  search. It applies active product/category visibility, builds per-term title
  or category predicates, and merges exact-title (1), contiguous-phrase (100),
  structured measurement-anchor (250), and general coarse (up to 250) stages
  before structural matching and deterministic in-memory ranking. The merged
  pool is capped at 601 unique candidates; selected visible ids are hydrated
  and appended even when the typed query itself produces no candidates.
- Search is case/diacritic insensitive, ordinary word order is irrelevant, and
  dimensions/fractions are structured groups. `x`, `X`, and `×` are connectors
  only inside a dimension. A standalone hyphenated partial such as `5-0`
  matches either exact side of a compiled dimension or a mixed-fraction prefix,
  so it can find `5-0X6-8` and `4-9/16` without accepting unrelated independent
  digits. Price and edit-distance fuzzy matching are not part of this contract.

## New Sales Form Adjustment Contract (2026-08-04)

- Adjustment preview/proposal inputs reuse the complete typed new-sales-form
  snapshot plus `reason`, manual approval channel/recipient metadata, and the
  current persisted `version`.
- The server reloads the baseline and commitment projection; client-supplied
  before values, payment totals, wallet results, and operational floors are
  never authoritative.
- A commitment-protected direct save that changes quantity fails with
  `PRECONDITION_FAILED` and message code `SALES_CHANGE_REVIEW_REQUIRED` unless
  `approvedAdjustmentId` matches the exact approved source/proposal.
- Settlement returns `amountDue`, `walletCredit`, and effective payment after
  credit. Increases never include an automatic charge.
- Existing sale items have stable fallback UIDs of `sales-item-<id>`; new
  unsaved lines retain session-generated UIDs.
- Approval tokens are returned only when the proposal is first created and are
  accepted only by the token-scoped public approval procedures.

## New Sales Form Edit Identifier Compatibility (2026-08-12)

- New internal dashboard documents returned by `newSalesForm.saveDraft` and
  `newSalesForm.saveFinal` persist and return the legacy identity contract:
  `slug === orderId`, preserving the original casing and omitting `order-` or
  `quote-` prefixes. This applies only when creating a new office order/quote;
  saves of existing documents preserve their current slug.
- Storefront checkout/inquiry saves retain type-prefixed slugs, and dealer
  portal saves retain their separate DPP identity contract.
- `newSalesForm.get({ type, slug })` treats the `slug` input as an edit-route
  identifier. It first resolves an active document by canonical `slug`, then
  falls back to the visible `orderId` for legacy bookmarks and form-surface
  redirects that preserve an order or quote number.
- Canonical slug resolution retains priority if a slug could collide with a
  different document's visible number. The requested document type and
  non-deleted guard apply to both lookup paths.
- Existing type-prefixed new-form slugs remain valid and are not migrated.

## New Sales Form Autosave Identity (2026-07-31)

- The bootstrap `new-*` version is the stable identity of an unsaved office
  order/quote draft until the first persistence response assigns a sales id and
  slug.
- `newSalesForm.saveDraft` persists that value as
  `meta.newSalesForm.draftKey`. A later payload with no sales id/slug and the
  same draft key reuses the existing non-dealer record and its current version
  instead of creating another order.
- The response shape is unchanged. Clients still replace the draft identity
  with the returned `salesId`, `slug`, and `version` immediately.

## New Sales Form Adoption (2026-07-30)

- `newSalesForm.adoptionPing` is an authenticated mutation accepting only
  `surface: new|legacy`, `type: order|quote`, and `mode: create|edit`.
- The mutation records a bounded `PageView.group` and does not accept a slug,
  order id, quote id, customer id, URL, or arbitrary metadata.
- `newSalesForm.adoption` accepts `days: 7..90` and returns preference totals,
  new/legacy view totals and unique-user totals, observed unconfigured users,
  per-user activity, and recent preference decisions.
- `updateMySalesFormPreference` is a dashboard server action for the current
  authenticated user. It persists `NEW|LEGACY`, appends an event, and refreshes
  the versioned user-bound cookie.
- `recordLegacySalesFormOnceAction` appends one-time legacy-use evidence without
  creating a preference row or cookie.

## Sales dashboard and performance reports

- `salesDashboard.report` is an additive protected query that accepts the
  shared inclusive sales dashboard period, optional representative/channel
  filters, and one governed report type:
  `performance-summary | orders-ledger | sales-reps | products |
  quote-activity | customers`.
- The response is a typed workbook contract with title, slug, relevant row
  count, columns, typed cells, and ordered sheets. Every report includes
  `Report Context` and `Summary`.
- Grouped representative/customer workbooks include source orders; performance
  summary includes trend, channel, representative, and source-order sheets;
  product performance includes source line items.
- Money, count, percentage, and date cell types remain explicit so the browser
  can create numeric and date-aware Excel cells.
- Quote activity does not expose an inferred conversion metric.
- More than 10,000 relevant source records returns `BAD_REQUEST`; the API never
  labels a truncated workbook as complete.
- Payment, refund, application, collection, and receivables workbooks remain
  owned by the separate Sales Finance contracts.
- `salesDashboard.salesTaxReport({ from, to })` is a separate manual workbook
  query. Both values are inclusive date-only `America/New_York` business dates;
  the server rejects reversed/future ranges and queries
  `[startOf(from), nextDay(to))` in UTC.
- Tax report source rows are immutable `SalesTaxLedgerEntry` snapshots ordered
  by `recognizedAt`, then ledger id. Initial entries are created only for
  active, fully fulfilled orders with an actual delivery/pickup/completion tax
  point. Order creation and payment dates never select the reporting period.
- Recognition snapshots persist invoice total, gross/exempt/taxable amounts,
  state tax, surtax, and total tax in integer cents. Full, partial, zero, or no
  payment does not change inclusion after recognition and does not create a
  second entry.
- The workbook returns `Report Context`, `Florida Summary`, `Sales Tax`, and
  `Recognition Audit`. The detail columns are exactly Order #, Customer Name,
  Total, and Tax; the 10,000-entry completeness guard rejects rather than
  truncates.

## Sales Finance

- Dashboard URL payment-date presets are normalized through the shared date
  filter before calling the existing date-only Sales Finance API inputs. Table,
  summary, analytics, and report callers consume the same normalized range;
  the API schema remains unchanged.

- `salesFinance.transactions`, `salesFinance.summary`,
  `salesFinance.analytics`, `salesFinance.report`, and
  `salesFinance.transactionDetail` are protected, additive contracts for the
  parallel `/sales-book/finance` workspace.
- The list defaults to the last 30 calendar days and accepts search, inclusive
  `YYYY-MM-DD` bounds, canonical payment methods, raw statuses, exception codes,
  application statuses, sales-rep/customer ids, `all | review` tab, bounded
  20-100 page size, offset cursor, and typed sort tuple.
- List and detail rows use the shared `@gnd/sales/payment-system` projection.
  They expose received, principal, fee, refunded, net, applied, unapplied, and
  overapplied amounts plus application status, review exceptions, customer,
  invoices, sales reps, payment reference, and recorder.
- Customer names prefer wallet `businessName`, then wallet personal `name`, then
  deduplicated associated order customer/billing names.
- The summary uses the same projected rows and money helpers as the ledger; it
  returns canonical totals, counts, period bounds, and method totals.
- `salesFinance.analytics` accepts the shared filters plus the active
  `all | review` tab and returns continuous daily/weekly/monthly collections
  buckets, gross-receipt method mix, and review age/reason distributions.
  Analytics periods are bounded to ten years.
- `salesFinance.report` accepts the shared filters plus
  `payments | payment-methods | applications | exceptions | customers`. It
  returns typed workbook metadata and sheets for client-side `.xlsx`
  generation. Every workbook includes Report Context and Summary; grouped
  method/customer reports include Source Payments. More than 10,000 matching
  payments fails with `BAD_REQUEST` rather than returning a partial report.
- Detail reads are restricted to non-deleted transactions linked to sales
  payments, Square payments, or refunds.
- `salesFinance.receivables` and `salesFinance.receivablesSummary` are
  additive, read-only contracts over open Sales Orders. They accept search,
  optional inclusive `YYYY-MM-DD` due-date bounds, and
  `current | 1_30 | 31_60 | 61_90 | 90_plus` aging filters. The list adds
  bounded 20-100 page size, offset cursor, and typed sort.
- Receivable rows expose invoice/customer/sales-rep identity, invoice and due
  dates, payment term, canonical invoice/paid/outstanding money, stored balance,
  reconciliation difference, aging, status, and payment applications.
- Receivable payment applications treat legacy `success`, `completed`, and
  `paid` statuses as successful. A positive-total legacy order with no payment
  rows and an explicit stored zero balance is treated as paid and excluded from
  receivables; partial or positive stored balances do not override the payment
  projection.
- `salesFinance.receivableDetail` returns the same canonical row for one visible
  order. `salesFinance.receivablesReport` accepts the shared receivables filters
  plus `receivables-aging | receivables-customers`, returns typed workbook
  sheets, and rejects more than 10,000 matching invoices.
- `salesFinance.transactionDetail` includes raw/effective review state,
  reconciliation status, and append-only history. `reconciliationStart` records
  the current exception fingerprint and evidence; `reconciliationResolve`
  requires an open matching session, a typed resolution, and a 10-character
  evidence note. A matching resolution suppresses Review, while changed source
  evidence makes it stale and reviewable again.
- `salesFinance.resolutions` and `salesFinance.resolutionsSummary` expose the
  existing Sales Resolution candidate projection behind the Finance read
  boundary. The list accepts the existing resolution filters, pagination, and
  direct-field sort contract.
- `salesFinance.resolutionSyncBalance` accepts a positive sale id plus a
  minimum 10-character audit note, invokes the canonical balance repair, and
  records authenticated before/after evidence.
- `salesFinance.resolutionPayment` accepts the canonical payment-resolution
  input plus a minimum 10-character audit note. It supports guarded cancel and
  refund actions through the existing wallet resolution domain operation.
- `salesFinance.adoptionPing` records authenticated surface-level `PageView`
  evidence for Payments, Review, Receivables, Resolution, or legacy Accounting
  without storing filters or customer/payment identifiers.
  `adoptionReadiness` returns rolling 30-day activity and explicit readiness
  gates. It never authorizes an automatic legacy redirect or deletion.
- No database schema or legacy `sales.getSalesAccountings` response was changed
  for this contract. See `.brain/features/sales-finance.md`.

## Sales Customer Dealership Partnership Summary

- `DealerPartnershipState` is `ELIGIBLE | INELIGIBLE | INVITE_PENDING |
  INVITE_SENT | INVITE_OPENED | INVITE_FAILED | INVITE_EXPIRED |
  CAMPAIGN_INACTIVE | APPLICATION_PENDING | APPLICATION_DENIED |
  APPLICATION_APPROVED | DEALER_ACTIVE | DEALER_SUSPENDED |
  DEALER_RESTRICTED`.
- `DealerPartnershipSummary` includes the state/label/blocking reason, active or
  attributed campaign, latest invitation source/provider-attempt dates/sender,
  application details, dealer status, `canSend`, `canResend`, and `retryAt`.
  It never returns a raw invitation token or token hash.
- Precedence is dealer account, application, latest invitation, eligibility.
  Sent/opened rows expose a 24-hour retry boundary; pending rows become stale
  after ten minutes; failed/skipped/expired/inactive-campaign rows have no
  additional resend delay when a current active campaign exists.
- `dealerProgram.sendCustomerInvitation` accepts `{ customerId: positive int }`
  and returns `{ invitationId, campaignId, deliveryStatus }`. `SENT` means the
  provider accepted the message, not that inbox delivery was confirmed.
- Direct invitations require an active in-window campaign, office-owned
  non-deleted customer, syntactically valid customer email, no linked dealer or
  dealer-email conflict, and no non-reset application. Manual selection bypasses
  only campaign audience targeting.

## Purpose
Tracks important request/response contracts and shared schema boundaries.

## Current Notes

- Shared document caller contracts:
  - Browser attachment writes use `storage.upload` with a declared
    `inbound-documents` or `dispatch-documents` context, filename, allowed MIME,
    and canonical base64. The response includes URL, pathname, size/type, and
    `storedDocumentId`.
  - `storage.delete` accepts one pathname and returns `{ deleted }`; it never
    accepts a client-selected owner or storage token. Deletion repeats
    authenticated canonical owner/uploader checks plus the browser-staging
    source/key/status. Consumed or non-browser documents cannot be removed.
    The server compare-and-set claims the exact staged row before provider
    deletion and fences restore/tombstone by the delete claim id.
    Note/inbound/activity persistence validates explicit current-user canonical
    paths after adoption/claim and rejects deleting/deleted/failed states.
    Unknown legacy path-only blobs return `deleted = false`; physical cleanup
    requires trusted ownership established by a separate backfill/migration.
  - `user.uploadDocumentAsset` accepts employee document title/description/
    expiry plus validated file data and atomically returns the saved feature
    row with its canonical document id.
  - `saveDocument` derives its compatibility URL from an owned, ready
    `StoredDocument` when `storedDocumentId` is present. Update identity is
    `{ id, userId, deletedAt: null }`.
  - `dispatch.signPackingSlip.signature` is a bounded PNG data URL for new
    writes. Legacy URL values remain readable but cannot be submitted as a new
    signature. A per-dispatch request id owns the upload lease; the registered
    document id is checkpointed before packing, and the packing transaction
    records `packingSignoff.status = "domain_completed"` atomically. The
    five-minute completed re-sign window is enforced server-side. A later call
    can reconcile post-commit document promotion without replaying packing.
    Future/invalid completion timestamps never open the re-sign window, and an
    expired uploaded lease retires its exact non-current document.
  - Dispatch proof response/meta includes canonical signature and attachment
    document ids beside legacy-compatible pathnames. A different request is
    blocked during the active 15-minute proof lease and may take over after the
    lease expires. The request id is bound to a SHA-256 proof-content
    fingerprint; same-id retries with different bytes conflict. Registration
    and the document-id checkpoint share one transaction callback, with Blob/
    canonical compensation on failure and completed-state fencing for late
    retries. Attachment client ids are unique per request; legacy partial
    checkpoints without a fingerprint require a new request id.

- Dealership recruitment and fulfillment contracts:
  - Dealer-owned customers default to `PRIVATE`; `SHARED` enables read-only
    office discovery but never unrelated office-origin sales.
  - Delivery/ship submission requires and persists an immutable customer name,
    email, phone, address, and ZIP recipient snapshot.
  - Sales email producers accept a structured `dealerProgramBanner` with
    content, placement, campaign/invitation attribution, and opaque URL.
  - The shared send-time resolver treats profile and individual targets as a
    union and excludes dealer-owned customers, dealers, mismatched recipients,
    deleted/ineligible customers, and every non-reset application.
  - Random invitation tokens are stored only as SHA-256 hashes, expire after 30
    days, and submit one application idempotently. Any application suppresses
    later banners until explicit Super Admin reset.
  - Standard/composed quote/invoice emails and payment reminders are eligible;
    receipts, dispatch/failure/security, and dealer-lifecycle messages are not.
- Dealership quote-to-order contracts:
  - `dealerPortal.saveQuote` rechecks dealer ownership, quote type, soft-delete
    state, and the latest active `make_order` request in its transaction. A
    `pending`, `approved`, or `rejected` request returns `CONFLICT` with an
    actionable lock reason before customer resolution, pricing, item, or order
    writes.
  - `dealerPortal.requestQuoteOrder` is dealer-authenticated, dealer-owned, and
    idempotent for an existing pending request. Its notification payload includes
    request id, sale id, quote number, dealer/customer labels, and request time.
  - `dealer_sales_request` produces an in-app activity and an employee email.
    The email action opens `/sales-rep?tab=requests&requestId=<id>`.
  - `sales.approveDealerSalesRequest` requires delivery-cost review for delivery
    and ship requests, preserves the structured sales-form snapshot, returns an
    already-approved result on repeat work, and separates internal/GND payment
    context from the dealer's customer receivable.
  - `dealerPortal.updateCustomerPaymentStatus` changes only the active dealer's
    customer ledger and writes history. It never clears `DealerSales.dueAmount`.
  - Dealer sales list/detail payloads expose `officeAmountDue` for the
    dealer-to-GND payable, `amountDue` for the dealer's customer receivable,
    `deliveryOption`, and
    `fulfillmentStatus: "preparing" | "ready" | "completed"`. Pickup/delivery
    relations remain private. The projection uses only order-grain status,
    `SalesOrders.deliveredAt`, or a non-deleted completed pickup; one partial
    dispatch and legacy production completion cannot promote the whole order.
  - Dealer next-step guidance gates `Pay GND` only on `officeAmountDue`.
    A null/invalid GND payable produces review guidance rather than paid
    guidance. Customer balance does not block fulfillment guidance, and only
    the typed order-level projection can produce “ready” or “complete” wording.
  - Dealer print access accepts `pricingMode: "customer" | "internal"`.
    Explicit modes are part of the print snapshot document identity, so cached
    customer and internal documents cannot collide.
  - Sales order filtering accepts optional
    `salesChannel: "dealership" | "office"`; dealership means
    `dealerAuthId > 0`, while office includes null and legacy zero ownership.
- WWW client query invalidation contract:
  - Successful browser tRPC mutations pass through the global TanStack `MutationCache.onSuccess`, which resolves a typed mutation route from the tRPC mutation key and emits the route's registered query events.
  - Mutation results/variables may resolve affected sale references, and mutation options may add `meta.queryEventScope`; mutation options may also add typed `meta.queryEvents: QueryEventName[]`, while `meta.queryEvents: false` opts out of automatic route events.
  - Query events own typed tRPC path/exact/infinite targets in `apps/dashboard/src/lib/query-events/registry.ts`; Sales Overview detail reads use exact `{ orderNo, salesType }` keys when scope is available, while lists/summaries/dashboards/filters/page tabs remain broad. Missing scope falls back to broad detail invalidation.
  - Events reach the initiating tab and other open GND tabs in the same browser via `BroadcastChannel`. This is not a multi-device or server-originated realtime contract.
  - Query invalidation errors are logged independently and never change a successfully committed mutation into a mutation failure.
  - `salesPaymentProcessor.applyPayment` returns `appliedSales: Array<{ salesId, orderId, amountApplied, remainingDue }>` for successful office/customer-portal payments. Pending terminal setup returns an empty array and emits no sales event.
  - `checkout.verifyPayment` returns `appliedSales: Array<{ salesId, orderId, salesType }>` after completed settlement so online customer payments can invalidate the affected Sales Overview queries; pending verification returns no affected sales event.
  - Inventory dispatch/fulfillment mutation results attach `sale: { id, orderId, type } | null` when a sales order is known so the client can invalidate that exact Sales Overview.
  - `sales.markLatestPaymentReviewed` returns its related order `{ id, orderId, type }` with the reviewed payment result.
  - `sales.markPaymentsReviewed({ salesIds, note? })` accepts 1-100 positive sales ids, deduplicates them, and returns `{ reviewed, skipped }`. Each reviewed row contains `{ paymentId, salesId, orderId, type }`; each skipped row contains `{ salesId, reason: "no_payment_needs_review" }`. The Sales Orders batch caller suppresses per-mutation automatic events and awaits one coalesced `sales.payment.changed` event before clearing selection and closing the menu.
- Shared schemas and DTOs live across `apps/api/src/schemas`, `apps/api/src/dto`, and shared packages.
- Inventory import source review contract:
  - `inventories.inventoryImportSourceReview({ limit?, inventoryIds? })` is protected and
    bounded to 200 rows. It returns source-labeled imported inventory
    candidates outside the active sales-settings scope or with incomplete/
    orphaned source labels.
  - Each candidate includes source step/component labels, standard-vs-custom
    classification, category/item identity, operational usage counts, and a
    status of `archive_candidate`, `custom_review`, or `protected`.
    Positive stock, active sales line references, active allocations, open
    inbound demand, or storefront publication always protect a row from
    archive recommendations. Custom rows remain explicit review exceptions
    even when otherwise unused; the endpoint is read-only and performs no
    archive or repair mutation. `inventories.archiveInventoryImportSourceCandidates`
    is the corresponding protected mutation: it accepts 1-200 positive
    inventory ids, defaults to `apply: false`, re-runs the same source-safety
    classification inside a transaction, soft-archives only unused standard
    `archive_candidate` rows, and queues the existing inventory-to-Dyke sync
    for confirmed writes. Custom, protected, missing, or stale rows are
    returned as skipped evidence. Source archive apply requires Super Admin.
  - `inventories.applyInventoryImportSourceDisposition(...)` is the Super
    Admin-only explicit retain path for a reviewed row that should not be
    archived. Input includes
    the reviewed category/source-label baseline, an active target category, and
    `retain_as_inventory` or `retain_as_custom`. Apply requires the target to
    remain in the active route graph with the same `productKind`, moves the row,
    clears both legacy source UIDs, sets custom visibility from the disposition,
    and records the authenticated actor plus before/after state in `Event`
    inside the same transaction. Changed baselines and invalid targets return
    skipped evidence; projection queue failure does not roll back the audited
    retained ownership change.
  - Applied results include `syncQueued`, nullable `syncRunId`, nullable
    `projectionDiagnosticId`, and `projectionDiagnosticRecorded`. The API
    persists either the queued Trigger identity or a retryable `START_FAILED`
    diagnostic after the package-level ownership transaction completes.
  - `inventories.applyInventoryImportSourceDispositionBatch({ items })` accepts
    1-25 unique single-row inputs. Rows execute sequentially as independent
    guarded transactions and return ordered per-row results plus
    `appliedCount` / `skippedCount`; applied rows receive the same projection
    diagnostic enrichment as the single-row route.
- Inventory import retained-item projection contract:
  - `inventories.inventoryImportProjectionHistory({ limit? })` is Super
    Admin-only, defaults to 8, is capped at 20, and returns only bounded
    `sync-inventory-to-dyke` diagnostics tagged with
    `type=inventory-import-projection`.
  - Each row includes normalized `inventoryId`, nullable disposition audit and
    retry-parent ids, actor/run lifecycle fields, and `canRetry`. Queue/runtime
    failure, cancellation, and stale statuses are retryable only while the
    diagnostic remains unreviewed. Response `meta` reports bounded returned,
    queued, succeeded, failed, and retryable counts for control-center health
    checks; these counts describe the returned window, not all-time totals.
  - `inventories.retryInventoryImportProjection({ diagnosticId })` verifies a
    retryable tagged diagnostic and active inventory row, claims the exact
    diagnostic once through `reviewedAt`/`reviewedById`, and returns `queued`,
    `queue_failed`, or a stable skipped reason. Every attempted retry creates a
    new linked diagnostic when diagnostic persistence is available.
- Inventory import category cleanup contract:
  - `inventories.inventoryImportCategoryCleanupReview({ limit?, categoryIds? })`
    is protected, defaults to 50 rows, and is bounded to 100. It returns only
    active inventory categories still mapped to Dyke steps outside the active
    sales-settings route graph.
  - A category is `ready` only when it has zero non-deleted inventory children.
    Otherwise it is `blocked` with active standard/custom child counts, keeping
    item-level source review and retained/archive disposition ahead of category
    cleanup. The review also returns at most 100 active target categories for
    the retained-row control.
  - `inventories.cleanupInventoryImportCategories({ categoryIds, apply? })` is
    Super Admin-only and dry-run by default. Apply re-resolves the route graph
    and rechecks the no-live-child invariant inside the transaction,
    soft-archives only confirmed empty stale categories, and queues the
    category-level Dyke projection. Archived categories are excluded from
    subsequent stale-scope counts.
- Inventory import run history contract:
  - `inventories.runFullImport(...)` requires Super Admin and returns the
    Trigger run handle plus `diagnosticRecorded`. A successful Trigger dispatch
    remains successful when diagnostic persistence fails, so an observability
    write cannot conceal a queued import.
  - Dispatch records `TaskRunDiagnostic` identity with the authenticated actor,
    task, scope, strategy, compare/reset intent, category selection, and Trigger
    run id. Trigger start failures are recorded separately when possible while
    preserving the original dispatch error.
  - `inventories.inventoryImportRunHistory({ limit? })` is protected, defaults
    to eight rows, is bounded to 20, and returns only full inventory import and
    inventory import test tasks. While the control center monitors a live
    Trigger run, it finalizes the diagnostic from the terminal run status.
- Sales production query contracts live in `packages/sales/src/schema.ts`.
  - `updateSalesControl.cancelDispatch` accepts the legacy `dispatchId` or a batch `dispatchIds` list. Batch cancellation constrains every ID to `meta.salesId`, requires the complete requested set to match, updates all selected dispatches, and resets the parent sale in one transaction. Lifecycle notifications are emitted only after that transition completes; notification failures are logged and do not reject the committed mutation.
  - Automatic status-column production completion writes `submitProduction.submissionSource="sales_mark_as_completed"`. Its rollback uses `deleteSubmissions.automaticCompletionSalesId`, requires that ID to equal `meta.salesId`, and rejects when no tagged automatic completion exists, preserving legacy/manual production submissions.
- Shared page-tab contracts:
  - `pageTabs.list({ page, includeInactive? })` returns tabs visible to the current user: their private tabs plus public/general tabs for the normalized page path. By default it returns only active tabs; `includeInactive: true` also returns manageable draft tabs for the edit modal.
  - `pageTabs.create({ page, title, query, setDefault?, visibility? })` stores normalized query strings, preserving reusable page state such as `sort` while stripping pagination/internal keys including `_page`, `cursor`, and `size`.
  - `visibility` defaults to `"private"`; `"public"` creates a general tab visible to all users on that page.
  - `pageTabs.update({ id, title?, query?, setDefault?, visibility?, active?, tabIndex? })` lets any visible tab be set/unset as the current user's default through `PageTabIndex`, while title/query/visibility/active edits require management access. Draft state is stored as `PageTabs.meta.active === false`, so no migration is required.
  - `pageTabs.reorder({ page, ids })` persists the current user's drag order through `PageTabIndex.tabIndex`, including public tabs the user can see.
  - `pageTabs.delete({ id })` soft-deletes a manageable tab and clears tab-index/default rows for that tab.
  - Returned tab rows include `visibility`, `canManage`, `active`, optional `count`, per-user `default`, `index`, and `indexId`.
  - Count badges are registry-backed per page. `/sales-book/orders` uses the Sales Orders filter contract, defaults saved-tab counts to `showing="all sales"` like the page, and uses the same distinct clean-payment grouping for `paymentReview=needs_review`; `/community/unit-invoices` uses `whereUnitInvoices`. Additional count adapters currently cover `/sales-book/quotes`, `/sales-book/customers`, `/sales-book/dealers`, `/hrm/employees`, `/hrm/contractors/jobs`, `/community/projects`, `/community/project-units`, `/community/templates`, `/community/customer-services`, and `/community/unit-productions` by parsing saved tab queries through each page's existing query schema and count/where helper. Pages without a count adapter still render tabs without a count.
  - WWW only renders the inline page-tab strip when there is something visible to show: at least one saved tab or a current saveable tab query with an action node. Empty URL state and pagination/internal-only keys serialize to an empty saved-tab query, and the rendered strip self-hides when its action resolves to no DOM content, so pages with no saved tabs and no active filter/search/sort do not leave an empty bordered tab shell before the search input.
  - WWW invalidates page-tab counts through the typed `PAGE_TAB_PATHS` registry and normalizes every invalidation target with `normalizePagePath`, so callers may refresh the current page, a mapped key such as `orders`, or a raw path while updating both visible tabs and `includeInactive` edit-modal tabs. `usePageTabs()` / `usePageTabsInvalidation()` default no-arg invalidation to the current `usePathname()` value through the shared `createPageTabsInvalidation` factory, while `invalidate(...keys)` supports typed page keys and `invalidatePath(...paths)` supports raw/custom paths. Empty raw paths are ignored, and raw paths with query strings, hash fragments, extra whitespace, missing leading slashes, full app URLs, or trailing slashes are normalized to path-only values before deduped invalidation. The page-tabs API router mirrors the same path-only normalization before list/create/update/reorder/default/count work so saved tabs cannot split by URL variant. The registry currently includes Sales Orders/Quotes/Customers/Dealers, Employees, Contractor Jobs, Community Projects/Units/Invoices/Templates/Customer Services/Productions.
  - Saved-tab navigation appends the metadata-only `tabName` query value. It is excluded from normalization, equality checks, count inputs, and persistence. A named tab remains selected only while its complete saved baseline is present in the URL; stale, renamed, deleted, or deactivated selections clear `tabName` through a shallow replace.
  - Search fields are never a valid saved baseline. WWW excludes `q`, `search`, `_q*`, and the page-configured search key, hides the save action as soon as search is non-empty, and the create/update API rejects requests that still contain an active search field. Existing stored tabs containing search remain readable for compatibility.
- Sales Orders filter contract:
  - `archiveScope=archived` scopes the canonical list, summary, count, saved
    tab, and filtered export input to non-deleted rows with
    `SalesOrders.archivedAt` set. With no archive scope, the same surfaces use
    non-deleted rows with `archivedAt=null`. Sales Bin remains deletion-only and
    ignores archive scope.
  - `sales.setSalesOrdersArchived({ salesIds, archived })` accepts 1-100 unique
    positive IDs and is protected by `editOrders`. It changes only non-deleted
    order-type rows, returns `{ changed, skipped }`, and classifies unavailable
    rows as `missing`, `deleted`, `already_archived`, or `already_active`.
    Changed rows write Sales History transactionally; repeat commands are
    idempotent and produce no extra history.
  - `sales.getOrders`, `sales.getOrdersSummary`, and `filters.salesOrders` accept `paymentReview=needs_review` as an explicit filter for the clean-payment review queue.
  - `sales.getOrders`, `sales.getOrdersSummary`, and the shared sales query accept `inbound=none | AVAILABLE | ORDERED | PENDING ORDER | pending | in_progress | completed | issue_open | closed`. Manual statuses match only when no active inventory shipment owns the order; inventory statuses match through active, non-cancelled demand/shipment links. `filters.salesOrders` exposes the same values and labels.
  - `sales.getOrders.data[].inventoryApplicability` prefers the durable `SalesInventoryProjectionState` marker, but a missing marker no longer means `not_synced` when active inventory sale lines already contain required positive-quantity components. In that legacy/backfill shape, the current component count supplies conservative applicability evidence; rows with neither a marker nor required component evidence remain `not_synced`.
  - The `Invoice` column sort is invoice amount (`grandTotal`) again; payment review filtering is not inferred from `sort=latestPaymentAt.*`.
  - Payment Review defaults to latest clean-payment ordering when no explicit sort is supplied; explicit sorts remain part of the filtered query and are saveable in page tabs.
  - `specialOrderScope=special_orders` selects orders whose declaration is Yes.
    `specialOrder` accepts `signed | not_signed | expired | signature_pending |
    reapproval_required | declined`; every status value independently implies a
    Yes declaration. `not_signed` is the broad inverse of
    `CUSTOMER_APPROVED` among declared Special Orders, and `expired` checks the
    current active request's `expiresAt` boundary.
  - The Special Order scope/status fields are shared by list, summary, count,
    saved-tab, and export inputs so those surfaces resolve the same `whereSales`
    predicate. Invalid values are rejected by the URL/API schemas.
  - `sales.getOrders.data[].specialOrder` includes derived `linkState` and
    `currentRequestExpiresAt` for the current request. The list obtains this
    metadata through one bounded request lookup for the page.
- Sales Resolution Center contract:
  - `sales.getSalesResolutions` accepts the existing resolution filters plus pagination and `sort`.
  - `status` supports the existing resolution filter metadata values, including `Resolved`, `Resolved Today`, and `Unresolved`.
  - `customer.name` is part of the WWW URL filter schema so the existing `filters.salesResolutions` customer filter can round-trip through saved/search filter state.
  - Server sorting is intentionally limited to direct `SalesOrders` fields: `orderId`, `createdAt`, `grandTotal`, and `amountDue`; unknown sort fields fall back to `createdAt.desc`.
  - Computed resolution fields such as conflict type, projected due, and payment count are derived after candidate order/payment projection and are not server-sortable under the current query model.
- Short Links list contract:
  - `shortLinks.list` accepts `q`, `includeInactive`, `page`, `size`, `cursor`, and `sort[]`.
  - Cursor pagination uses an offset-style cursor so `/settings/short-links` can consume the same infinite-scroll table contract as other restarted table pages.
  - Sort values are mapped to safe Prisma fields for `slug`, `targetUrl`, `clickCount`, `lastClickedAt`, `expiresAt`, `active`, and `createdAt`; unknown sort fields fall back to `createdAt.desc`.
- Master password login audit contract:
  - `masterPasswordLoginAudits.list` accepts optional `q`, `platform`, `includeCleared`, `page`, and `size`; rows include target-user snapshots, platform/app surface, IP address, optional two-letter ISO country code, browser/user agent, safe session id, login time, and archive metadata.
  - Country search matches the stored normalized `countryCode`; the auth writer accepts only valid Vercel `x-vercel-ip-country` or Cloudflare `cf-ipcountry` two-letter values and rejects unknown/malformed codes.
  - `masterPasswordLoginAudits.clear` accepts optional explicit `ids` or active `q`/`platform` filters and archives matching uncleared rows rather than deleting them.
- Web bug reporting contracts live in `apps/api/src/schemas/bug-reports.ts`:
  - `BUG_REPORT_STATUSES = NEW | IN_REVIEW | IN_PROGRESS | NEEDS_INFO | FIXED | CLOSED`
  - `BUG_REPORT_CAPTURE_TYPES = VIDEO | SCREENSHOT`
  - `BUG_REPORT_TRANSCRIPTION_STATUSES = NOT_REQUESTED | PENDING | COMPLETED | FAILED`
  - `BUG_REPORT_MAX_DURATION_MS = 90_000`
  - `BUG_REPORT_MAX_UPLOAD_SIZE_BYTES = 250MB`
  - `BUG_REPORT_MAX_AUDIO_DURATION_MS = 600_000`
  - `BUG_REPORT_MAX_AUDIO_SIZE_BYTES = 25MB`
  - `/api/bug-reports/upload` implements Vercel Blob `handleUpload()` for browser uploads using server-only `BLOB_READ_WRITE_TOKEN`; token generation requires `can.submitBugReport`, accepts only paths under `bug-reports/<currentUserId>/`, allows `image/*`, `video/*`, `audio/*`, and `application/octet-stream`, caps upload size at 250MB, rejects overwrites, and issues 10-minute tokens
  - `bugReports.create` accepts optional `captureType` (`VIDEO` default), optional `description`, optional `currentUrl`, optional `userAgent`, optional video `durationMs`, `microphoneEnabled`, an uploaded primary Vercel Blob descriptor `{ url, pathname, contentType?, size, filename? }`, and optional `audio` evidence `{ upload, durationMs?, transcriptionStatus?, transcriptionText?, transcriptionProvider? }`
  - primary upload validation requires object keys under `bug-reports/`, size at or below 250MB, screenshot content type for `SCREENSHOT`, and video-like content type plus duration at or below 90 seconds for `VIDEO`
  - voice-note upload validation requires object keys under `bug-reports/`, size at or below 25MB, duration at or below 10 minutes, and audio-like content type
  - list rows include status, capture type, description, page metadata, duration, microphone metadata, primary evidence metadata, submitter/status-updater summaries, created/updated timestamps, and follow-up count
  - detail rows additionally include follow-ups ordered oldest to newest with author summaries, optional audio document metadata, audio duration, transcription status, transcription text, and transcription provider
  - `bugReports.adminList` accepts optional `{ status }`
  - `bugReports.addFollowUp` accepts `{ bugReportId, body, audio? }` with a non-empty body capped at 5000 characters and the same optional voice-note evidence shape used by create
  - `bugReports.transcribeFollowUp` accepts `{ followUpId }`, requires the owner or Super Admin, requires Groq transcription env config, downloads the follow-up voice note, calls Groq's OpenAI-compatible transcription endpoint, stores completed transcription on the follow-up and audio document, and fills the report/primary evidence description when the submitter did not already provide a description
  - configured GitHub or Jira issue creation runs after bug-report create/transcription; GitHub uses `BUG_REPORT_GITHUB_TOKEN`/`GITHUB_TOKEN` plus `BUG_REPORT_GITHUB_REPOSITORY` or `BUG_REPORT_GITHUB_REPO`, while Jira uses `BUG_REPORT_JIRA_API_TOKEN`/`BUG_REPORT_JIRA_TOKEN`, `BUG_REPORT_JIRA_BASE_URL`/`BUG_REPORT_JIRA_API_BASE_URL`, `BUG_REPORT_JIRA_PROJECT_KEY`, and optional `BUG_REPORT_JIRA_EMAIL`; `BUG_REPORT_ISSUE_PROVIDER=jira` selects Jira when both providers are configured; issue creation stores `externalIssueProvider`, `externalIssueKey`, `externalIssueUrl`, `externalIssueStatus`, `externalIssueError`, and `externalIssueCreatedAt` on the report
  - `bugReports.updateStatus` accepts `{ bugReportId, status }`
- Sales email ledger contracts live in `apps/api/src/schemas/emails.ts` and `apps/api/src/db/queries/sales-email-attempts.ts`:
  - `SALES_EMAIL_ATTEMPT_STATUSES = QUEUED | SENDING | SENT | FAILED | SKIPPED`
  - `emails.salesEmailAttempts` accepts optional `status`, `q`, `salesRepId`, `from`, `to`, `page`, and `size`; responses include rows, pagination metadata, `canViewAll`, and `canResend`
  - row status semantics are immediate provider-result semantics: `SENT` means Resend accepted the send response, `FAILED` means provider send/queueing failed, and `SKIPPED` means the app could not send because required recipient/customer/sales rep email context was missing or email preferences suppressed delivery
  - rows snapshot recipient, customer, sender, sales rep, document/email kind, subject/message, sales ids/order numbers, provider id/status, task run id when known, error text, timestamps, and `originalAttemptId`
  - `emails.resendSalesEmailAttempt({ attemptId })` accepts only a failed/skipped attempt, creates a new linked child attempt, queues the stored retry payload, and leaves the original failed/skipped evidence unchanged
- Task-run diagnostics contracts live in `apps/api/src/schemas/task-run-diagnostics.ts` and `apps/api/src/db/queries/task-run-diagnostics.ts`:
  - `TASK_RUN_DIAGNOSTIC_STATUSES = RUNNING | SUCCEEDED | FAILED | CANCELED | STALE | START_FAILED`
  - `taskRunDiagnostics.list` accepts optional `page`, `size`, `status`, `taskName`, `q`, `entityType`, `entityId`, `from`, and `to`; responses include rows plus pagination metadata
  - `taskRunDiagnostics.register` accepts `runId`, `taskName`, optional title/description/source/environment, optional lightweight metadata, and optional started timestamp
- Operational mutation contract:
  - dispatch, inventory configuration, contractor job, community, and shared
    settings mutations reject unauthenticated calls before business writes;
  - domain mutations additionally enforce the permission/ownership matrix in
    `.brain/plans/2026-07-23-api-public-route-hardening.md`;
  - assigned dispatch lifecycle mutations use the persisted driver id, and job
    self-service uses the persisted contractor id rather than client actor data.
  - `taskRunDiagnostics.startFailure` accepts `taskName`, optional context fields, error message/name, and lightweight metadata; rows are stored as `START_FAILED` without requiring a run id
  - `taskRunDiagnostics.finalize` accepts `runId`, optional observed status (`COMPLETED`, `FAILED`, `CANCELED`), optional error message, optional metadata, and optional finished timestamp; the server retrieves Trigger.dev status before upserting terminal diagnostics
  - `taskRunDiagnostics.markReviewed` accepts a diagnostic `id` and records the reviewing Super Admin
  - task diagnostic metadata is bounded to task/entity context; full task payloads and Trigger public access tokens are out of contract
  - production client toasts use safe status copy; internal error text is stored only in the diagnostics ledger for admin/developer review
- Public quote acceptance contract:
  - `checkout.acceptQuote({ orderId, token })` is the tokenized public customer quote-acceptance mutation used by `/sales/accept-quote/[orderId]`
  - a valid, unexpired quote token copies the quote into a new order inside one checkout transaction, writes `meta.quoteAcceptance` acceptance evidence on both the source quote and created order, then returns the existing payment-context response shape
  - repeat acceptance returns the already accepted order with `alreadyAccepted=true` and does not create another order copy
  - post-commit inventory sync queueing, `quote_accepted` notifications, and accepted-order sales email queueing are best-effort; failures are logged and must not reject a committed acceptance response
- The production workspace now depends on:
  - canonical `tab: "queue" | "reviews" | "completed"` work state and
    `view: "table" | "calendar"` presentation state; legacy
    `tab: "calendar"` normalizes to the Active calendar view
  - production calendar presentation also owns
    `calendarView: "week" | "month"` and validated
    `calendarDate: "YYYY-MM-DD"` URL state
  - `queue`, `due`, `material`, and `sort` workspace filters mapped by the
    shared `@gnd/sales/production-workspace-query` resolver to the existing
    production list input; `sort=due-asc|due-desc` is also controlled by the
    Due Date table header, while `sort=newest|oldest` is controlled by the
    Order Date table header
  - table calendar ranges use `production.dueDate` for active assignment due
    dates and `dateRange` for Sales order creation dates. Worker production
    due-date ranges retain authenticated assignee scoping; both ranges reuse
    the existing shared date-preset and explicit-range input shape
  - `show: "due-today" | "due-tomorrow" | "past-due" | "future" | "unscheduled"` for focused list slices; `future` means incomplete assignments due from tomorrow forward, `unscheduled` means incomplete assignments whose due date is null, and combined views retain the canonical search, queue, material, sort, and cursor inputs
  - `date` and `productionDueDate` accept real ISO `YYYY-MM-DD` values only; invalid legacy URL values normalize away before calendar rendering
  - `sales.productionSummary` returns the canonical page's bounded queue, completed, assignment, due, and review counts without loading alert rows or calendar data
  - production list and summary eligibility accepts either a live produceable
    control with positive canonical `qty` or positive persisted assignment
    quantity linked through a live Sales order item. This prevents a stale zero
    `QtyControl` projection from hiding otherwise valid scheduled work while
    continuing to reject deleted assignments and deleted linked items
  - legacy `sales.productionDashboard` retains `summary`, `alerts`, `calendar`, and `spotlight` buckets for remaining legacy consumers
  - `sales.productionDashboardTasks(input?)` ignores caller worker scope and
    returns the legacy summary/alerts/calendar/spotlight projection for the
    authenticated worker; `sales.productionTasks` applies the same rule to list
    rows. Its worker summary exposes `dueTodayCount`, `unscheduledCount`,
    `pastDueCount`, `futureCount`, and `completedCount`; Completed is calculated
    with the same authenticated assignment-level completion semantics as the
    worker list.
  - worker `production=completed` list pages evaluate completion against the
    authenticated worker's filtered assignments, including finalized
    submission quantity, instead of requiring global order completion
  - `sales.productionCalendar({ from, to, q?, assignedToId?, priority? })`
    returns `days` and `scheduled` for a bounded Week/Month range. Calendar rows
    include order/customer/priority/assignee/status data, collapse same-order/day
    assignments into one card with `assignmentCount`, and cap the raw scheduled
    assignment read at 1,500. Undated work is queried through `sales.productions`
    or `sales.productionTasks` with `show=unscheduled`.
  - `sales.productionCalendarTasks({ from, to, q?, priority? })` returns the
    same calendar shape but ignores caller assignee scope and injects the
    authenticated worker id.
  - material review queue pages apply `q` on the server, return `nextCursor`,
    and include the filtered `total` used by the Review badge
- Customer v2 contracts now include:
  - `getCustomerDirectoryV2SummarySchema = {}` for directory stat cards
  - `getCustomerOverviewV2Schema = { accountNo: string }` for the shared page/sheet customer workspace payload
  - `customer.getCustomerOverviewV2` returns normalized `customer`, `addresses`, `walletBalance`, `general`, and `salesWorkspace` sections so the web UI no longer stitches this from server actions
- Customer create and matching contracts now include:
  - `customers.searchCustomers` returns only active, non-deleted customer
    candidates for create-form matching. Its bounded ten-row result includes
    primary/secondary contact fields, legacy address, profile, active tax
    profiles, explicit net term, dealer owner, and office visibility for the
    suggestion-card detail view; raw customer metadata is not returned.
  - `customers.createCustomer` translates a unique `phoneNo` collision into an
    actionable `CONFLICT` response directing the client to select the matching
    customer or use a different phone number.
- Pickup packing contracts now include:
  - `startDispatchTripSchema = { dispatchId: positive integer, requestId: 8-128
    characters }`.
  - `confirmDispatchPackingSchema = { dispatchId, requestId,
    expectedManifestRevision, replaceExisting, items[1..250] }`; item intent
    carries stable sales/item identity, scalar or LH/RH quantity, and an
    optional bounded note. The server derives actor, assignment, execution
    mode, availability, and notification recipients.
  - `resetDispatchPackingSchema = { dispatchId, requestId,
    expectedManifestRevision }`.
  - Packing command responses include idempotency, resulting status, refreshed
    manifest revision, applied counts/pending report ids, and post-commit
    notification-failure metadata. `STALE_MANIFEST`, idempotency conflicts,
    ambiguous scope, terminal state, and unavailable quantity fail before a
    partial command commit.
  - Protected mobile detail/manifest projections include
    `packingCommandRevision` plus `mobileLifecycle.stage`, risks,
    `pendingPackingReportCount`, action capabilities, and start/packing/
    completion blockers.
  - `sendSaleForPickupSchema = { salesId: number }`
  - `packingListQuerySchema = { tab?: "current" | "completed" | "cancelled" }`
  - `signPackingSlipSchema = { dispatchId: number, receivedBy?: string | null, signature: string, note?: string | null }`
  - `completeDispatchWithProofSchema = { dispatchId: positive integer,
    requestId: 12-100 safe characters, receivedBy?, receivedDate?, note?,
    noteType?: "dispatch" | "pickup", signaturePath: validated drawing path,
    attachments?: Array<{ clientId, fileName, contentType: image/*, base64 }>
    }`; compatibility device time/type fields may be accepted but live server
    time and delivery mode are authoritative. Attachments are capped at five,
    8,000,000 base64 characters each, and 13,500,000 characters combined.
  - Successful completion returns `status: "completed"`, `idempotent`, the
    stored signature/attachment paths, and notification queue status. Repeating
    the same completed request returns idempotent success; a different request
    for a completed dispatch returns `CONFLICT`.
  - packing-list history is scoped by `sales-packing-list` notification membership, while live warehouse work uses normal `queue` delivery status
  - Expo mobile packing uses the same `packingListQuerySchema` tabs and opens the shared dispatch detail screen in a packing-aware mode via route params instead of introducing a second item-detail contract
- Community job form contracts now include:
  - `community.saveJobForm` requires `unit.id` and `unit.projectId` before saving a job unless the payload is a custom job and `jobs-settings.meta.allowCustomProject` is enabled.
  - Website and Expo clients must submit normal jobs against an existing project/unit. `jobs-settings.meta.allowCustomJobs` controls project-linked custom tasks; `jobs-settings.meta.allowCustomProject` controls the separate projectless `Custom Project` path.
  - Projectless `Custom Project` saves must include a non-blank `job.title`; the server trims it, persists it as `Jobs.title`, and job overview responses use it as the project display label.
  - `job.meta.submittedFrom` accepts `"web" | "mobile" | null` for source tracking. No separate submitted timestamp is part of the contract because `Jobs.createdAt` remains the submission time source.
- Contractor payout print contracts now include:
  - `jobs.contractorPayoutOverview` and `print.contractorPayouts` return `description: string | null` and optional `isCustom: boolean | null` on each payout job row, preserving status, amount, payment totals, and structured project/unit fields.
  - `print.contractorPayouts` also returns top-level `companyAddress` for the branded contractor payout cover page.
  - `createPaymentPortal` stores each selected job's description and custom-job flag inside `JobPayments.meta.jobSnapshots[]` so cancelled/reversed payout history can still show what was installed; older snapshots without these fields hydrate them as `null`.
  - The web payout overview and `@gnd/pdf` contractor payout report promote generic custom-job descriptions into the visible job label and use a custom-job fallback instead of misleading `No project / No unit` labels when a custom job has no linked project/home.
  - Contractor payout PDFs keep a branded GND cover page, GND watermark, and cancelled watermark for cancelled payout pages.
- New sales form grouped line contract:
  - grouped service UI lines store row projection in `line.meta.serviceRows`
  - grouped moulding UI lines store row projection in `line.meta.mouldingRows`
  - grouped row projections carry legacy persistence identity where known: `salesItemId`, `hptId` for moulding, `groupUid`, `uid`, `primaryGroupItem`, row qty/price/total fields, and row-level tax/production flags for services
  - API hydration treats DB grouping identity as authoritative and only uses persisted `order.meta.newSalesForm` for current editable row values
  - API save expands grouped projections back into legacy sibling `SalesOrderItems` rows sharing `multiDykeUid`; rows with `salesItemId` update/revive that legacy sibling, while newly added grouped rows without row-level legacy identity create new siblings instead of reusing the grouped parent line id
  - grouped moulding rows also write per-row `HousePackageTools`; rows with `hptId` update/revive that legacy HPT row, while newly added moulding rows without row-level HPT identity create new HPT rows instead of reusing the grouped parent HPT id
  - `newSalesForm.searchServiceSuggestions({ query, limit })` returns unique uppercase service names from saved grouped service rows with `unitPrice`, `usageCount`, and `lastUsedAt`; blank query is recent-first, typed query filters by normalized service name, and the latest observed price wins per service
  - legacy-strategy display summaries include derived credit-card convenience charges in returned/hydrated `summary.grandTotal` and `summary.ccc`; order persistence stores the base sales total and `amountDue` without the derived charge, while `payment_option`, `ccc_percentage`, and display/backfill `ccc` remain available to evaluate printable/payable totals
  - order save payload composition defaults missing `form.paymentMethod` to `Credit Card` before summary calculation, so create/bootstrap mobile records persist payment metadata and C.C.C display values consistently with the visible default
- New sales form history contract:
  - `sales.getSalesHx({ salesNo })` returns only non-deleted `order-hx` / `quote-hx` copies whose `orderId` starts with `${salesNo}-hx`, newest first
  - `newSalesForm.getHistorySnapshot({ type, salesId, historyId })` accepts `type: "order" | "quote"`, verifies the current document and history copy share the same base order number, and hydrates the history copy without exposing its `*-hx` type to the editor
  - history preview is read-only and cannot save, print, export, or add items
  - restoring a snapshot is client-local until the operator explicitly saves; current sales identity, status, inventory status, settings, payment totals/count, and version are preserved while copied line/step/shelf/HPT/door/extra-cost persistence IDs are removed
- New sales form Activity contract:
  - a successful save of an existing order or quote creates exactly one canonical `NotePad` Activity entry in the sale-update transaction, tagged with both `salesId` and visible `salesNo`; initial creation does not create an update entry
  - manual saves use `activity=sales_form_updated`, autosaves use `activity=sales_form_autosaved`, and the entry records the authenticated employee plus quantity/total changes when present
  - creating a new quantity adjustment writes its review Activity in the same transaction as `SalesOrderAdjustment`; reductions use `activity=sales_quantity_reduction_review` and include affected line quantities plus before/after total
  - adjustment idempotency is also Activity idempotency: an existing adjustment response does not append another review entry
- Sales orders list C.C.C display contract:
  - `sales.getOrders` keeps `amountDue` and stored `grandTotal` principal/base-only
  - order rows expose `baseInvoiceTotal`, `displayCcc`, C.C.C-inclusive `invoiceTotal`, principal `amountPaid`, and display-only `displayAmountPaid` / `displayAmountDue` for mobile card adapters
  - order rows expose `inventoryInboundOwnership` with `hasInventoryInbound`, `linkedInboundIds`, compact `linkedInbounds[]` shipment summaries, `linkedInboundCount`, `linkedDemandCount`, `primaryInboundStatus`, and `canUseManualInboundStatus`. Only non-deleted demand linked to non-deleted, non-cancelled inbound shipments counts as active inventory ownership. Canonical orders table inbound cells use this to route inventory-owned rows to the Inventory/Inbounds workspace while preserving the manual inbound status modal for non-inventory-owned rows; inventory-owned rows display the linked inbound shipment status label when exactly one shipment owns the row.
  - when the selected payment option applies C.C.C, the API repairs display C.C.C from `baseInvoiceTotal` and `ccc_percentage`; root `meta.ccc` is treated as a display cache and is ignored when stale or when a non-card method is selected
  - Expo order list cards adapt the flat `sales.getOrders` row into their stable nested mobile view model; quote lists still consume `sales.quotes`
  - legacy `sales.index` / `sales.quotes` DTO rows keep `invoice.total`, `invoice.paid`, and `invoice.pending` principal/base-only while also exposing display-only `invoice.baseTotal`, `invoice.displayCcc`, `invoice.displayTotal`, `invoice.displayPending`, and `invoice.displayPaid` for legacy/mobile quote card and overview surfaces
- Sales print C.C.C footer contract:
  - `print.salesV2` and `/api/download/sales-v2` accept optional `pageBreakMode = "section" | "header" | "fullHeader"` for sales-v2 PDF pagination policy. The default is `header`. Non-default modes are render-time presentation options and bypass stored snapshot streaming so a request for `section` or `fullHeader` does not accidentally receive a cached/default PDF.
  - Sales print presentation defaults are stored at `sales-settings.meta.print` as `{ templateId: "template-1" | "template-2", pageBreakMode: "header" | "section" | "fullHeader", showImages: boolean, headlineFirstPage: boolean }`; missing or invalid settings normalize to V2, compact header pagination, images on, and first-page-only headline.
  - `print.salesV2`, `/p/sales-invoice-v2`, `/p/sales-document-v2`, and `/api/download/sales-v2` carry `templateId`, `pageBreakMode`, `showImages`, and `headlineFirstPage`. Non-default content/template query overrides bypass default stored-PDF streaming, and single-order snapshot reuse requires an exact normalized renderer-config match.
  - `print.salesV2` footer/meta payloads keep stored `SalesOrders.grandTotal` and `amountDue` as principal-only values
  - unpaid card-selected records split principal due from the payable card total using customer-facing labels: `Order Due Amount`, `Estimated Card Fee`, and `Total if Paying by Card`
  - paid and partially paid records use one compact customer summary: `Order Total`, optional aggregated `Card Fees`, `Total Paid`, and principal-only `Balance Due`
  - `Total Paid` equals principal applied to the order plus safely matched recorded card fees; print omits `Card Fees` and does not infer historical fees when exact payment metadata is unavailable
  - transaction-level `Card Payment`, `C.C.C on Card Payment`, `Charged to Card`, and `Paid Toward Order` rows remain available on internal finance/transaction surfaces but are not emitted in customer PDF/preview footers
  - print loads `SalesPayments.meta`, linked `CustomerTransaction.meta`, and linked `SquarePayments.meta` for recorded C.C.C extraction, but shared transaction metadata is ignored when its base amount does not match the printed order's payment row
- Sales overview invoice breakdown contract:
  - overview DTO `costLines` use the same C.C.C/payment state helper as print so the old overview sheet, new overview Finance tab, and overview summary tab render the same labels and amounts without client-side C.C.C calculation
  - unpaid card-selected estimate lines repair C.C.C from the current principal `amountDue` before rendering `Order Due Amount`, `C.C.C`, and `Total Due With C.C.C`; partial/mixed records continue to show only safely matched recorded card-charge metadata
  - `sales.getSaleOverview` includes non-deleted payment rows plus linked transaction/Square metadata for recorded C.C.C extraction
  - `sales.getSaleOverview` is a single-document contract and resolves by exact `orderId` plus sales `type`; list/search-style partial order matching belongs to list endpoints, not the overview fetch
  - order overview rows include `inventoryInboundOwnership` with `hasInventoryInbound`, `linkedInboundIds`, compact `linkedInbounds[]` shipment summaries, `linkedInboundCount`, `linkedDemandCount`, `primaryInboundStatus`, and `canUseManualInboundStatus`. The flag is true when non-cancelled inventory `InboundDemand` rows are linked to active inbound shipment items for the sale, matching the manual inbound-status server guard; deleted or cancelled shipment links no longer keep the order in inventory-owned inbound mode. Overview status badges display the inventory inbound shipment state when inventory owns the status.
  - `sales.getSaleOverview` also returns `overviewItems[]` for mobile/document
    overview surfaces. Each bounded non-deleted sales line now includes `id`,
    display `title`, `subtitle`, `qty`, `total`, `swing`, compact configuration
    steps, and door dimension/handing/no-handle evidence. The overview also
    exposes `customerProfile`, `taxSummary`, `shippingAddressConfigured`, and,
    for orders, `documentReadiness` with `ready`, `on_demand`, `stale`,
    `generating`, or `failed` status. Shipping readiness requires a saved
    shipping-address street field; billing/customer fallback display data does
    not satisfy it. Reading an on-demand document state does not generate a
    PDF. Order views may still prefer dispatch-enriched item rows when dispatch
    data is available. Overview tax/configuration evidence filters soft-deleted
    taxes and form steps before projection.
  - overview payment progress remains principal/order-based; when cost lines expose card-inclusive actuals, both old and new overview surfaces may add `Card Paid` or `Card Pending` alongside the principal paid/pending values
  - mobile overview consumers may use `invoice.displayTotal`, `invoice.displayPending`, and `invoice.displayPaid` for visible card-adjusted amounts, while `invoice.total`, `invoice.pending`, and `invoice.paid` remain the principal/order progress source
  - `sales.updatePaymentMethod({ salesId, paymentMethod })` updates order metadata for unpaid orders only, mirrors the value into `meta.newSalesForm.form.paymentMethod` when present, and rejects fully paid orders whose principal `amountDue` is zero or below
  - changing an unpaid order to a C.C.C-applicable payment method recalculates display/backfill `meta.ccc` from the current principal `amountDue`, not the original order total, so prior payments do not inflate the remaining card-payable estimate
  - overview DTOs expose `salesRepId` alongside the display `salesRep`/initials so client surfaces can distinguish the current owner from eligible transfer targets
  - `sales.salesRepOptions({ salesId })` returns active internal sales/order-capable users with `{ id, name, email, initials, roles }` only when the referenced order or quote is assigned to the signed-in user
  - `sales.transferSalesRep({ salesId, salesRepId, reason?, password })` accepts positive integer ids, an optional note up to 500 characters, and confirmation with either the signed-in owner's account password or the configured, case-sensitive master password; it supports orders and quotes and rejects deleted sales, ineligible targets, invalid credentials, and any actor whose user id does not match the sale's `salesRepId`
  - successful account-password transfer updates only `SalesOrders.salesRepId` and writes a structured `SalesHistory` row with previous rep, next rep, actor id/name, order id, and reason
  - successful master-password transfer writes the sale update, `SalesHistory`, and `MasterPasswordLoginAudit.usageType=SALES_REP_TRANSFER` row atomically; the usage row snapshots request/device/location evidence and the order/quote type and number, and an audit failure rejects and rolls back the transaction
  - selecting the order's current rep is a no-op response with `changed=false` and creates neither duplicate history nor transfer-usage audit
- Sales payment processor C.C.C contract:
  - payment previews and payment writes calculate C.C.C from the external principal being applied to the current outstanding balance after wallet credit and prior payments
  - overpayment wallet credit may be included in the external customer charge, but it must not expand the C.C.C fee base beyond the remaining principal due
- Sales payment processor customer receipt contract:
  - `salesPaymentProcessor.applyPayment` queues `sales_customer_payment_received` only when `notifyCustomer === true`; omitted, null, or false values return `customerReceiptQueueStatus: "not_requested"`
  - successful receipt queueing returns `customerReceiptQueueStatus: "queued"`; recipient, payload, or notification queue failures return `"failed"` without rejecting or rolling back the completed payment
  - recipient resolution prefers a trimmed billing email and falls back to the trimmed customer email, permits customer-name differences when all sales normalize to one email, and rejects missing or genuinely mixed recipients
  - invoice PDF rendering failure is logged and the receipt is queued with `invoicePdfAttachment: null`
  - `sales_customer_payment_received` is a direct-recipient channel and does not use notification subscribers or fallback recipient processing
- Legacy sales form C.C.C display contract:
  - legacy form pricing keeps `pricing.grandTotal` as the base order total used for persistence and due calculations
  - legacy form pricing exposes `pricing.totalWithCcc = pricing.grandTotal + pricing.ccc` for the visible payable total when the selected payment method applies C.C.C
  - legacy form hydration derives fallback display C.C.C from `payment_option`, `ccc_percentage`, and stored base `grandTotal` when root `meta.ccc` is missing
- Sales overview transaction contract:
  - `sales.getSaleTransactions({ orderNo?, accountNo? })` returns display-ready customer transaction rows for the overview Transactions tab
  - when `orderNo` is supplied, both the transaction query and nested `salesPayments` rows are scoped to that order so multi-order customer transactions do not display unrelated order payments
  - `salesRefunds.overview({ orderNo })` includes a normalized `checkNo` from payment or transaction metadata, and the Sales payment overview displays it for Check payments
- Sales inbound management contract:
  - `sales.inboundIndex` rows now expose the same `inventoryInboundOwnership` object as `sales.getOrders`. The inbound-management action opens the order Inventory/Inbounds workspace for inventory-owned inbound work and keeps the legacy manual update action for orders that have not entered inventory-owned inbound; the status column uses the linked shipment status label for inventory-owned rows instead of the stale manual order prompt.
- Product report contract:
  - `sales.getProductReport` returns enabled sales-form step components only: the component row and parent step must not be deleted, archived custom components with `meta.deletedAt` are excluded, and the row must have scoped order-backed usage through priced step forms, sales doors, or house-package moulding records
  - default ordering is by computed sales usage count descending, then units descending, then product name/id tie-breakers
- Manual order inbound status contract:
  - `SalesOrders.inventoryStatus` stores `AVAILABLE | ORDERED | PENDING ORDER`
  - `newSalesForm.saveDraft` / `saveFinal` accept optional `inventoryStatus` for orders and return it in the saved payload
  - `newSalesForm.get` / `bootstrap` return top-level `inventoryStatus`
  - `notes.saveInboundNote` updates the order-level status and creates an `inventory_inbound` order note; `PENDING ORDER` also creates unread recipients for inbound-channel subscribers
  - `notes.saveInboundNote` rejects manual status updates through the shared `inventoryInboundOwnership` rule when the order already has non-cancelled inventory `InboundDemand` linked to an active `InboundShipmentItem` / `InboundShipment`; inventory-created inbound work owns status from that point, and operators should update the linked inbound shipment instead. Cancelled or deleted inbound shipments do not keep blocking manual order status recovery.
- New sales form save completion contract:
  - `newSalesForm.saveDraft` / `saveFinal` return after the sales form record is persisted
  - responses expose `saveScope: full | legacy-po-only`; the narrow legacy scope means the server proved no status/commercial/inbound/special-order change on a record without persisted `newSalesForm.form`, so callers must skip commercial history, inventory, sales-stat, production-update, and generic sales-updated follow-ups. An unchanged normalized legacy payload is a no-op within the same scope.
  - both save inputs accept an optional development-only `clientRequestId` (a bounded opaque string); it is used only to correlate mobile diagnostics with the API `requestId` and is not persisted into the order payload
  - follow-up sales-document snapshot expiration, Trigger queue work for sales inventory line-item sync, and document snapshot warmups are best-effort and bounded; timeout/failure must not change the save response payload or leave clients waiting indefinitely
  - an employee-opened HTML Preview force-refreshes its lightweight print-data projection before issuing preview access, so an already-cached pre-adjustment row cannot survive an applied adjustment; stored/public PDF snapshots retain their existing explicit regeneration semantics
  - in development only, the API captures parsed save payloads for debugging under `debug/new-sales-form-save-payloads/YYYY-MM-DD/*.json` and emits ingress/payload-captured/core-complete/post-save-complete stage timings with both request ids; this capture has no persistence side effect, is not active in production, and file-write failures are logged without failing the save
- Mobile sales dashboard contract:
  - `sales.mobileDashboardOverview.recentSales[]` returns card-ready recent order rows with `id`, `orderId`, `customerName`, `customerPhone`, `total`, `due`, `paid`, `createdAt`, and `deliveryOption`
  - recent sales rows also include display-only `displayTotal`, `displayPending`, and `displayCcc` so mobile recent-sales cards can show C.C.C-adjusted card totals without changing principal `total`, `due`, or `paid`
- Inventory browser validation fixture report contract:
  - `inventories.inventoryBrowserValidationFixtureReport` returns `status`, `summary`, `fixtures`, `missingFixtures`, `diagnostics`, and `nextAction`
  - every fixture row includes package-owned `workspaceHref`, `recommendedAction`, `seedFixtureId`, `seedPlanHref`, bounded `samples`, and `countDiagnostic`
  - `missingFixtures` includes the same seed-plan identifiers so blocked reports can be converted directly into the controlled fixture seed plan
  - `diagnostics.seedFixturesToPrepare` groups missing fixture categories by `seedFixtureId`, preserving category keys/labels so an operator can prepare one seed fixture that satisfies multiple blocked categories
  - `countDiagnostic.countSource` is `sql_count` for complete database counts or `bounded_application_scan` for readiness categories that require application-level metadata/stock math
  - `countDiagnostic.complete=false` means the readiness count may be underreported because only a bounded candidate set was scanned; the current bounded categories are held partial shipment lines and low-stock monitored variants
- Sales inventory overview contract:
  - `inventories.salesInventoryOverview({ salesOrderId })` continues returning the sale, line items, and summary, and now also returns `groups[]` plus merged top-level `rows[]` for sales overview Inventory tabs
  - Inventory overview rows include `supplierCount`, sorted `supplierNames`,
    and `hasSupplierPrice`, derived only from active, non-deleted supplier
    variants. Sales Overview uses this evidence for the read-only manager
    production-preflight projection.
  - `inventories.orderInboundShipmentCount({ salesOrderId })` accepts a positive integer sale id and returns the active linked inbound-shipment count without loading shipment items; the Inventory tab uses it for the inactive Inbounds badge and falls back to the detailed list only while the count is loading
  - `salesInventoryOverview` also returns lifecycle/setup metadata for the Inventory tab: `lifecycleStatus`, `lifecycleLabel`, `lifecycleTone`, `fulfillmentStatus`, `setupMode`, and `hasInventoryIntegration`. `setupMode` is `active` when merged inventory rows exist, `not_configured` for active orders that can still self-sync, `legacy_status_locked` for active orders with a manual `SalesOrders.inventoryStatus` but no inventory rows, and `completed_readonly` for fulfilled orders with no inventory rows so historical orders do not create new inventory demand after fulfillment.
  - `salesInventoryOverview` returns operation policy metadata: `operationMode`, `capabilities`, `isInventoryReadOnly`, and `inventoryActionBlockReason`. These capability flags are the UI contract for whether the current sale may sync inventory, create inbound, allocate stock, mark available, or configure tracking. Fulfilled and cancelled orders return read-only capabilities even when existing inventory rows remain inspectable.
  - `inventories.syncSalesInventoryOverview({ salesOrderId })` runs the existing single-sale inventory line-item sync for one order and returns the package sync result; the sales overview Inventory tab uses it as a self-healing path when an opened order has no inventory-backed rows yet. `salesOrderId` must be a positive integer at the tRPC boundary, and the underlying `sync-sales-inventory-line-items` Trigger schema applies the same positive-integer requirement for repair/manual sync jobs. When sync removes stale components from a still-active line, child allocation/demand cleanup and component removal are guarded by the exact pre-read component identity: component id, parent line id, sub-component id, and inventory variant id. When sync removes stale inventory lines for sales items no longer present on the sale, it first soft-deletes only line items still tied to the same sale and stale sales item ids, then cleans allocation, inbound-demand, and component residue only under line items confirmed by that soft-delete write; `deletedCount` reports confirmed line writes.
  - `inventoryApplicability` includes `canVerify`. It is true only for active
    `not_applicable` orders whose last completed projection currently resolves
    to zero tracked needs and whose lifecycle has not passed the inventory
    repair boundary.
  - `inventories.verifySalesInventoryApplicability({ salesOrderId })` is the
    protected single-order challenge path for an active `N/A` result. It reloads
    the authoritative overview, requires `canVerify=true`, runs the canonical
    projection synchronizer with source `repair`, and returns the normal sync
    result. Missing orders return `NOT_FOUND`; stale or historical verification
    attempts return `PRECONDITION_FAILED`. Sync warnings/errors are not converted
    into a confirmed `N/A` result.
  - `inventories.resolveSalesInventoryLegacyStatusSetup({ salesOrderId, action, legacyStatus? })` is the per-order legacy adaptation contract for shared compatibility state `legacy_locked`, including configured/partially synchronized orders whose historical `ORDERED` or `PENDING ORDER` intent still lacks a linked inbound. Canonical actions are `continue | clear`; deprecated aliases remain accepted for one compatibility window as `override -> continue` and `reset -> clear`. `salesOrderId` must be a positive integer, and an optional `legacyStatus` is normalized then checked against the exact persisted status baseline. `continue` recognizes only `ORDERED`, `PENDING ORDER`, and `AVAILABLE`, runs line synchronization and status-specific materialization in one transaction, preserves the historical prompt, and writes one canonical migration history entry. Missing supplier resolution creates an inbound with `supplierId=null` instead of blocking or inventing a supplier. `clear` removes only the exact guarded prompt, synchronizes normally, and does not mutate linked or received inventory evidence. Unsupported non-empty values are blocked for review.
  - The legacy adaptation response includes canonical `action`, original `requestedAction`, `result = migrated | migrated_with_review | already_migrated`, normalized `legacyStatus`, sync counts/warnings, `createdInbounds[]`, `advancedInboundIds`, `fulfilledComponentCount`, `protectedComponentIds`, `unresolvedSupplierDemandIds`, `linkedInboundIds`, `nextSegment`, `noPhysicalStockChange`, and user-facing `messages`. `unresolvedSupplierDemandIds` records which demand was placed on a supplier-less inbound; it is informational and does not make the migration partial. Protected fulfillment evidence can still produce `migrated_with_review`.
  - `sales.getOrders` and `inventories.salesInventoryOverview` return the shared `inventoryLegacyCompatibility` contract: state, normalized status, display label/tone/description, recommended action, clear/continue capabilities, destination segment, shipment/need target, and reason code. Active linked inventory inbound ownership remains higher precedence than legacy state.
  - each group represents an invoice item with `label`, `qty`, `rows[]`, and totals for required, in-stock, allocated, pending, and cost
  - top-level `rows[]` is the Inventory-tab display contract: matching component/category/variant rows are merged across invoice items, demand quantities are summed, and physical stock is reported once per inventory variant instead of multiplied by every invoice item occurrence
  - each row includes component name, step/category name, required qty, summed physical stock qty from active `InventoryStock` rows, allocated qty, pending qty, open inbound qty, linked open inbound qty, cost, sales price, status, tracking policy, inventory ids, variant SKU, merged component ids, inbound demand ids, unassigned pending inbound demand ids, pending stock allocation ids, and action eligibility
  - each row also includes derived requirement display fields: `requirementStatus`, `requirementLabel`, `requirementShortLabel`, and `canEditInboundStatus`. Rows with `trackingPolicy != tracked` or `qtyRequired <= 0` return `not_applicable` / `Not Applicable` / `N/A` and cannot edit inbound status from the row; tracked rows with positive required quantity return `required`.
  - `inventories.salesInventoryTrackingChangeRepairPreview({ inventoryCategoryId, limit? })` returns a read-only repair preview after stock tracking becomes stricter. The response includes `eligibleOrderCount`, `skippedReadOnlyOrderCount`, `totalPendingQty`, bounded `orders[]` with order id, lifecycle, pending qty, and component names, plus `truncated`. Orders at `ready_to_fulfill`, fulfillment-stage, fulfilled, or cancelled lifecycle states are skipped instead of mutated.
  - `inventories.createInboundShipmentFromDemands` accepts existing demand ids, demand-selection groups with requested qty, and/or selected sales line-item component groups with requested qty, optional initial shipment `status` (`pending` or `in_progress`), optional `operation` (`create_inbound` by default or `mark_available`), and an optional trimmed activity `note` up to 2,000 characters. `available` is never a Prisma `InboundStatus`; it is an explicit operation. `supplierId` is optional/nullable; expected date and PO/reference are also optional. Supplier, demand, and component ids must be positive integers, and every selected quantity must be positive. Demand/component selections can split an existing active unlinked demand so a partial quantity never consumes the full row. Shipment item planning and linking use only active unassigned demand confirmed by guarded writes, and empty item/shipment cleanup remains parent-state guarded.
  - Ordinary `create_inbound` rejects terminal fulfilled/cancelled parents, creates/links the inbound transactionally, and updates confirmed linked orders to `ORDERED`. `mark_available` additionally requires `editOrders`, creates the shipment as `pending`, immediately runs the canonical `receiveInboundShipment` path in the same transaction, records physical stock/movement/log and demand/component receipt evidence, queues the normal received-backorder allocator, and writes received lifecycle activity. It sets `SalesOrders.inventoryStatus=AVAILABLE` through a guarded package mutation whose write predicate requires no remaining active inbound demand; partial or concurrently changed demand leaves the order prompt unchanged. The response exposes `operation`, optional `receipt`, `updatedSalesOrderCount`, and allocation job evidence. No database column or migration is required.
  - `inventories.assignInboundDemands({ inboundId, demandIds })` requires a positive-integer `inboundId` and a non-empty positive-integer `demandIds` array, then assigns existing demand rows to a non-deleted, non-terminal inbound shipment using the same active unassigned-demand and confirmed-link rule as create-inbound. The API wraps package assignment in one transaction so demand links and shipment item quantity updates commit together. Existing inbound shipment item rows are incremented atomically by confirmed linked quantity from rows whose link writes match the pre-read `qtyReceived` baseline instead of rewritten from stale demand/item pre-reads, and the item quantity commit is guarded by the parent inbound remaining non-deleted and non-terminal. Already-linked or concurrently received demand fails before mutating shipment items, and concurrently claimed demand that leaves zero confirmed links fails instead of recording a no-op assignment; any newly-created empty item cleanup is also parent-state guarded.
  - `inventories.salesInventoryMarkAsPreflight({ salesOrderIds, action })` reviews configured inventory rows and pending production material reviews before shared `SalesMenu.MarkAs` production-complete or fulfilled tasks run. `salesOrderIds` must be a non-empty positive-integer array of at most 100 ids before the preflight can run. Orders with no inventory-backed rows and no pending review remain allowed so legacy Mark As behavior is preserved. A configured blocker or pending review returns `ok=false` plus inventory blockers and an `automation` summary: affected order count, pending review/submission/quantity, linked active inbound shipment/item/remaining quantity, residual availability component count, automatic payment-review effect, and whether dispatch completion follows.
  - `inventories.resolveSalesInventoryMarkAsAutoForContinue({ salesOrderIds, action })` is the transitional Mark As Fulfilled auto-resolution mutation for active, non-terminal orders. It uses the same positive-integer batch guard as the preflight route, rejects fulfilled/cancelled orders before writes, approves active pending-review stock allocations, creates missing `InboundDemand` rows for remaining monitored-stock shortages, groups and creates inbound shipments by preferred supplier/default supplier/fallback `Auto-created inbound`, links demand rows to those shipments, recomputes affected components, updates orders with linked inbound demand to `ORDERED` and allocation-only orders to `AVAILABLE`, writes `SalesHistory` audit rows, reruns preflight for evidence, and returns `continueAllowed=true` once blockers have been converted into allocation or inbound work. The normal preflight may still report awaiting inbound after this mutation because receiving has not happened yet; the fulfilled Mark As UI intentionally continues during this transitional operating mode.
  - `inventories.resolveSalesInventoryMarkAsAvailabilityForContinue({ salesOrderIds, action })` retains the safe availability-repair contract: it cancels only unlinked mutable `pending` / `ordered` `InboundDemand` rows with no received quantity, stamps and confirms the exact changed rows, recomputes affected components, updates only confirmed resolved orders to `AVAILABLE`, and continues only when the post-mutation preflight is clean.
  - `inventories.fulfillSalesInventoryNeedsManually({ salesOrderId })` requires `editOrders` and a positive order id. It resolves only active monitored inventory components that are visible as pending Needs, sets those component statuses to `fulfilled`, clears their projected inbound quantity, and cancels only unlinked/unreceived mutable demand. It does not increase stock, allocation, or receipt quantities. Linked or partially received inbound-owned components are preserved and returned as `protectedComponentIds`; the order prompt becomes `AVAILABLE` only when no protected applicable need remains. The response reports fulfilled/protected component counts, cancelled demand count, and resulting inventory status, while `SalesHistory` records the actor and `noPhysicalStockChange=true`.
  - `inventories.overrideSalesInventoryMarkAsAvailabilityForContinue({ salesOrderIds, action })` is the backward-compatible endpoint name for the explicit `Receive, approve and continue` orchestration. When `action = fulfilled`, the authenticated actor's dedicated `viewMarkSalesOrderFulfilled` capability authorizes the complete scoped orchestration and overrides the otherwise-required `editOrders`, `editInboundOrder`, and `editProduction` sub-permissions. When `action = production_completed`, all three broader capabilities remain required. The mutation receives every remaining item on each linked shipment through `receiveInboundShipment`, resolves tracked needs through canonical manual fulfillment, approves every pending production material review after fresh evidence, and records the existing `sales_inventory_mark_as_availability_overridden` history only for residual legacy/configuration checks. It returns actual inbound/review/manual/override counts plus the initial and remaining preflight. The client starts the existing production or fulfillment task only when `continueAllowed=true`; order scope, Special Order enforcement, audits, task authorization, and the terminal job recheck remain unchanged.
  - `inventories.salesInventoryInboundStatusBackfillPreview({ limit?, cursor? })` is a bounded read-only dry-run for Phase 8 repair planning. It returns active inventory-owned inbound orders whose legacy `SalesOrders.inventoryStatus` is null or not `ORDERED`, plus `inventoryInboundOwnership` summaries, page-level `sampledMismatchCount`, global `totalMismatchCount`, `nextCursor`, and `hasMore`. It performs no repair or mutation; `status` reflects the global total rather than only the current page.
  - `inventories.repairSalesInventoryInboundStatusBackfill({ salesOrderIds, dryRun? })` is the explicit reviewed repair path for Phase 8 samples. `dryRun` defaults to `true`; apply mode requires `dryRun=false`, accepts only explicit positive order ids, revalidates active inventory-owned inbound demand plus stale legacy status at mutation time, and also guards the write by the exact legacy `SalesOrders.inventoryStatus` value captured in the reviewed candidate. Only matched rows confirmed by that guarded write are set to `ORDERED` and receive `SalesHistory` audit rows with previous status, linked inbound ids, linked demand count, and triggering user metadata. The response reports `status` (`clean` or `needs_backfill`), requested, matched, applied, skipped ids, `skippedSalesOrderReasons`, and post-run `remainingMismatchCount` / `remainingCandidates` so operators can compare apply results with the preview and see any still-stale rows after concurrent changes. Initial skip reasons are `already_ordered`, `missing_or_ineligible_order`, `no_active_inventory_inbound`, or fallback `not_matching_candidate`; apply-time revalidation skips use `changed_before_apply`.
  - `inventories.backfillSalesInventorySync({ salesOrderIds?, cursorId?, batchSize?, includeAlreadySynced?, source? })` queues the `backfill-sales-inventory-line-items` Trigger repair job. `salesOrderIds`, when supplied, must be a non-empty positive-integer list capped at 200 and the job reads exactly that targeted set instead of truncating it by `batchSize`; cursor-based repair runs keep using the bounded `batchSize` and `cursorId` pagination contract.
  - `inventories.cleanupStaleSalesInventoryLineItems({ lineItemIds?, limit?, dryRun? })` is the explicit stale inventory sale-line cleanup contract. `dryRun` defaults to `true`; when `lineItemIds` is supplied it must be a non-empty positive-integer list so an explicit empty targeted repair request cannot broaden into the default stale-line scan, and `limit` must be an integer from 1 to 500. Apply mode first soft-deletes only line items still matching the stale predicate for missing/deleted parent sales, then releases stock allocations, cancels inbound demand, and removes components only under line items confirmed by that soft-delete write. If a stale pre-read line is restored or reassigned before apply, child cleanup is skipped and response counts remain tied to confirmed writes.
  - sales overview row-level `Allocate available stock` approves pending stock allocation ids through the bulk allocation approval contract; inbound creation is a stock-scoped mutation contract. Stock allocation approve/reject/bulk-approve mutations require positive-integer allocation ids before planning, bulk approval requires a non-empty id list, and single approval requires a positive `approvedQty` when an override quantity is supplied. The mutations run in an API transaction that first resolves each active pending allocation's parent sale lifecycle and rejects fulfilled/cancelled parent sales before allocation writes or component recomputes run.
  - `inventories.shipAvailableSalesInventory({ salesOrderId, lineItemIds?, deliveryMode?, deliveredTo?, authorName?, note? })` requires positive-integer `salesOrderId` and positive-integer `lineItemIds` when supplied, then consumes planned component allocations through guarded status/quantity writes before creating completed `OrderDelivery` / `OrderItemDelivery` compatibility rows. If a planned allocation consume is stale or concurrently claimed, the mutation rejects before delivery rows, sales inventory status updates, backorder demand creation, or component recompute evidence are committed. Successful responses keep `shippedQty` at sale-line grain and `consumedAllocationQty` at component-allocation grain.
  - `inventories.setSalesInventoryLineFulfillmentHold({ lineItemId, holdUntilComplete, note? })` requires a positive-integer `lineItemId` before updating the line-level hold-until-complete flag.
  - `inventories.assignInventoryDispatchAllocations`, `inventories.packInventoryDispatchAllocations`, and `inventories.releaseInventoryDispatchAllocations` accept optional `salesOrderId`, `lineItemIds`, and `allocationIds`, but all supplied ids must be positive integers before dispatch transition planning runs.
  - `inventories.fulfillInventoryDispatch({ salesOrderId, lineItemIds?, allocationIds?, deliveryMode?, deliveredTo?, authorName?, note? })` requires positive-integer `salesOrderId` plus positive-integer line/allocation ids when supplied before consuming picked allocations or writing delivery compatibility rows.
  - `inventories.orderInboundShipments({ salesOrderId })` returns inbound shipments linked to a sale through `InboundDemand`, including shipment items, stock-line received/ordered quantities, demand rows, and order-scoped counts for the sales overview Inventory `INBOUNDS` segment
  - `inventories.inboundShipments` returns general inbound rows with `linkedOrders[]` summary data, including order id, type/status, customer name/business name/phone, demand qty, received qty, demand count, and amount due/grand total where available
  - `inventories.receiveInboundShipment({ inboundId, receivedAt?, items? })` requires a positive-integer `inboundId`. When `items` is supplied, each `inboundShipmentItemId` must be a positive integer and `qtyReceived`, `qtyGood`, `qtyIssue`, and `unitPrice` must be nonnegative numbers when present. The mutation then receives inbound items using persisted good/issue quantities as the retry baseline and runs stock updates, stock movements, demand receipt, item updates, issue creation, component recompute, shipment status update, and guarded order-level availability reconciliation in one API transaction. Closed, cancelled, or deleted shipments are rejected before receipt writes begin, and the final shipment status update is guarded against concurrent `closed` / `cancelled` / deleted state. New good/issue receipt deltas are capped at the planned inbound item quantity, while already-persisted overages are preserved and not downgraded; legacy `qtyReceived`-only payloads remain authoritative when split good/issue fields are omitted. Before stock, movement, issue, or demand writes run for a new receive delta, the shipment item row must be updated with a guarded baseline match on persisted good/issue quantities; if that guard skips, the item is reported as skipped and no downstream receive writes run for that stale snapshot. Existing stock rows use atomic quantity increments guarded by active stock row identity; stock movement and inventory log evidence are written only after that guard succeeds and the post-increment quantity is re-read. Demand receipt rows use guarded baseline/status updates; skipped stale demand rows do not consume receipt quantity, and component recompute only runs for confirmed demand receipt writes while the component row remains active. After shipment status commits, affected orders are set to `AVAILABLE` only when the database confirms that no active inbound demand remains; partial receipts therefore retain their existing order-level inbound status. Duplicate receives preserve the original `receivedAt` timestamp, avoid duplicate issue rows, avoid rewriting shipment item quantity/unit-price fields when there is no new receive delta, and keep `issue_open` when open item issues already exist. If `items` is omitted, all shipment items are planned for receipt; if `items` is provided, only those shipment item ids are received, omitted rows keep their persisted received quantities, and duplicate or non-shipment item ids are rejected before mutation.
  - `inventories.reportInboundItemIssue({ id?, inboundShipmentItemId, issueType, reportedQty, status?, resolutionType?, resolvedQty? })` requires positive-integer `id` and `inboundShipmentItemId` values when supplied, requires `reportedQty` to be positive, and accepts only nonnegative `resolvedQty` before creating or updating an inbound item issue.
  - `inventories.resolveInboundItemIssue({ issueId, status?, resolutionType?, resolvedQty? })` requires a positive-integer `issueId` and nonnegative `resolvedQty` when supplied before updating an inbound item issue resolution.
  - `inventories.updateInboundShipmentStatus({ inboundId, status, note? })` requires a positive-integer `inboundId`, accepts an optional trimmed activity note up to 2,000 characters, then updates an inbound shipment lifecycle status through a guarded write that requires the shipment to still be non-deleted and at the status observed before mutation. It records an `inventory_inbound_activity` event with `activityType=status_updated`, the operator note, and deduplicated linked sales order numbers so Sales Overview activity filters can resolve the lifecycle event. When the target status is `completed` / Received, the same transaction applies planned inbound quantity to guarded linked demand, recomputes affected component Needs, records versioned `inventory_inbound_needs_applied` Event evidence, and returns `needsApplication`; that transition requires `editInboundOrder` and does not create physical stock. When the target status is `cancelled`, unreceived active demand linked to that cancelled parent inbound is released back to unassigned `pending` demand. Affected line-item components are recomputed only from demand rows confirmed released by guarded writes while the component row remains active, and the response/activity metadata include `releasedDemandCount` and `recomputedComponentCount`.
  - `inventories.updateInboundShipmentNeedsApplication({ inboundId, operation })` requires a positive-integer inbound id, `operation="apply" | "unapply"`, and `editInboundOrder`. Apply supports historical Received shipments with unused applicable planned capacity against linked demand. Unapply restores a guarded versioned application snapshot or, for an existing capacity-applied Received shipment, subtracts only that inbound's applicable planned capacity and derives the resulting Need status, without changing stock or stock movements. Later receipt/demand drift blocks stored-snapshot reversal. Component recompute guards activity through the parent `LineItem.deletedAt` relation because `LineItemComponents` has no soft-delete column. The result includes changed demand/component counts, affected Sales order ids, and application Event id.
  - `inventories.inboundNeedsApplicationAttentionSummary()` returns `{ count }` from the inventory-owned canonical candidate query. A candidate is a non-deleted `completed` inbound with positive remaining applicable capacity against non-cancelled demand whose Sales line and order are still active.
  - `inventories.inboundNeedsApplicationAttention({ take })` requires integer `take` from 1-100 and returns canonical candidates ordered by Received/created date, with inbound id/status/date/reference, linked Need count, applied/capacity quantities, resolved order numbers, and originating author when activity evidence exists.
  - `inventories.applyInboundNeedsApplicationAttention({ inboundIds })` requires 1-100 unique positive inbound ids. The transaction applies each shipment through the same guarded Needs application operation, rejects non-Received or changed evidence, and returns changed inbound count, updated Need count, and deduplicated affected Sales order ids.
  - `inventories.inboundShipmentDetail({ inboundId })` includes `needsApplication` with `state`, `canApply`, `canUnapply`, linked/applied/open demand quantities, and active application Event id.
  - inbound lifecycle activity payloads carry a `lifecycleEventId`; the notification channel is synced before writing, and `inventory_inbound_activity` creates the timeline note through the standard notification handler even when no channel recipients are configured. Repeated array tag values such as duplicate `orderNos` are deduped before `NoteTags` writes.

## TODO
- Document canonical contracts for sales, checkout, dispatch, notifications, and document workflows.

## Sales document email attachment contract (2026-07-22)

- `simple_sales_document_email` no longer accepts or emits `skipPdfAttachment`.
- Simple and composed sales document emails always attempt to render one PDF attachment for the selected order/quote documents.
- A PDF render failure is non-fatal: the email may still send with its signed PDF download link, and the failure is logged for diagnosis.
- Attachment behavior is deterministic across development and production and is not gated by an environment variable.

## Sales document channel delivery contract (2026-07-23)

- `composed_sales_document_email` accepts explicit `email`, `whatsapp`, and
  `sms` channel intent; omitted intent defaults to email for backward
  compatibility.
- Email requires customer and sales-rep email. WhatsApp/SMS require one
  normalized valid customer phone and a generated secure PDF link.
- WhatsApp/SMS bodies use reusable `/sh/<slug>` PDF, payment, and
  quote-acceptance links and are bounded to 1,500 characters.
- Notification output exposes independent per-channel sent/skipped/failed
  counts and provider details. Requested skipped/failed channels are task
  failures from the operator's perspective.
- SMS is sent only through an explicitly configured Twilio adapter. Missing
  provider configuration produces a skipped result.

## Staff Square terminal payment contract (2026-07-22)

- Terminal payment submission requires a selected Square device id and a positive external amount.
- The API re-queries the configured Square location before checkout creation and matches `device:<id>` and `<id>` forms through one canonical device id.
- Only a device currently reported as `AVAILABLE` may be used. A stale, offline, unknown, or unverifiable device fails before Square checkout creation and before a local `SquarePayments` pending row is written.
- Device discovery is intersected with `PAIRED` `TERMINAL_API` device codes returned for the same Square application and location; merchant devices paired to another mode/application are not checkout candidates.
- Before checkout creation, the API creates a `PING` Terminal action with a 10-second deadline and polls through that full deadline plus a 2-second response grace period for `COMPLETED`. A device that does not acknowledge Connected mode fails with an operator-facing sign-in instruction; checkout creation and local pending-payment persistence do not run.
- Square Sandbox exposes the official successful simulated Terminal id and skips production-only pairing/`PING` gates because physical Square hardware cannot connect to the Sandbox.
- Square checkout creation runs before the local pending-payment write. When Square rejects the checkout, no pending local payment is recorded.
- The persisted terminal id and display name come from the server-observed Square device, not client-supplied display metadata.
- Active terminal checkout polling bypasses shared query-cache freshness and rechecks Square every two seconds. `CANCEL_REQUESTED` is not final; polling continues until `CANCELED`, which clears the client loading state, persists the local cancellation by Square checkout id, and tells the operator that no payment was applied.
- Applying a terminal payment does not trust the browser's reported state. The completion mutation must rebuild the selected `salesIds` and `orderNos`; the API rereads Square, rejects pending or canceled checkouts, refuses to finalize when no selected order was credited, and atomically claims the matching local row from `PENDING` to `PROCESSING`, records the order payment, then marks it `COMPLETED` with Square's verified tip. A checkout cannot be applied twice. Recovery may reclaim a `COMPLETED` row only when it has no linked `SalesPayments`, which repairs false-completed orphan rows without reopening a legitimately applied checkout.
- Operator cancellation uses Square's cancel-checkout operation. The local row remains pending while Square reports `CANCEL_REQUESTED` and becomes `CANCELED` only after Square confirms the final state; terminal dismissal is not used because it has payment-capture semantics.

## Sales Summary Money Contract (2026-07-20)

- Sales summary responses expose numeric `grandTotal`, `ccc`, and
  `totalWithCcc`.
- `grandTotal` is the order principal excluding C.C.C and is the value used for
  `SalesOrders.grandTotal`, `amountDue`, cash accounting, and order balance.
- `ccc` is the derived card/link/terminal charge calculated from the complete
  principal, including delivery, labor, flat labor, and other applicable costs.
- `totalWithCcc = grandTotal + ccc` is the card/link/terminal display amount.
- Older persisted summaries may omit `totalWithCcc`; hydration derives it
  without mutating `grandTotal`.
- Shelf `unitPrice` and `totalPrice` remain JSON numbers at API boundaries even
  though Prisma stores `DykeSalesShelfItem` values as `Decimal(12,2)`.
- Grouped service, shelf, and moulding metadata may include numeric
  `rateRoundingAdjustment` and `totalAuthoritative: true`. Consumers must use
  `lineTotal`, not `unitPrice × qty`, for save, print, summary, sync, and
  payment calculations.
## Storefront contracts (2026-07-20)

- A Storefront Offer references one canonical Dyke root component and route.
- Cart/wishlist lines persist normalized configuration, configuration hash and
  version, canonical pricing snapshot, root identities, quantity, and
  validation state.
- Checkout input contains customer/address/fulfillment/payment intent only;
  accepted line prices, tax, delivery, card charge, and final total are
  recomputed by the server.
- When an active calculated-shipping policy exists, Delivery checkout requires
  a non-expired, owner/cart-matched quote for the selected Google Place. V1
  quote amounts remain provisional; V2 may return `AUTO_APPROVED` only without
  calculation or confidence blockers.
- Shipping line evidence uses catalog Door per-unit override then canonical
  size profile; catalog Moulding pounds-per-LF override then the general
  pounds-per-shipped-LF setting; and catalog Shelf per-unit override then
  child/parent category pounds per unit. Unmapped, route-failed, out-of-area, or
  capacity-blocked quotes require manual review.
- Shipping settings project Door dimensions from Dyke
  `doorSizeVariation`/Height data plus Door pricing dependency dimensions, and
  Shelf rows from active parent `DykeShelfCategories`. Product-specific
  overrides belong to
  `StorefrontComponent.metadata.shipping`; policy save no longer accepts manual
  product override or Moulding profile JSON.
- Catalog Shelf metadata carries the numeric `DykeShelfCategories.id`, and
  catalog family behavior is resolved from the canonical Dyke source step
  rather than a public Storefront category slug/title.
- The active legacy policy remains read-compatible. Settings returns a legacy
  configuration summary, and `saveShipping` requires
  `acknowledgeLegacyReplacement=true` before replacing unrepresentable legacy
  mappings with the typed settings/catalog model. The prior immutable version
  remains available as rollback evidence.
- Payment-link creation accepts shipping only in `AUTO_APPROVED`, `APPROVED`,
  or `OVERRIDDEN`. Office finalization transactionally updates checkout totals,
  canonical Sales Delivery extra cost, `grandTotal`, and `amountDue`.
- Successful checkout returns the canonical storefront checkout and standard
  Sales Order identity. Retries use idempotency and cannot create a second
  charge or order.
- Availability is an online merchandising/lead-time policy, not an inventory
  reservation guarantee.
- Public and guest storefront calls use the allowlisted
  `/api/storefront/trpc` endpoint. Guest ownership comes from the signed guest
  cookie; customer ownership may come from the existing chunked secure
  NextAuth session cookie.

### Storefront profile pricing and promotion contract (2026-07-24)

- Pricing profile precedence is signed-in customer's active global profile,
  active global storefront default profile, then canonical Sales pricing.
- Dealer-owned, soft-deleted, or missing profiles are ignored. Public payloads
  never include profile coefficients or target membership.
- Campaign start is inclusive and end is exclusive. `endsAt = null` means no
  scheduled end; archiving still disables the campaign.
- Target audience matches selected customer OR selected resolved profile.
  Product scope matches selected category OR selected offer.
- Eligible campaigns do not stack. Winner order is percentage descending,
  priority descending, start descending, then ID ascending.
- The profile adjustment runs before the campaign percentage. Percentage
  discount is calculated once on the authoritative full line total with
  decimal money helpers.
- Cart pricing snapshots include private profile/campaign identity and public
  list/final totals. Guest-to-customer merge and checkout both reprice.
- Checkout reports `PRICE_CHANGED` when profile, campaign, list total, or final
  total differs from the accepted line snapshot.
- Sales persistence receives the resolved customer profile, one fixed
  `Discount` extra-cost adjustment per applied campaign, and private
  storefront pricing metadata.

## Custom millwork inquiry contract (2026-07-22)

- A custom brief requires at least one canonical project type, property type,
  city/state/postal code, a 20-character description, contact name/email, and a
  contact preference. Dimensions, materials, budget, target date, fulfillment
  notes, and phone are optional except phone is required for phone-only contact.
- Attachment finalization accepts no more than five verified private files.
  Each file is at most 10 MB and must be JPEG, PNG, WebP, HEIC/HEIF, or PDF.
  Upload authorization also atomically requires `DRAFT` state and fewer than
  five prior authorizations, so a reusable client token cannot upload after
  submission or exceed the server-side cap.
- Submission is idempotent for an inquiry/upload token pair and returns the
  stable customer reference. Notification delivery is outside the commit and
  cannot change submission success.
- Inquiry statuses are `DRAFT`, `NEW`, `IN_REVIEW`, `AWAITING_CUSTOMER`,
  `QUOTE_CREATED`, `RESPONDED`, `CLOSED`, and `SPAM`; transitions are validated
  by the shared sales-domain state machine. `DRAFT` and `QUOTE_CREATED` are
  system-owned and cannot be selected through the generic office status mutation.
- Quote conversion requires a linked office customer and assigned rep. Repeated
  conversion returns the already-linked quote rather than creating another. If
  the Sales write committed before inquiry linkage, retry locates the unique
  storefront-inquiry origin metadata and repairs the link instead of duplicating
  the quote.
- Configuration preview may validate a partial selection and returns
  `complete: boolean`. Cart, wishlist, and checkout writes still require a
  complete server-valid configuration. Hidden, unavailable, and explicitly
  waived dependent steps do not block completion.
- `NotificationOptions.forceInAppRecipients` is reserved for mandatory,
  explicitly addressed operational notices. Storefront order review uses it
  for the assigned sales rep; it does not enable email or WhatsApp delivery.

## Workflow component catalog contracts (2026-07-21)

- All writes identify existing active catalog components by positive numeric
  `componentId`; batch visibility/archive inputs require a non-empty id list.
- Visibility is `variations[]` (OR), each containing non-empty `rules[]` (AND).
  A rule contains canonical `stepUid`, `operator = is | isNot`, and non-empty
  `componentsUid[]`; server validation requires every target to remain active
  under the referenced step.
- Details and section writes merge only their owned fields. Component metadata
  unrelated to `variations` or `sectionOverride` is preserved.
- Redirect targets must resolve to an active canonical Dyke step; null clears.
- Pricing rows accept optional ids, dependency keys, and nullable prices. Any
  supplied row id must belong to the target component UID before mutation.
- Archive writes `DykeStepProducts.deletedAt`; it never deletes sale-line or
  selected-component snapshots already persisted in sales JSON/rows.
- The shared `saveDykeStepComponent` helper persists `productCode` on both
  update and create paths.

## Sales order inventory repair contracts (2026-07-22)

- `inventories.salesInventoryOrderRepairPreview` accepts `{ salesOrderId }` and
  returns exact row baselines for active inbound demand and non-terminal stock
  allocations. Safe rows are unlinked/unreceived `pending` or `ordered` demand
  and `pending_review`/`approved`/`reserved` allocations; linked, received,
  picked, and consumed rows are returned as review-only classifications.
- `inventories.resolveSalesInventoryOrderRepair` accepts selected preview
  baselines in `demandBaselines[]` and `allocationBaselines[]`, plus optional
  review-only baselines in `reviewDemandBaselines[]` and
  `reviewAllocationBaselines[]` (each capped at 200). The
  server scopes rows to the live order and requires the reviewed component,
  status, quantity, received quantity, and inbound-link values to still match.
  Only confirmed mutable rows are soft-cancelled/released, affected component
  demand state is recomputed, and one `sales_inventory_order_update_repair`
  SalesHistory record captures applied and skipped ids.
## Customer Service work-order save contract (2026-07-27)

- `community.workOrder.form` hydrates Prisma `DateTime` values through
  SuperJSON, so `assignedAt` is a nullable `Date` in the shared work-order form
  schema rather than a string.
- `community.workOrder.saveWorkOrderForm` accepts that hydrated value for edit
  round-trips but does not write `assignedAt` or `techId`; assignment remains
  owned by the dedicated customer-service assignment workflow.
- Existing assigned work orders must pass the same form schema as new work
  orders before the protected save mutation runs.

## Production assignment and readiness contract (updated 2026-07-28)

- Readiness states are `ready`, `blocked`, `overridden`, `not_configured`, and
  `read_only`.
- A configured blocked projection exposes a deterministic revision,
  blocker/sample evidence, pending quantity, open inbound quantity, and
  `canOverride = true`.
- Confirmation compares `expectedRevision` after repair synchronization inside
  the write transaction. A mismatch returns `stale` without activating a new
  confirmation.
- `not_configured` and terminal orders cannot be overridden.
- `createAssignments` does not enforce readiness and does not read an active
  confirmation. Inventory, allocation, and inbound state are informational for
  assignment.
- `submitAll` continues to enforce the strict readiness gate.
- `sales.productionOrderDetailV2.items[].materials[]` returns the material
  identity, readiness/stock status, required/available/open-inbound quantities,
  and nullable linked-shipment `expectedAt`.
- `sales.productionOrderDetailV2.materialsState` is `available` or
  `unavailable`; inventory enrichment failure returns the core production items
  with `unavailable` instead of failing the order detail.
- `sales.productions.data[]` and `sales.productionTasks.data[]` include a
  display-only `materials` summary with state, component counts, open inbound
  quantity, latest known outstanding linked-shipment `expectedAt`, and
  `undatedPendingCount`. `state=unavailable` is returned when enrichment fails;
  the production rows remain available. Material-enriched pages are capped at
  100 orders.
- The confirmation contract remains callable for compatibility and audit
  history, but it no longer authorizes or blocks assignment.

## Sales inventory synchronization capability (updated 2026-07-29)

- `inventories.salesInventoryOverview.capabilities.canSync` is true for
  non-terminal orders in either `not_configured` or `active` setup mode.
  `active` includes legacy orders that already have inventory-backed line rows
  but are missing or have failed the canonical projection marker.
- `inventories.syncSalesInventoryOverview` continues to enforce the returned
  operation capability server-side. Fulfilled, cancelled, legacy-locked,
  completed-readonly, and confirmed zero-need/not-applicable orders cannot use
  the synchronization mutation.
- `inventories.verifySalesInventoryApplicability` is the only exception for a
  confirmed zero-need state. It is limited to active `not_applicable` orders and
  rechecks `canVerify` server-side before rebuilding; terminal and
  `legacy_not_applicable` orders remain read-only.
- Clients should automatically synchronize only when
  `inventoryApplicability.state` is `not_synced` or `failed` and
  `inventoryApplicability.canManualSync` is true. Capability alone does not
  imply that every active order should be resynchronized on view.
- A successful projection synchronization also runs guarded repair-residue
  cleanup in the same transaction. Only pending/ordered, unreceived, unlinked
  demand and pending-review/approved/reserved allocations attached to deleted
  sale lines or `cancelled` retired components are changed. Linked, received,
  picked, consumed, and other non-mutable rows remain untouched.
- `inventories.salesInventoryOrderRepairPreview` returns only residue attached
  to deleted sale lines or retired (`status=cancelled`) components. Ordinary
  live demand/allocation on a current synchronized component must not appear in
  the repair panel.

## Sales accounting list contract (2026-07-29)

- `sales.getSalesAccountings.data[].customerName` is an additive
  `string | null` display field.
- Each customer resolves `businessName` before personal `name`. The transaction
  wallet customer is preferred; associated order customers are used only when
  it is missing, and duplicate names from multi-invoice payments are returned
  once.
- Missing customer data returns `null`; the dashboard displays
  `Unnamed customer`.
- The database schema, URL filters, pagination, selection, row opening, and
  Excel export contracts are unchanged.

## Contractor accounting ledger contract (updated 2026-07-30)

- Every period input uses inclusive `YYYY-MM-DD` business dates plus an IANA
  timezone and is normalized to `[from, toExclusive)` UTC boundaries. Invalid
  calendar dates, reversed periods, unknown timezones, and reversed amount
  bounds fail at the Zod boundary.
- Shared filter snapshots support free-text search, up to 100 contractor IDs,
  entry/source types, minimum/maximum absolute amount, and exception-only mode.
  List routes add opaque cursor, 1-100 page size, and ascending/descending
  effective-date order.
- `contractorAccounting.summary` and
  `contractorAccounting.periodReport` return canonical ledger-derived opening,
  earned, adjustment, payout, reversal, net, closing, contractor, count, and
  data-quality fields in integer cents.
- `contractorAccounting.entries` returns cursor-paginated serialized immutable
  journal rows, including Decimal magnitude/effect normalized to cents and
  per-contractor balance after the entry. `entry` returns one detail row.
- `filterOptions`, `periods`, `reconciliationIssues`, `reportRuns`,
  `reportSchedules`, and `taxProfiles` are bounded control-center reads.
- `payables` returns per-contractor ledger balance, FIFO aging, oldest unpaid
  date, blockers, W-9 state, readiness, and only currently eligible unpaid job
  IDs. `contractorProfile` returns the same accounting authority plus recent
  payout-run history for Contractor 360.
- `insights` returns bounded continuous daily/weekly/monthly earned, payout,
  net, and closing-liability periods plus aging.
- `resolutionIssues` and `resolutionIssue` combine stored reconciliation
  evidence with append-only resolution events. Canonical evidence fingerprints
  distinguish active, resolved, and stale resolution state.
- `closeReadiness` returns hard blockers and warnings for the exact requested
  period. `closePeriod` repeats this server-side gate and rejects unresolved or
  stale reconciliation evidence.
- Payout runs use immutable proposal snapshots and constrained transitions:
  draft, ready, handed off, completed, or cancelled. The API does not create a
  payment; Payment Portal remains the execution boundary.
- Alert rules validate kind-specific thresholds and 1-50 recipients. Alert
  events expose open/acknowledged/resolved lifecycle and durable delivery
  evidence.
- `createAdjustment` accepts bonus/expense/deduction money with two-decimal
  precision, effective date/timezone, description, optional job, and bounded
  evidence. `reverseEntry` accepts an entry, effective date/timezone, and
  reason; it creates a new reversal instead of editing the original.
- `closePeriod` accepts only a global date period, stores the canonical snapshot
  and hash, and creates a close event. `reopenPeriod` requires period ID and a
  reason. `runReconciliation` stores legacy/ledger totals plus typed issues;
  `reviewReconciliationIssue` stores reviewed/resolved state and note.
- `generateReport` requires one of six kinds and `PDF | XLSX | CSV`. Contractor
  statements require one contractor; PDF is limited to consolidated and
  contractor statement output. The route snapshots filters, creates a report
  run, and queues the report job.
- `createReportSchedule` validates a five-part cron, timezone, report
  kind/format, full filter snapshot, and 1-50 email recipients. Scheduled
  contractor statements require exactly one contractor.
- `updateTaxProfile` stores W-9 state and bounded tax-readiness evidence.
  `backfillLedger` accepts only `dryRun` (default true).
- `myStatement` deliberately has a separate pre-refinement schema without
  caller-controlled contractor IDs. The server derives scope from the
  authenticated user.
- Compatibility `jobs.contractorPeriodReport` and
  `print.contractorAccounting` now consume the immutable ledger. The legacy
  calculation remains only for reconciliation comparison.

## Sales dashboard and reporting contract (2026-07-30)

- `salesDashboard.getKpis` returns booked sales, order count, quote count,
  average order value, active production count, equal-length previous-period
  percentage changes, and resolved current/previous period bounds.
- `getRevenueOverTime` returns continuous day/week/month buckets with
  `rawDate`, inclusive `bucketTo`, booked sales, order count, AOV, and
  granularity.
- `getRecentSales` returns five selected-period order projections suitable for
  canonical Sales Overview drill-down.
- `getTopProducts`, `getSalesRepLeaderboard`, and
  `getSalesChannelBreakdown` use the same selected-period and visibility
  contract; none replaces Sales Finance reporting.
- Every sales order projection excludes `deletedAt` rows and applies the
  office/dealer-customer visibility predicate.

## Sales customer dual-address contract (2026-08-03)

- `customers.createCustomer` accepts optional `salesType`,
  `salesId`, `shippingSameAsBilling`, `billingAddress`, and `shippingAddress`
  fields while preserving the existing flat customer/address input. With a
  sale id, customer and both sale address assignments update atomically.
- Sales-context responses retain `addressId` as the billing alias and add
  `billingAddressId` plus `shippingAddressId` for direct sales-form assignment.
- `customers.assignSalesAddress` accepts a positive `salesId`, positive
  `customerId`, `billing | shipping` address kind, optional owned address id,
  and address fields. It requires customer-edit permission, rejects dealer-owned
  customers and mismatched/non-office sales, copy-on-writes shared addresses,
  and updates only the requested relation on the initiating sale.
- `customers.assignSalesAddress` and sales-context `customers.createCustomer`
  reject `CONFLICT` once the sale's canonical lifecycle is fulfilled, including
  fulfillment derived from a completed delivery with delivered items. This
  server guard is authoritative even if a stale client still exposes an editor.
- Sales-context `customers.createCustomer({ customerOnly: true })` updates
  customer identity/contact/profile data without reading or writing address
  relations. This is the permitted customer-edit path for fulfilled sales.
- Customer address inputs include an optional address-specific `name`; billing
  and shipping recipients persist independently of the owning customer name.
- `google.place` normalizes Google `addressComponents` into the customer form
  address contract. Locality/postal-town fallbacks supply city, state uses the
  administrative-area short code, and ZIP suffixes are preserved. County-level
  administrative areas are never substituted for a missing city.
- `google.places` restricts US suggestions with supported primary types
  (`street_address`, `subpremise`, `route`, `premise`, and `landmark`);
  component-only `street_number` is not sent as a primary-type filter.
- `customers.getSalesCustomer` exposes a normalized `customerForm` projection
  containing the exact requested billing/shipping assignments and strict
  non-null id equality for `shippingSameAsBilling`; Sales Overview uses this
  projection to hydrate its inline full-customer editor.

## Production submission material review contract (2026-07-30)

- A production submission returns `finalized` or `pending_material_review`,
  review id, material revision, submitted count, and idempotent-replay state.
- Per ADR-063, the authenticated direct submission action accepts assigned
  production-worker reports even when exact-scope material evidence is awaiting
  inbound, awaiting allocation, blocked, unconfigured, or temporarily
  unavailable. Those states create a guarded pending review; they do not
  hard-block the physical-work report. Production capability and elevated
  submit-for-others authority are derived server-side from the authenticated
  profile.
- Every new produceable submission has a server-validated batch key and scoped
  assignment/material snapshot, including original owner, assignment revision,
  and labor terms. Reuse with another order, reporting actor, quantity, or
  assignment scope is rejected. Exact authenticated retries replay before
  mutable assignment validation, including after later reassignment/deletion.
- Approval re-reads the active assignment and cancels stale ownership or
  revision scope without payroll. Fresh approval pays only the original
  snapshotted assignee, never a replacement worker.
- Pending reviews created before owner/revision/labor snapshots use a bounded
  compatibility path. Only the exact legacy scope shape is eligible; decision
  revalidates the original reporter, one-to-one review/submission/assignment
  scope, positive bounded quantity, active owner, control identity, and an
  assignment revision strictly earlier than the submission. Equal timestamps
  are ambiguous because legacy submission timestamps have second-level
  precision, so they cancel without payroll. Valid scope is backfilled
  transactionally before approval; unverifiable or changed scope is cancelled.
- Pending review quantity is reported but not finalized. Only approved or
  legacy no-review submissions contribute to production completion, packing,
  dispatch, payroll, or completion-dependent payment review.
- Decision input includes review id, expected `updatedAt`, action, note, and
  optional explicit resolution selections. Each inbound item requires
  admin-entered good and issue quantities; no quantity is preselected.
- `RESOLVE_AND_APPROVE` accepts up to 20 linked receipts plus up to 200 scoped
  no-inbound component ids, enabling mixed resolution. Server ownership checks
  reject arbitrary inbound/component ids.
- `APPROVE_CONFIGURATION_EXCEPTION` is reserved for the permission-checked
  one-click fulfillment resolution path. It is accepted only when fresh evidence
  remains `pending_material_review` with reason `NOT_CONFIGURED`, records
  `configurationException=true` and `noPhysicalStockChange=true`, and still runs
  the canonical approval completion effects. It cannot bypass configured stock,
  inbound, or availability blockers.
- If blockers remain after a valid resolution, inventory changes commit, the
	review stays pending with refreshed evidence, and the exact unresolved
	snapshot is returned. Final decisions are idempotent.
- Submission retraction is independent of material-review status. The
	authenticated worker may soft-delete their own unshipped submission while a
	review is pending; editors retain the established elevated boundary. The
	detail query returns active `submissions`, `retractedSubmissions`, and
	`hasRetractedSubmissions` so stale notification targets remain explainable.
- Material-review detail also returns scoped `productionItems` with the
  canonical item title and composed production description. The description
  combines section/type and subtitle metadata without duplicating an existing
  section prefix, allowing repeated material names to remain distinguishable by
  configuration and size.
- When the final active submission is retracted, the pending review records a
	`SUBMISSION_RETRACTED` resolution and remains available for inventory-only
	resolution. Decision commands accept that audited zero-active-submission
	state, but approval passes an empty production submission set and therefore
	cannot recreate quantity or payroll. A partial batch retraction narrows the
	review assignment scope to its remaining active submissions.

## Manual activity note audit contract (2026-08-04)

- Mutable activity channels are limited to `sales_info` and `inventory_inbound`.
- Edit returns root id, updated note, and revision id; delete returns root id, `deleted: true`, and revision id.
- Revision children carry `type=activity_note_revision`, `revisionAction=edited|deleted`, `revisionOf=<root id>`, original-author contact, and changing-user tags; their sender is the actor who made the change.
- Activity-tree nodes expose `senderProfileId` and `deletedAt`; deleted roots require an authorized `includeDeleted` read.
- Inbound status updates return `previousStatus` and `actorName` with committed shipment fields.

## Inventory fulfillment contract closure (2026-08-04)

- Delivery mode is the shared enum `pickup | delivery | ship`. Inventory sentinel
  values are metadata sources, not delivery modes, and are rejected at the API.
- Fulfillment mutation inputs are strict and do not accept `authorName`; actor id and
  display name are resolved from the authenticated session.
- Fulfilled and cancelled sales reject shipment, hold, and dispatch mutations with a
  conflict response. Requested line ids outside the selected sale are rejected as a
  bad request.
- Backorder and partial-shipment responses expose `deliveryMode`, order lifecycle,
  a stable `nextCursorId`, and page summary. Dedicated summary endpoints return
  complete filtered totals rather than page totals.
- Multi-component shortage totals are reported at finished-line grain. Allocation
  consumption remains component grain and is separately reconciled in mutation
  results.
- Inventory fulfillment mutation transactions use Serializable isolation, 30-second
  timeout, 5-second max wait, and at most three attempts for Prisma `P2034` write
  conflicts.

## Dyke custom step component contract (2026-08-06)

- `inventories.upsertDykeCustomStepComponent` reuses normalized titles within
  the requested Dyke step. An explicit `id` or `uid` must identify a non-archived
  custom component on that same step; standard and cross-step targets are
  rejected.
- Optional price semantics are intentional: omitted `price` leaves pricing
  untouched because pricing is not applicable, a finite number creates or
  updates the selected pricing row, and `price: null` soft-deletes the supplied
  pricing row.
- `inventories.archiveDykeCustomStepComponent` remains a soft archive. Archived
  options leave future autocomplete results but saved sales keep rendering their
  embedded selected-component snapshots.

## Guarded inbound and existing-sale quantity contract (2026-08-06)

- Direct inbound reduction input is `{ inboundId, demandId, targetQty, note }`;
  IDs must be positive, target quantity nonnegative, and the trimmed reason must
  contain 3–2000 characters.
- Target quantity may not increase or fall below received quantity. Zero removes
  an unreceived demand from the shipment while leaving it open for reassignment.
- Existing-sale reductions with downstream evidence require explicit
  acknowledgement. Open inbound also requires a cancel-open or keep-for-
  warehouse disposition.
- Snapshot drift makes the adjustment stale. Sale/payment/inbound mutation is
  atomic; the durable adjustment snapshot holds reconciliation checkpoints, and
  bounded delayed lease recovery uses exact compare-and-swap takeover to make
  projection/activity retry idempotent.

## Proposed multi-tenant SaaS contracts (2026-08-08)

These contracts are Proposed and become authoritative only when the matching
implementation phase is approved and released.

- `TenantContext` is server resolved and contains tenant id/status, active
  office, membership/role, entitlement projection, request host/source, and
  optional audited platform-support access. Raw tenant headers/IDs are hints at
  most and never authoritative.
- A signed public token binds tenant, purpose, audience/entity, revision,
  expiry, and revocation identity. Hostname resolution alone never authorizes a
  private entity.
- Tenant-owned create/update inputs omit `tenantId` except privileged import or
  transfer contracts; the server stamps ownership from context.
- Entity-by-id operations query by tenant-inclusive identity or run a mandatory
  ownership assertion before returning whether the entity exists.
- Jobs/events/idempotency keys include tenant identity and a bounded immutable
  snapshot/reference. Workers rebuild tenant context and recheck subscription,
  entitlement, membership, and entity state appropriate to the operation.
- Entitlements are computed from immutable plan version, current local
  subscription projection, active trials, and unexpired audited overrides.
  UI, API, jobs, exports, mobile, and public surfaces consume the same keys.
- Stripe subscription webhooks verify signatures against raw bytes, store the
  provider event once, tolerate duplicates/out-of-order delivery, update the
  local projection transactionally, and support replay/reconciliation.
- Domain activation requires normalized global uniqueness, DNS proof, provider
  verification, certificate-ready state, and cache publication. Removal purges
  routing before the hostname can be reused.
- Sales configuration resolves `base template revision + published tenant
  overlay revision + active tenant price book/profile/tax` and snapshots the
  resolved evidence on every saved quote/order.
- Starter template DTOs deny GND price, cost, supplier, internal margin, and
  other tenant-confidential fields.
- Module disablement follows its declared write-block/read/export/retention
  state and never implicitly deletes tenant data.
- Platform subscription billing and tenant operational customer payments expose
  separate DTOs, provider IDs, reconciliation, permissions, and ledger records.

## Special Order acknowledgment contracts (2026-08-13)

- `specialOrder.enrollmentAccess` returns the authenticated actor's effective
  `releaseAudience` and `canEnroll` decision. The default
  `SUPER_ADMIN_ONLY` audience permits only an active Super Admin role;
  `ALL_STAFF` permits users who can otherwise use the existing Sales save flow.
- The authoritative Sales save rejects only a newly attempted transition into
  `YES` when `canEnroll` is false, using
  `SPECIAL_ORDER_ENROLLMENT_RESTRICTED`. Ineligible users are not required to
  answer the hidden declaration and may preserve an already governed order.
- The save transaction resolves the same current settings/active-role decision
  used by `specialOrder.enrollmentAccess`; deleted roles do not qualify. The
  Sales Form waits or retries when that access query is unresolved rather than
  submitting an ambiguous final save.
- A restricted employee saving an existing `YES` order with missing canonical
  email retains the inline customer-email update and exact save continuation;
  the declaration control itself stays hidden.
- Enrollment audience never suppresses existing marked-order state, customer
  approval, reapproval, email/document output, notification, revision
  invalidation, Sales Overview actions, or operational enforcement.
- New internal order completion requires `specialOrderDeclaration: YES | NO`;
  draft/autosave may omit it. Existing null declarations remain legacy unmanaged.
- `YES` governs the complete order. Current approval means immutable approved
  evidence exists for the exact current Approval Revision; a status/pointer alone
  is not sufficient.
- Public capabilities are revision- and policy-bound, expire, and are atomically
  single-use. Completed, expired, revoked, and stale links disclose only their
  terminal state and cannot submit again.
- `specialOrder.enrollFromOverview` accepts a positive Sales Order id and a
  nullable/optional trimmed reason; when supplied it must contain 3-500
  characters. The server reloads the internal
  order, authenticated actor, live enrollment audience, canonical customer and
  addresses, prior Special Order state/evidence, and hydrated persisted Sales
  Form projection in a serializable transaction. Success returns the order id,
  `SIGNATURE_PENDING` status, and current Approval Revision; it creates no
  approval request or email delivery.
- `specialOrder.prepareApprovalLink` returns only a request id, order id,
  approval URL, and expiry. It reuses a current ACTIVE, unexpired request that
  matches the current Approval Revision and whose capability proof is
  reproducible with the active signing secret. An active request imported from
  another environment or invalidated by secret rotation is treated as stale,
  revoked, and replaced for that revision without sending email. An already
  approved current revision cannot be prepared through this action.
- Approve requires acknowledgment, printed name, and PNG signature. Decline
  requires a reason. Every response snapshots the customer-visible order and
  policy that were reviewed.
- Sales Form classification, Sales Overview enrollment, and
  `specialOrder.remove` accept an absent or blank reason and normalize it to
  `null`. When present, classification/removal reasons remain limited to 3-500
  characters. Reapproval and customer-decline reasons remain required, and
  reasonless supported transitions still record actor, transition, prior state,
  revision, and outcome.
- The PNG is encrypted before storage. The upload access mode follows an
  explicit signature-store override, then the configured Vercel Blob hostname,
  with an encrypted public-store compatibility fallback. No raw signature data,
  public Blob URL, or decryption secret appears in public review, Sales DTOs,
  production/packing projections, notification payloads, or operation telemetry.
- Governed operational blocks use stable application code
  `SPECIAL_ORDER_APPROVAL_REQUIRED` with safe order identity, current state,
  enforcement mode, operation category, and a Sales remediation instruction.
- Direct Sales Order email actions are resolved from fresh server state per
  included order. Missing mandatory link generation fails the send; approved and
  ordinary orders omit the action.
- Approval request/reapproval inputs accept only the Sales Order id (plus the
  required reapproval reason). The recipient cannot be overridden by a caller;
  issuance always re-reads and validates the selected canonical
  `Customers.email` inside the authoritative transaction.
- The immutable public review snapshot contains customer/salesperson identity,
  order date and purchase order, billing/shipping addresses, complete item
  specifications, additional costs, subtotal, discount, tax, total, and exact
  published policy.
- Customer invoice/order output may contain policy/signer evidence; quote and
  operational document contracts prevent private signature disclosure.
- Selecting Yes and every non-autosave governed save require a nonblank canonical
  customer email. Server rejection uses
  `SPECIAL_ORDER_CUSTOMER_EMAIL_REQUIRED`; autosave remains non-blocking.
- The missing-email dialog updates `Customers.email` first. Sales Form continues
  the exact pending declaration/save only after success; Sales Overview consumes
  and resumes one stored email-send intent. Cancellation performs neither action.
- Canonical customer identity/email and assigned billing/shipping-address edits
  invalidate active capabilities and current approval through the shared package
  revision-invalidation service, including edits made outside the Sales Form.
- Warning Only operational mutations attach structured Special Order warning and
  remediation metadata to the tRPC result without changing the domain payload.
- Standalone approval and reapproval sends create and complete
  `SalesEmailAttempt` rows, including failed/skipped outcomes, using the same
  audit ledger as Sales document email.

## Canonical Sales Form persistence (2026-08-18)

- Existing new-form tRPC mutation names remain stable, but every save command is
  revision-checked and executed as one serializable relational diff.
- Duplicate active door identities (`component + normalized dimension`) return
  `BAD_REQUEST` before any order or relational-total write.
- A stale document version returns `CONFLICT` and requires a canonical reload.
- Successful saves return the fully reloaded relational document, including
  persisted item, form-step, shelf, HPT, door, and extra-cost IDs plus the next
  revision. JSON commercial snapshots never override the response.
- Existing-document saves and direct line deletion require the current version;
  deletion delegates to the same canonical relational save service rather than
  recalculating from deprecated JSON snapshots.
- Durable IDs are accepted only when they belong to the current Sales Order.
  Ambiguous or repeated nested IDs fail before writes, and an approved JSON
  adjustment that was never projected into relations blocks save for review.

## Square Sales Refund contract (2026-08-21)

- Refund commands accept a local canonical tender id, never a caller-supplied
  Square Payment id. The server verifies provider identity, completed status,
  USD currency, age, amount, refund count, and eligible Sales Order links.
- All money uses integer cents. Principal allocations plus payment-level C.C.C.
  and tip allocations must equal the requested/provider refund amount exactly.
- One immutable intent owns one persisted provider-safe idempotency key.
  Pending and not-submitted intents reserve capacity; completed refunds consume
  capacity; failed/rejected intents release it.
- Only Square `COMPLETED` authorizes local application. Provider and application
  states can diverge temporarily, and `completed + apply_failed` remains a
  retryable Finance exception.
- External refunds are ingested idempotently but cannot change Sales balances
  until their exact eligible-order allocation is supplied.
- Completion preserves original invoice totals and operational status while
  updating paid/due projections, compatibility activity, documents, and
  idempotent notifications.

## Grouped Sales Payment Summary contract (2026-08-21)

- `sales.getSaleOverview` adds `paymentSummary`, containing cents-based overall
  totals and ordered canonical method groups for successful positive receipts.
- Group totals distinguish principal, exact recorded customer C.C.C., tip, and
  customer charged. Missing historical charge evidence is omitted, never
  estimated as a completed charge.
- Existing `costLines` remain additive-compatible but their paid-payment rows
  are generated from the same domain presentation adapter. Count rows carry
  `format: "count"`; money remains the default format.
- Receipt counts use stable transaction/provider/Square/Sales Payment identity
  and are emitted only above one. Refund compatibility, deleted, non-success,
  and non-positive rows are excluded.
- This read model changes no payment/refund mutation, balance, receivables, or
  audit-ledger contract.

## Staff Sales Payment Date contract (2026-08-21)

- `salesPaymentProcessor.applyPayment` accepts optional
  `paymentDate: YYYY-MM-DD | null` for staff-recorded manual payments. A
  non-null date requires an authenticated, active user with an active exact
  `Super Admin` role; other authorized payment users must omit it or send null.
- The date must be a real calendar date no later than the current
  `America/New_York` business date. Omitted or null values resolve to today.
- One resolved occurrence is propagated to every transaction, application,
  overpayment wallet-credit, and canonical-ledger row created by the command.
- Terminal settlement ignores a caller date and uses Square's verified paid
  timestamp; newly sent links receive their occurrence date when the provider
  later reports payment.
- Audit metadata records `paymentDate`, `paymentDateSource`, and the separate
  `recordedAt` instant without changing the existing response shape.

## Sales Overview financial breakdown contract (2026-08-21)

- `sales.getSaleOverview` adds `financialBreakdown` as an additive General V2
  read model. It contains integer-cent invoice facts (`subtotal`, adjustments,
  taxes, total, paid, and balance), canonical grouped payment facts, and an
  optional pending-card estimate. Existing `paymentSummary` and `costLines`
  remain available for V1 and compatibility consumers.
- Completed settlement facts use only successful positive payment evidence.
  Recorded C.C.C., tip, and customer-charged totals are never inferred when
  historical evidence is absent. When canonical net paid is below grouped gross
  receipts after a completed refund, `invoice.refundedCents` exposes the
  difference so presentation can render gross received, Refunded, and Net paid
  without changing the payment/refund ledger.
- When the currently selected method applies a card charge and an order retains
  a positive balance, the breakdown may include a remaining-balance estimate
  even when prior payment groups exist. The estimate is explicitly separate
  from recorded settlement and does not alter the canonical amount due.
- Quote breakdowns omit payment groups, paid facts, pending-card estimates, and
  payment actions. No payment, refund, receivable, or database mutation
  contract changes with this read model.
- General V2's narrow projection includes at most one active delivery summary
  (`id`, mode, Fulfillment date, and status) so the collapsed Order details row
  is accurate without an eager `dispatch.salesDeliveryInfo` request. Detailed
  delivery reads and updates retain the dispatch-manager permission boundary.

## Sales Overview General rollout contract (2026-08-21)

- `sales-settings.meta.salesOverviewView` stores
  `{ officeDefault: "v1" | "v2", superAdminPreview: "inherit" | "v1" | "v2" }`.
  Missing or malformed values normalize to office V1 and Super Admin V2.
- `sales.getSaleOverview` returns a caller-resolved
  `generalViewVersion: "v1" | "v2"`. Active Super Admin callers use the preview
  choice unless it is `inherit`; every other caller uses the office default.
- Ordinary overview callers never receive the complete management policy.
  Management reads and writes use dedicated protected procedures.
- Reading rollout settings is side-effect-free. The Settings row is created
  only by the management mutation, and writes preserve unrelated metadata in
  the shared `sales-settings` record.
- The canonical Sales Overview route, sheet, query params, tab registry, and
  secondary-pane contract are unchanged. Only the General renderer is gated;
  V2 is dynamically loaded and all non-General tabs keep their current data and
  UI contracts.
- The V2 renderer consumes the existing overview DTO through a conditional
  server-side projection. It excludes Product/configuration rows, Sales Profile,
  delivery-item counts, and legacy control enrichment, while retaining the
  identity/header/actions, customer/addresses, P.O., sales rep, Special Order,
  payment/provider/C.C.C., status, inventory ownership, and document-readiness
  evidence General requires. V1 continues through the compatibility projection.
- Both projections remain behind `sales.getSaleOverview`; the client still
  performs one overview request and uses one provider. The narrower selection
  was promoted only after a repeatable two-order benchmark reduced 24–25
  queries to 14–15 and warm medians from 14.5–15.3 ms to 8.7–10.0 ms.
- Projection selection is centralized in a typed versioned loader. It changes
  database relation loading, not the logical overview response contract.
  Read-only parity checks on `09397LM` and `09388PC` matched all 34 fields
  consumed by General V2 between the compatibility and narrow loaders.

## Filter option presentation metadata (2026-08-21)

- Existing filter procedures may add optional `color` and `subLabel` metadata
  to `PageFilterData.options[]`. The option `value`, label, ordering, selection,
  and URL/query serialization contracts remain unchanged.
- Status/state colors use the shared semantic filter palette; explicit domain
  colors such as Sales priority remain authoritative. Unknown dynamic statuses
  use neutral slate.
- True category filters may use stable name-derived colors when the source
  record has no stored color. Identity filters such as customer, employee,
  phone, order number, and sales rep remain uncolored.
- Dashboard and Dealership treat color as decorative supplementary metadata;
  text labels and checkbox state remain the accessible source of meaning.

## `sales.getOrders` read-model compatibility contract (2026-08-21)

- The projection changes query execution only; field names, lifecycle labels,
  inventory/inbound evidence, Special Order state, payment-review display, and
  permission/filter semantics must remain compatible with the legacy result.
- Shadow telemetry contains order ids and mismatch ids only, never customer,
  address, payment, or order payload data.
- A projected page is eligible only when every selected id has a `ready` row on
  the current projection version, its source revision matches the canonical
  order, and it is inside the configured freshness window. Eligibility is
  all-or-nothing per page.
- `paymentReview=needs_review` is explicitly excluded from projection reads
  until its distinct-payment grouping and latest-payment sort have independent
  parity evidence.
- The Trigger refresh contract accepts ids and revisions only, reloads canonical
  data, and skips stale revisions. Projection errors never mutate canonical
  sales state and always preserve the synchronous legacy fallback.
- The stored projection version is selected from the same Control reader feature
  flag as the canonical list builder (legacy version 1, Control V2 version 2).
  Trigger enqueue deduplication is global with a five-minute TTL. Comparison may
  ignore insignificant JSON floating-point serialization noise, but material
  numeric differences remain mismatches.

## Guarded packing report contract (2026-08-23)

## Headless legacy inventory adaptation contract (2026-08-24)

- Trigger task: `migrate-sales-inventory-legacy-status`.
- Worker payload: positive `salesOrderId`, exact legacy status
  (`AVAILABLE`, `ORDERED`, or `PENDING ORDER`), ISO `savedOrderUpdatedAt`, and a
  server-owned actor `{ id, name }`.
- Dashboard queue input omits actor and accepts `forceRetry` plus an optional
  terminal projection `retryRevision`; the queue boundary injects authenticated
  identity and requires `editOrders`.
- Automatic runs use a global idempotency key derived from order, status, and
  save revision. Explicit Retry adds the failed projection revision, so
  concurrent clicks deduplicate while a later terminal failure can be retried.
- The worker rechecks the actor's active `editOrders` permission and exits stale
  when normalized status or exact revision no longer matches.
- Task-monitor intent: `sales.adapt-legacy-inventory`, version 1, with
  `{ salesId, orderNo }`.
- `resolveSalesInventoryLegacyStatusMigration` accepts optional
  `expectedSalesUpdatedAt` and performs no inventory, inbound, terminal
  projection, or history writes when the baseline is stale.

- Protected `packingReports.context`, `.submit`, and `.decide` procedures use
  session identity. Submit binds one dispatch, production submission, exact
  canonical `OrderItemDelivery` allocation row, scalar-or-LH/RH quantity,
  evidence revision, and idempotency identity. Split submissions across two
  dispatches therefore have distinct report scopes.
- `packingReports.context.reports[]` exposes the bound `salesOrderItemId` so the
  dashboard can place pending review evidence and reviewer actions on the exact
  item in the ordinary packing list. The submit UI checks normal deliverables
  first and uses reportable lines only for the remaining eligible quantity.
- Assignment-scoped reporters are rechecked against the locked dispatch before
  submit; role-scoped reporters remain independent of assignment. `missing
  items` is a legitimate pre-trip report state, while `in progress` and later
  lifecycle states are not reportable.
- Approval rebuilds production-review, exact allocation, canonical-packing, and
  remaining-quantity evidence inside the transaction and invokes canonical
  packing only for the exact unchanged report. Scalar and LH/RH report
  quantities are normalized through the same canonical quantity-matrix
  semantics before the approved delta is authorized; rejection changes no
  canonical operational fact. Batch completion locks and verifies every
  dispatch hold in the same serializable transaction before any quantity,
  dispatch, reset, or lifecycle side effect.
- Inventory-backed prepare/pick acquires the deterministic dispatch lock and
  rechecks the pending-report hold before its fresh scope read. Canonical packed
  rows, allocation assignment, picking, readiness verification, and the packed
  dispatch transition share that one serializable transaction, so a failure or
  concurrent pending report rolls the complete operation back.
- Canonical clear-packing and single-item unpack commands derive active
  dispatch scope from persisted rows, acquire the mandatory lock and pending
  hold, recheck exact scope, then unpack and reset derived sales state in one
  serializable transaction. Exported packing, trip-start, and completion tasks
  do not accept caller-supplied replacements for this mandatory guard.
- Direct dispatch deletion and duplicate-dispatch cleanup lock every selected
  dispatch and reject the whole serializable transaction while any selected
  dispatch has a pending packing report. Pending audit evidence is never hidden
  behind a soft-deleted dispatch.
- `updateSalesDeliveryOption` no longer accepts or writes a dispatch lifecycle
  status; all lifecycle transitions continue through guarded dispatch authority.

## Authenticated mobile mutation contract (2026-08-23)

- `taskTrigger.trigger` accepts only `update-sales-control`; arbitrary Trigger
  task identifiers, including generic `notification`, are rejected before job
  dispatch. The API and durable worker both reauthorize and normalize the actor.
- Packing writes prove the active dispatch belongs to `meta.salesId` before and
  after the dispatch lock. Replace-existing packing is scoped by both sale and
  dispatch, so a cross-sale id mismatch produces no write or hold bypass.
- `dispatch.deletePackingItem` no longer accepts `deleteBy`. The protected route
  supplies the authenticated employee name and the canonical unpack row writes
  `unpackedBy`.
- Direct protected dispatch cancel/start/submit inputs overwrite caller `meta`
  identity before task and audit/notification use.
- `taskTrigger.notification` is the dedicated mobile contract for the five
  supported operational channels. It ignores caller author and recipient data,
  reloads the job or dispatch, authorizes that entity, and derives canonical
  scope and recipients before sending.

## Received inbound application attention contract (2026-08-28)

- `inventories.inboundNeedsApplicationAttention` accepts `{ take, salesOrderId? }`.
  `take` remains bounded to 1–100; `salesOrderId`, when supplied, must be a
  positive integer and scopes candidates through the linked demand's sales order.
- The response remains the existing received-inbound attention row contract. The
  optional order scope lets Sales Overview render only repair candidates owned by
  the currently open order without introducing another endpoint.
- Explicit Apply continues through
  `inventories.applyInboundNeedsApplicationAttention` and the canonical
  inbound-to-needs application service. Production and guarded packing workflows
  may invoke the same package service internally before evaluating readiness;
  those internal repairs are order-scoped for discovery and prioritization,
  actor-attributed, idempotent, and use no new API or database contract. Applying
  a shipment remains shipment-wide so shared inbound capacity retains one
  canonical reversible application event.

## Configurable guarded packing and dispatch lifecycle contract (2026-08-28)

- `packingReports.submit` accepts one dispatch-level selection containing normal
  and policy-eligible guarded quantities. Normal quantities continue through the
  canonical packing command; guarded quantities are grouped into one immutable
  review batch and one notification destination rather than item-level approvers.
- `packingReports.decideBatch` approves or rejects the pending rows for that
  dispatch atomically. Approval applies the exact snapshotted quantities and
  optional evidence policy; rejection changes no delivery fact. Nonblocking
  policy permits trip progress while review is pending, and completed, delivered,
  or cancelled dispatches expose the decision as read-only history.
- `sales.updateGuardedPackingSettings` preserves the immutable policy snapshot
  on every existing report, but a strict-to-nonblocking transition re-evaluates
  all pending dispatches against the new effective delivery gate. Fully covered
  dispatches move to packed readiness without changing report status, and the
  response includes pending, ready, notified-driver, and notification-failure
  counts. Policy persistence, dispatch reconciliation, and direct in-app driver
  activity creation execute inside one serializable transaction; a failed
  reconciliation or assigned-driver notification rolls back the policy change.
  The serializable transition is bounded to 100 distinct pending dispatches and
  a 60-second timeout; exceeding the bound rejects before persistence.
- The direct trip-start, status, inventory, and driver-manifest guards read the
  current guarded-packing policy when deciding whether pending approval blocks
  delivery. The historical report snapshot remains audit and approval authority;
  true dispatch-bound inventory readiness remains an independent mandatory gate.
  Pending reviews remain decidable while a trip is in progress whenever that
  current policy is nonblocking, including reports whose immutable snapshot was
  created under the older strict policy.
- Driver assignment, unassignment, and due-date changes create explicit in-app
  lifecycle notifications for the affected driver. These mandatory operational
  channels remain visible even when ordinary channel preferences exclude them,
  and their action payload opens the exact dispatch. Driver update responses
  include notification delivery results so the dashboard can surface a genuine
  inbox-delivery failure.
- `sales_dispatch_approval_pending_released` is the direct in-app driver channel
  for a fully verified pending dispatch released by a policy change. Its typed
  action opens the exact dispatch; reports remain `PENDING` and are not
  auto-approved.
- The Fulfillment v2 server prefetch and client dispatch-list query use the same
  normalized filter and page-size contract. This prevents an unauthenticated
  server-side HTTP refetch during hydration while preserving client refetches.
- Canonical Sales Mark As completion invalidates the dispatch list, index,
  summary, backlog, detail, overview, exceptions, and driver workload queries
  in addition to Sales queries. Fulfilled orders therefore move across
  Fulfillment views without a second dispatch-only update.

## Canonical fulfillment hardening contract (2026-08-28)

- Admin and driver packing use `dispatch.confirmPacking`. The overview response
  returns the packing command revision after the overview projection is loaded,
  and clients refresh that revision at submit time. Repeated presentation lines
  for one `salesItemId` are combined before the command reaches inventory.
- `bulkAssignDriver` applies the notification-aware single-dispatch updater to
  every changed row. Assignment and unassignment therefore create the same
  mandatory in-app lifecycle records in single and bulk flows; unchanged rows
  remain no-ops.
- General delivery reads order active delivery records newest-first. Queued
  fulfillment cancellation ignores an `unknown` control fallback and derives
  the post-cancel production state from canonical workflow evidence.
- Completed delivery signatures remain stored as SVG proof documents. The
  signed-packing-slip job fetches and validates the stored path and passes it to
  the PDF templates as native vector content; SVG URLs are never sent to the
  raster-only PDF image decoder.
- Dispatch-list packing totals prefer the row's dispatch control. When an
  unstarted dispatch has no listed or packed rows, only the order's remaining
  packing quantity supplies its denominator; historical order-level packed
  quantity is never borrowed. This shows genuine `0/n` work without making a
  duplicate or replacement dispatch inherit another dispatch's packed total.

## Canonical dispatch packing-total contract (2026-08-29)

- `dispatch.list` and `dispatch.dispatchOverviewV2` resolve totals through the
  same package-owned rule: current listed dispatch quantity is authoritative
  once an allocation exists; otherwise ordered/remaining quantity is the
  target; the denominator can never be lower than packed quantity.
- `OrderItemDelivery` rows with `packingStatus = unpacked` are retained as
  immutable packing history but are not current allocations. Dispatch list
  controls, overview item/summary quantities, cross-dispatch coverage, and
  packing-slip composition all exclude those audit rows. Packed, pending-review,
  and legacy null-status rows remain current according to the existing workflow.
- Dispatch overview reads still include every non-deleted allocation so packing
  history remains complete. Legacy rows fall back from submission or control
  UID linkage to their sales-item id when current quantity is projected.
- The response shape is unchanged. `summary.total`, `summary.listed`, and
  `summary.packed` now agree with the fulfillment-list numerator and denominator.
  A true empty/non-shippable dispatch remains `0/0`; an unstarted 53-unit
  dispatch reports `0/53`.

## Sales production batch lifecycle contract (2026-08-29)

- `sales.productions` and authenticated-worker `sales.productionTasks` rows now
  include `lifecycleStatus`, derived from the stored order status plus canonical
  production and delivery projections.
- The field uses the existing Sales order lifecycle vocabulary. It is additive;
  existing production `completed` and `status` fields are unchanged.
- Admin batch status actions combine `lifecycleStatus` with the existing
  production-completion boolean to exclude orders already past the requested
  transition before preflight or task dispatch. Worker surfaces consume the
  additive field but expose no admin selection action.

## Backlog bulk fulfillment contract (2026-08-29)

- The dashboard task trigger accepts `bulk-mark-sales-fulfilled` with a stable
  request id and 1-40 unique positive Sales ids. The server ignores client actor
  claims and stamps the authenticated actor before enqueueing one parent run.
- The parent job rechecks fulfillment permission, resolves dispatches
  idempotently, invokes canonical sales-control children with per-order global
  idempotency, and returns aggregate counts plus privacy-safe per-order outcomes.
- `BulkFulfillmentResult.backlogCount` is the authoritative canonical Backlog
  count measured after every child reaches terminal state. Dashboard consumers
  may use it to reconcile cached Fulfillment analytics after invalidation.
- `dispatch.workspaceSummary` and `dispatch.backlog` share
  `buildSalesDispatchBacklogWhere`; Backlog means a non-deleted delivery/pickup
  Sales order with no order-level delivery completion and no non-cancelled,
  non-deleted dispatch.
- No schema, migration, response removal, or permission expansion was made.

## Sales production invoice and filter contract (2026-08-29)

- `sales.productions` accepts the additive URL-compatible filters
  `customer.name`, `phone`, `po`, `sales.rep`, `salesNo`, `item`, and `invoice`.
  Production invoice values are restricted to `paid` and `pending`, where
  `pending` is presented to operators as Outstanding.
- Production list and summary queries preserve the same filter values so queue
  rows and summary counts remain consistent. Calendar and review projections
  intentionally omit incompatible order/payment filters.
- Admin production list rows add a read-only `invoice` projection containing
  nullable `total`, nullable `amountDue`, and status `paid`, `outstanding`, or
  `unknown`. Existing production, lifecycle, permission, and mutation contracts
  are unchanged.

## Fulfillment queue presentation contract (2026-08-29)

- `dispatch.backlog` and `dispatch.list` add the Sales Orders-compatible order
  presentation required by fulfillment tables: customer identity, repaired
  invoice/CCC totals, balance, latest payment-review marker, production state,
  and canonical order lifecycle status.
- The projection is additive. Existing dispatch lifecycle, packing, driver,
  destination, and pagination fields remain unchanged.
- `dispatch.workspaceSummary.active` is the authoritative count of non-terminal
  dispatch lifecycle rows. It excludes both fulfilled and cancelled stages and
  uses the same canonical lifecycle projection as the Active table preset.

## Driver Ready route and safe-manifest contract (2026-08-29)

- `dispatch.driverWorkQueue` adds a server-owned route capability per assigned
  stop. `ready` requires canonical packed state, a destination, no blocking
  manifest/packing/inventory review, and inventory departure readiness.
- `dispatch.driverWorkQueueSummary` adds stable `ready`, `packedBlocked`, and
  `needsAttention` counts. Dashboard view selection does not change those
  summary totals.
- `dispatch.startReadyRoute` accepts 1-50 unique explicit dispatch ids plus a
  request id. It reuses the canonical single-stop transition and returns
  per-stop `started`, `already_started`, or `blocked` results with aggregate
  counts. It never starts hidden or inferred stops.
- Assigned-driver manifest responses expose only shippable, driver-safe item
  presentation. Labor, rate, cost, price, and line-total content is excluded;
  type, size, handing, and quantity are normalized so each fact appears once.
- Existing single-stop Start Trip, proof, packing, and selected-stop contracts
  remain available and authoritative.

## Dispatch packing-command reliability contract (2026-08-29)

- `dispatch.confirmPacking` clients must fetch the current overview revision at
  submission time without accepting the normal query freshness window.
- A handled request uses `qty = 0` with positive `lh` and/or `rh`; a
  single-quantity request uses positive `qty` with `lh = rh = 0`. Sending both
  representations is invalid.
- Legacy shipping rows may materialize through non-production Sales control
  when production is absent or explicitly false. Explicit production rows
  continue to require canonical production/material evidence.
- Genuine stale manifest and idempotency reuse remain conflict responses.
  Inventory shortage, unavailable quantity, terminal/scope validation, and
  packing-review preconditions preserve an actionable public message with
  `PRECONDITION_FAILED` transport semantics.

## Driver route destination contract (2026-08-29)

- Driver list and manifest projections expose `routeDestination` with sanitized
  `primary`, `route`, `verified`, `requiresNormalization`, and
  `displaySecondary` fields plus the applicable warehouse `routeOrigin`.
- `dispatch.normalizeDestination` accepts a positive `dispatchId`, Google
  `placeId`, and optional session token. The server resolves place details and
  persists versioned dispatch-scoped routing evidence; callers cannot submit
  coordinates or normalized address fields directly.
- Customer shipping data remains unchanged. Start Trip accepts either an
  existing textual customer destination or a verified dispatch route
  destination; pickup uses the warehouse destination.
- A packed capability blocked only by `DESTINATION_REQUIRED` is a Start Trip
  candidate for UI preflight, not departure authority. The start mutation still
  reloads the saved destination and all other canonical guards.

## Dispatch assignment destination contract (2026-08-30)

- `dispatch.assignmentDestinationPreflight` accepts either dispatch ids or
  Sales ids plus delivery mode and returns ordered `ready` and `missing`
  destinations. A delivery destination is ready only when the order shipping
  address carries Google place identity and coordinates; pickup is ready through
  its warehouse destination.
- `dispatch.normalizeAssignmentDestination` accepts a positive Sales id, Google
  place id, and optional session token. The server resolves the place and saves
  it as a sale-scoped shipping address; clients cannot submit trusted coordinates
  or normalized address fields.
- `createDispatch`, `createDispatches`, `updateDispatchDriver`, and
  `bulkAssignDriver` enforce the same rule when assigning a non-null driver.
  Bulk assignment performs the complete address preflight before its first
  write. Unassignment does not require address readiness.
- Address normalization preserves the existing sale recipient contact fields
  and does not update the customer's master address.

## Sales production workflow projection (2026-08-30)

- `sales.productions` rows add `status.production.workflow` as an additive,
  read-only projection with `code`, `label`, `score`, `total`, and
  `percentage`. `code` is one of `not_applicable`, `not_assigned`,
  `partially_assigned`, `assigned`, `in_production`, `awaiting_review`, or
  `production_completed`.
- The existing `status.production.status` remains available for legacy
  lifecycle and mutation compatibility. Consumers must use `workflow.label`
  for the operator-facing stage and `workflow.percentage` for progress.
- Production list and summary filters now require one active produceable item
  control with an active positive `qty` control. This keeps queue rows and
  summary counts aligned and excludes orders that have no live production
  work.
- No request shape, mutation contract, permission, database schema, or
  migration changed.

## Fulfillment workspace section contract (2026-08-30)

- `dispatchWorkspaceSections` and `dispatch.list` accept `completed` as a
  first-class section. The router forwards `section` to the repository instead
  of treating it as presentation-only query state.
- `dispatch.list(section: "active")` returns canonically nonterminal dispatches
  that have a driver, plus open pickup dispatches. It excludes unassigned
  deliveries, fulfilled dispatches, and cancelled dispatches even when the raw
  `OrderDelivery.status` disagrees with Sales control.
- `dispatch.list(section: "completed")` returns only canonical `fulfilled`
  lifecycle rows. Section membership is applied before the final page and
  cursor are emitted.
- `dispatch.workspaceSummary` returns `backlog`, `active`, `completed`, `all`,
  `openExceptions`, `overdue`, `driverCount`, and `byStage`. Active, Completed,
  and stage totals are calculated from the same enriched lifecycle projection
  as list membership.
- Dispatch list rows include additive `updatedAt` and `deliveredAt` timestamps.
  No mutation input, permission boundary, database schema, or migration changed.
- `dispatch.list` also accepts `due-today` and `past-due`. They are canonical
  Active subsets using the existing business-timezone due buckets `today` and
  `overdue`, respectively. Database due boundaries narrow candidates before
  enrichment; canonical section membership still decides the returned page.
- `dispatch.workspaceSummary.dueToday` and `.pastDue` are exact global counts
  from the same enriched records and membership helper. The legacy-compatible
  `.overdue` summary value now aliases `.pastDue` so dashboard alerts and the
  Past Due tab reconcile.

## Planned Status-only sales completion contract (2026-09-01)

- A shared backend resolver must expose operational lifecycle truth separately
  from order-level completion satisfaction. Minimum normalized fields are
  `operationalProductionCompleted`, `canonicalFulfilled`,
  `productionCompletionSatisfied`, `fulfillmentCompletionSatisfied`,
  `fulfillmentDisposition`, completion source/method/date provenance, and
  server-calculated available actions.
- `fulfillmentDisposition` is `FULFILLED` only when accepted delivery proof and
  required inventory/dispatch completion are committed. An active Status-only
  Fulfillment record produces `ADMINISTRATIVELY_COMPLETED`; otherwise it is
  `PENDING`.
- If a temporary compatibility field named `fulfilled` remains, it means
  `canonicalFulfilled` only. Completion queues must explicitly consume
  `fulfillmentCompletionSatisfied` rather than reinterpret the compatibility
  field.
- Mark and cancel inputs identify one positive Sales Order, one milestone, an
  idempotency identity, and optional effective date or cancellation reason.
  Actor identity, recording time, current state, permissions, and available
  actions are server-derived and transactionally revalidated.
- Status-only mutations create or cancel only `SalesCompletionRecord` plus
  audit evidence and internal read-model invalidation. They return the refreshed
  normalized completion projection and never return fabricated operational
  records.
- Permission failure, stale state, invalid transition, duplicate/idempotent
  success, and persistence failure remain distinguishable for clients.
- Endpoint names and transport placement are selected in the separate
  implementation handoff; this section fixes their domain contract only. No API
  implementation changed during planning.

## Sales document readiness contract (2026-09-01)

- Dashboard document-access actions return either the existing resolved access
  result or `{ kind: "preflight", readiness }`. The readiness payload contains
  `ready`, `repair_required`, `financial_review`, or `manual_review`, findings,
  cents-based saved/candidate financial evidence, narrow repair operations, a
  server signature, and a staged proposal id when applicable.
- Preview, print, PDF download/regeneration, and Sales email initiation all use
  this typed interruption. No document URL, PDF snapshot, or delivery is
  produced while the result is non-ready.
- Guarded document entrypoints pass an auto-repair audit context into the shared
  readiness service. A `repair_required` proposal is applied automatically only
  when every comparable financial delta is exactly zero; the service returns
  `ready` after transactional revalidation, guarded aggregate writes, final
  evaluation, cache invalidation, and audit persistence. `financial_review` and
  `manual_review` still return or throw as blockers without repair writes.
- `SalesDocumentAutoRepairContext` identifies the guarded source and accepts an
  optional employee actor. Dashboard and Sales delivery paths preserve the
  employee id/name; dealer and storefront access record a system-maintenance
  source with no employee id. `assertSalesDocumentsReady` enables this safe
  behavior by default for trusted server-side document guards.
- `applySalesDocumentReadinessRepairAction` requires `editOrders`, accepts only
  Sales order id plus proposal id, and revalidates all source evidence inside a
  serializable server transaction. Client-provided repair data is not accepted.
- `discardSalesDocumentReadinessProposalAction` requires `editOrders`, cancels
  the active proposal, clears its Sales-meta attestation, and allows the Sales
  Form to recalculate from live data.
- Simple and composed notification builders repeat readiness validation before
  constructing document links or attachments, preventing direct server/job
  callers from bypassing the client preflight.
# Production Planning Calendar (Ticket 18, local implementation)

Planning rows include the stored order `slug` for existing edit navigation.
Production schedule-move input now rejects unknown fields, including a Planning
discriminator, while preserving its existing exact-group contract.

`sales.productionPlanningCalendar` returns a separate `kind: planning`
projection: order/customer, order-level due-date provenance, canonical stage,
headline/material/completion metadata, required/assigned/uncovered quantities,
workers, assignment eligibility, days/count and an explicit truncation flag.
Inputs are strict date-only from/to, optional q and priority. Reads cap at 42
days and 1,500 candidates; canonical evidence loads through the batched reader.
Planning never supplies schedule-group IDs or writes assignments. Schedule and
worker Calendar membership remain assignment-backed.
# Single-item Production assignment guard — 2026-09-07

The Dashboard create-sales-assignment action now uses the same canonical
production.assign transaction boundary as batch assignment. It checks existing
permission, binds a fresh pipeline revision, locks the order, reloads the item,
and validates requested whole-number quantities against source-derived pending
total/hand capacity. Client-supplied pending and labor cost are not authority;
labor cost comes from the matched item. Item/door/shelf identity and production
capability must match. Post-commit handoff and notification behavior is retained.

## Admin Production invoices and Dispatch Order Date (2026-09-08)

- sales.productions adds nullable invoicePresentation on each page row. Its
  finance/customer projection supplies the shared Orders invoice UI with
  canonical CCC totals, amountDue/due, payment account context and the latest
  successful non-deleted needs_review payment (take: 1).
- The Sales package enables this projection through server-owned
  context.includeInvoice; the admin router opts in. Worker requests remain
  unenriched and return invoicePresentation: null. Enrichment is one query for
  the returned page IDs, never a per-row query or full-queue payment load.
- Dispatch list sort values orderDate.asc / orderDate.desc map to the related
  sales order createdAt, then dispatch id in the same direction. Existing sort
  keys and default ordering retain their behavior. No schema or permission
  change is required.

## Production material review note-free input (2026-09-08)

- `reviewProductionSubmission.note` is optional. Existing supplied notes remain
  accepted; absent/blank input generates an action/actor-attributed description
  at the canonical decision service. Decision audit snapshots, authorization,
  revision checks, payroll effects and legacy notes remain intact.
- New admin-only `sales.getProductionReceivingSettings` and
  `sales.updateProductionReceivingSettings` expose a default-off
  `production.workerCanReceiveInbound` policy in Sales settings metadata. Updates
  require `expectedRevision`, increment the revision, preserve other metadata and
  write `production_receiving_policy_changed` with the actor and before/after
  policy in the same serializable transaction. Worker consumers recheck this
  policy inside their receipt transaction.

### Production inbound receipt — 2026-09-08

`sales.productionPendingInbounds` reads bounded linked inbounds, including received/completed and closed shipments, for an
order, optional exact inbound ID and cursor. The legacy endpoint name is retained; count now includes those retained shipments. Cancelled/deleted shipments remain excluded. It returns server-calculated receipt
capabilities and evidence revisions. `sales.receiveProductionInbound` accepts
order/inbound IDs, expected revision and request UUID; physical receipt, scoped
Needs allocation, allocation confirmation and audit run transactionally. A failed
application rolls back receiving. Replayed successful requests do not receive twice.
Linked eligible pending reviews now finalize through the canonical transaction-level
review command after allocation; invalid scopes and unresolved material evidence
remain pending. This includes exactly-once payroll and canonical completion effects.

The query also returns admin-only `receipts` with originating `receiptId`,
`inboundId`, `receivedAt` and a cancellation-unavailable explanation. Independent
`receiptCursor`/`nextReceiptCursor` paginate saved events, 20 per page, newest first.
Order authorization precedes history access; workers receive no admin history.
The Production panel retains receipt confirmations and Open inbound after reload.
Cancellation is still under implementation and is not exposed as an executable action.

New `production_inbound_received` events are version 2 and include transactional
before/after receipt provenance (shipment, materials, stock, reviews, payroll,
payment-review fields, completion records and assignment/submission scope). Evidence
is capped at 500 rows per collection and 1 MB; excess rolls back the command.
This audit is internal and is not returned in the history response. Legacy version
1 events remain unchanged. The audit alone does not enable cancellation.

`sales.cancelProductionInbound` now accepts `salesOrderId`, originating `receiptId`
and an idempotency UUID. It re-resolves actor permissions inside a Serializable
transaction and requires both admin Production visibility and inbound editing.
The command compares current evidence with the complete version 2 audit, restores
only receipt changes, appends reversing stock movements, restores eligible pending
reviews/payment-review fields, soft-deletes new pending payroll, cancels originating
full-workflow completion records and refreshes projections. Replays do not reverse
twice. Legacy/incomplete evidence, changed state or payroll in payment processing
refuses cancellation. Audit now includes commercial order state, other stock
commitments, dispatches and packing reports for downstream-change comparison.

History rows add `cancelled` and `canCancel`; legacy rows expose a reason instead.
The UI renders admin-only Cancel review and updates to receipt cancelled after
success. Both receipt mutations publish Inventory and Production query events.
Broader downstream/race/browser acceptance is still in progress.

Cancellation additionally validates complete before-state group structure, immutable
row ownership, dates, nonnegative quantities, receipt totals and monotonic deltas
before restoration. Original null stock prices are preserved. Pending-inbound reads
return worker `needsSupervisor` from current scoped shortages and pending reviews;
receipt results persist/replay this outcome. The UI uses refreshed query evidence,
so guidance survives reload and disappears when the underlying condition is resolved.

Receipt review refinement: use Serializable isolation, validate pending allocation
Need/variant/physical-stock capacity before confirmation, and return remaining
backorder quantity for partial-success messaging. Projection refresh reads the
post-receipt canonical pipeline evidence revision, not only the sale timestamp.
The command requires one persisted projection; a skipped refresh rolls back receipt,
allocation and audit so success cannot leave the order list stale. Inbound item
selection is scoped before limiting.

### Production order presentation follow-up (2026-09-08, in progress)

Production calendar and order table responses now add `orderPresentation` with
`primary` (`code`, `label`, `detail`, `basis`), `attention` (ordered distinct
`code`/`message` entries) and `reportedQty`. Pending review classifications are
loaded once for the displayed orders' active pending submissions. This is a
read-only presentation contract; canonical pipeline fields and filter membership
remain unchanged. Reported completion is explicitly distinguished from finalized
completion in details. Missing/stale evidence keeps an unknown primary state.
Receipt reconciliation/cancellation remain under implementation in
`tasks/2026-09-08-production-receipt-follow-up-and-cancel-review.md`.

## Explicit sale copy activity (2026-09-08)

sales.copySale and the copy phase of sales.moveSale opt into the shared copy
transaction's activityOperation=copy|move. A newly created destination requires
one NotePad activity to persist before copy success; audit errors roll back the
copy transaction and use the existing error response. No public input change.
The note carries channel=sales_info, source=system, type=system,
activity=sales_copied, status=public, destination salesId/salesNo/orderNo,
sourceSalesId/sourceSalesNo/sourceSalesType and operation. Sender contact and
createdById resolve from the authenticated employee without an email requirement.
Returning an existing converted order emits no new copy event. Checkout and
*-hx copies do not opt into this writer. Move's later source soft-delete retains
its existing separate transaction behavior; the activity proves the destination
copy, not atomic completion of the entire move. No historical data repair.

## Post-save sales job calibration (2026-09-08)
`sync-sales-inventory-line-items` accepts optional `skipInventory: boolean`. Every run calibrates saved sales controls and the persisted list summary first; true skips ordinary inventory synchronization for legacy/PO-only saves. Existing callers that omit it continue inventory synchronization after calibration. The list query gains no saved-item requirement joins. Calibration uses the SalesOrders row lock shared by workflow commands and rebuilds derived totals rather than issuing assignments or completion commands.

Sales Orders and General overview now expose `archivedAt` independently of the pipeline snapshot. The persisted order-list payload includes it at projection version 6, so an unavailable workflow summary does not prevent authorized archive/restore actions. No additional database relation is loaded for archive state.

## Sales save identity reconciliation and errors — 2026-09-09

- Approved snapshot consistency checking resolves only missing child door/shelf IDs through unique same-parent semantic matching. It does not substitute known IDs or change commercial values. Ambiguous/genuine mismatches return reportable `SALES_RELATIONAL_REVIEW_REQUIRED` via PRECONDITION_FAILED with safe administrator guidance.
- `PRECONDITION_FAILED` is no longer mistaken for a Prisma P-code; Prisma code recognition requires P followed by four digits.
- Dashboard `refreshSavedSalesStatsAction` returns `{ok:true}` or `{ok:false,error:PublicError}`. Failures use reportable `SALES_POST_SAVE_REFRESH_FAILED` and preserve a single reference through server capture and UI display. The form treats this as a post-commit failure, preserving the saved status.
- No schema/auth/approval-policy changes. Existing commitment and stale-version guards remain enforced. Dashboard/API and adjustment-worker changes require coordinated rollout.

## Production material availability — 2026-09-09

Completed-shipment application is now supported in the synchronization command. Preview exposes applicableDemandCount, while internal unappliedInboundNeeds evidence is stripped from public availability/covered-material responses. The transaction applies only scoped active demand rows up to remaining good receipt capacity, recomputes their components, reserves available stock and finalizes eligible submissions. Result appliedDemandCount and audit demandApplications capture the guarded before/after quantities. Issue quantities and other orders' demand rows are never applied by this scope.

Received reservation extension: coveredProductionMaterials exposes applicableReceivedQty; internal stock evidence and reservation/component plans are omitted from the API response. Apply covered materials now reserves received-but-unallocated quantities through canonical stock primitives and returns appliedReceivedQty. Reservation budgets subtract prior receipt-attributed allocations and account for pending allocations approved in the same transaction. Its audit allocationReceipts is recognized by availability reads, preventing historical receipt reuse. Completed shipments with unapplied demand receipt quantities remain a separate unfinished path.

Allocation application extension: coveredProductionMaterials additionally returns applicableAllocationCount, applicableComponentIds, allocationBlocked and canApplyAllocations. The command approves only existing pending allocations backed by matching physical stock and remaining component need, counts already committed stock across orders, and re-evaluates reviews afterward. Invalid components remain untouched while valid components may proceed. Results include appliedAllocationCount and the durable audit includes allocationIds. Read-only previews never apply stock; quantities without a valid allocation proposal still require the remaining received-Needs application work.

Covered-review extension: `sales.coveredProductionMaterials({salesOrderId})` returns scoped pending/eligible/blocked review counts, actor capability and an evidence revision without writes. `sales.applyCoveredProductionMaterials({salesOrderId,expectedRevision,idempotencyKey})` revalidates authority and live evidence in a serializable transaction, invokes established review reconciliation, records `production_covered_materials_applied`, and refreshes canonical pipeline/list projections. It returns resolvedCount, remainingReviewCount and replayed. Identical actor/request retries return the prior result; different payloads under the same key conflict. Current implementation handles already-covered reviews; received-but-unapplied Needs application and UI integration remain open.
- `sales.productionAvailability({salesOrderId})`: minimal scoped needs, per-component eligible quantities, actual/pending inbound counts, state, worker flag, capability and revision. No prices or contact data.
- `sales.productionAvailabilitySuppliers({salesOrderId})`: all nondeleted supplier IDs/names after the same scoped authority check.
- `sales.markProductionMaterialsAvailable`: salesOrderId, expectedRevision, UUID idempotencyKey, nullable supplierId, receivedDate YYYY-MM-DD, selection all or selected `{id,qty}` rows, optional note. Returns inboundId, receivedQty, remainingQty, needsReview and replayed. Stale revisions/invalid scope fail transactionally. Identical actor/key/payload retries return the original result; changed payload conflicts.
- Audit Event type `production_materials_available` stores request hash, selection, supplier/date, result and receipt allocation quantities with component/stock identity. Existing schema only. Central mutation events refresh inventory/inbound and sales pipeline/Production surfaces.

## Production worker reassignment (2026-09-09)

`reassignProductionAction({ salesId, assignmentIds, assignedToId })` requires
positive integer identifiers and 1–500 assignment IDs. The authenticated actor
must have editProduction. Each assignment is locked and rebound to salesId before
reading active submissions; an active Production worker is required. Returns
`{ moved }` for the unsubmitted quantity transferred, or rejects an empty transfer.
Partial transfers preserve reports and original ownership in a quantity split.
Calendar rows add `hasReassignableQuantity` for the card's assignment scope.
See `features/production-worker-reassignment.md` for lifecycle and review behavior.

### Production Sync deterministic repairs (2026-09-09)
`coveredProductionMaterials` adds repairableAllocationCount, repairableClassificationCount, canSynchronize and specific blockers. Actionability includes deterministic repair and eligible review snapshot refresh even when no new material application remains. Internal allocationRepairs, classificationPlan, reviewScopePlan and eligibleReviewIds are stripped by the router alongside existing receipt evidence. `applyCoveredProductionMaterials` adds repairedAllocationCount, repairedClassificationCount and refreshedReviewCount; these default to zero when replaying older event results. Repair and review refresh evidence contributes to expectedRevision. The same transaction repairs, revalidates, reserves and finalizes eligible reviews using established payroll behavior; event evidence retains before/after snapshots. No schema migration.
## Fulfillment order workspace query — Ticket 02 complete

`dispatch.fulfillmentOrders` is protected by `requireDispatchManager`. It returns order-grain `data`, section `counts`, and offset `meta.cursor`/`count`, using the shared canonical quantity projection. Driver, schedule, stage, mode and risk filters apply to the same child fulfillment; returned order context retains all siblings. Section totals ignore the selected section but retain other filters. Search is applied before projection. Sorting supports schedule, order number, customer and creation/order date with a stable order-ID tie break; absent schedules remain last. Raw fulfillment metadata is not returned.

The existing driver, calendar and legacy dispatch list endpoints are unchanged. Admin All/Active/Due Today/Past Due/Completed/Backlog tables, header counts and operational stage cards share this query and its client cache. The response also includes per-stage order counts, canonical pipeline context and page-only invoice/payment presentation. Completed-date sorting uses effective completion or fulfilled-child delivery timestamps. Proof-sync failure currently has no persisted source in the existing workspace; do not infer this risk from generic open exceptions. The future notification/recovery work must supply authoritative evidence before that filter can report failures.

Validation: opt-in local `apps/api/src/db/queries/fulfillment-orders.integration.test.ts` covers parent uniqueness, stable page membership, section-count parity and schedule filtering with transaction rollback. Pure workspace tests cover driver aggregation and compound-filter identity. Existing copy-sales nullable-string error prevents a clean API typecheck.

### Fulfillment secondary overview

`dispatch.fulfillmentDetail({ salesId, fulfillmentId })` requires dispatch-manager access and checks the non-deleted fulfillment belongs to the supplied order before returning data. Missing or unrelated pairs return NOT_FOUND. The response includes order identity, child status/driver/dates, separate planned/packed/delivered totals and strict selected-scope items. Legacy or invalid scope stays explicit; raw metadata is not exposed. Packing and other detail panels remain pending.

### Fulfillment exception history

`dispatch.fulfillmentExceptions({ salesId, fulfillmentId, cursor? })` requires manager access and validates the non-deleted order/fulfillment pair before reading exceptions. It returns explicit presentation fields only, excluding raw metadata, in descending ID pages of 20 with nextCursor. Deleted exceptions are omitted; resolved records remain visible. Missing or unrelated pairs return NOT_FOUND.

### Fulfillment proof registration summary

`dispatch.fulfillmentProof({ salesId, fulfillmentId })` requires manager access and validates the non-deleted pair before reading completion metadata. Returns proof state and explicit registered document presentation fields. Document IDs in metadata are trusted only after matching StoredDocument ownerType=dispatch, ownerId=fulfillmentId, ready status and non-deleted state. Raw storage paths and completion request identifiers are excluded. File preview/download is pending.

### Fulfillment route projection

`dispatch.fulfillmentRoute({ salesId, fulfillmentId })` requires manager access and matches the non-deleted parent-child pair before selecting shipping address and delivery metadata. Returns only deliveryMode and the shared driver destination projection, including original/confirmed address, source and confirmation requirement. Unrelated or missing pairs return NOT_FOUND.

### Fulfillment activity history

`dispatch.fulfillmentActivity({ salesId, fulfillmentId, cursor? })` is manager-only and validates the non-deleted pair first. Returns creation context and 20-row SalesHistory pages ordered by createdAt/id descending, filtered by salesId plus JSON dispatchId. Presentation exposes name/author/time and source/target schedule dates only. General order notes without a matching dispatchId are excluded. New fulfillment command audit writers must include dispatchId and salesId.

### Planned create-assignment command contract (not exposed yet)

The shared create schema requires request UUID, salesId, expected SHA-256 evidence revision, nullable driver/date, delivery mode and full/selected scope. Stable revision hashes canonical quantities and persisted fulfillment headers; stable payload fingerprint binds retries to the same intended command. These helpers are not a transaction or API endpoint: locked reads, durable idempotency and authoritative permission checks remain pending.

### Internal planned-assignment transaction step

`createFulfillmentAssignmentInTransaction(tx, input, actor)` requires an enclosing transaction and prior authoritative manager/driver/destination/order-policy authorization. It locks order and fulfillment headers, reloads canonical evidence, checks expectedRevision, creates scope-only OrderDelivery metadata, and writes a SalesHistory FULFILLMENT_ASSIGNED record keyed by request UUID with fingerprint and dispatchId. Exact retries return the original ID; conflicting reuse fails. No API exposes this helper yet. Notification/outbox integration and compatibility with legacy writers remain pending.

### Fulfillment assignment form options

`dispatch.fulfillmentAssignmentOptions({ salesId })` requires manager access and a non-deleted sales order. Returns explicit nullable dueDate, normalized deliveryMode, canAssign/blockedReason, canonical backlog and named remaining line quantities, plus the revision consumed by the internal transaction step. Full mode must use all returned remaining quantities; mutation still re-reads evidence. Existing unknown scope and closed orders remain non-assignable.

### Planned fulfillment create endpoint

`dispatch.createFulfillment` now exposes the strict assignment input. Requires dispatch-manager authorization and existing special-order DISPATCH policy, validates destination for assigned deliveries and selected driver's active HRM eligibility, and runs the reservation helper in a ReadCommitted transaction. Destination is revalidated from locked order evidence. Returns fulfillmentId, idempotentReplay and notificationFailed. Existing notifications run after a new commit only. Durable delivery retries/outbox remain pending; do not treat notificationFailed as a failed reservation.

Backlog correction: projection.backlogQty is zero without a non-cancelled fulfillment. It is distinct from the sum of availableToAssign. Assignment options now expose availableQty for first-fulfillment previews and eligibility; create checks remaining quantities, not backlog status.

### Fulfillment edit options

`dispatch.fulfillmentEditOptions({ salesId, fulfillmentId })` requires manager access and the matching non-deleted order/fulfillment pair. Returns current scope/driver/date and canonical revision, plus editable capacities computed by excluding only this reservation. It preserves other reservations and returns canEdit/blockedReason for lifecycle and evidence restrictions. This is prefill data, not mutation authorization; transactional save must repeat all guards.

Internal edit command now updates scope/driver/date in an enclosing transaction after order/header locks, lifecycle/revision checks and physical-floor validation. It preserves unrelated metadata and records FULFILLMENT_UPDATED under request UUID with payload fingerprint, previous/new driver, planned/backlog totals and changed flag. It is not yet exposed by a router; caller authorization and notification integration remain required.

The shared `updateFulfillmentAssignmentSchema` adds a positive integer fulfillmentId to the strict creation command with all refinements retained. Both internal validation and the upcoming endpoint must consume this schema; status/completion fields are rejected rather than accepted as edit inputs.

`dispatch.updateFulfillment` now consumes that schema and requires manager access, special-order DISPATCH policy, active eligible driver and assignment destination. Its ReadCommitted transaction repeats paired identity, lifecycle, revision and quantity guards. Returns fulfillmentId, changed, idempotentReplay and notificationFailed. Newly committed changes send sales_dispatch_updated to an unchanged driver, or sales_dispatch_unassigned/assigned to the old/new drivers. No-op and replay suppress sends. Notification delivery is currently post-commit best effort; durable retries remain open under Ticket 09.

Edit-option eligibility also rejects cancelled/canceled parent orders, matching the save transaction. Item titles and sizes fall back to the existing commercial item description and control subtitle.

dispatchOverviewV2 applies saved fulfillment scope to displayed packing targets before calculating its summary. Planned quantities replace whole-order targets; additional availability is capped by assigned minus currently listed quantities. Unassigned lines are omitted unless physical allocations require review. Missing assigned manifest lines fail with a review message. This does not yet scope every inventory component, slip or mobile manifest path.

For planned scopes, submission-backed deliverables consume one shared remaining capacity across rows, retaining submission IDs and exact LH/RH limits. This prevents row totals from exceeding the capped overview deliverable quantity. Legacy scopes retain their existing rows.

`dispatch.confirmFulfillmentShortLoad` requires a dispatch manager or current driver and special-order DISPATCH policy. It locks order/header rows, rechecks parent identity and current driver after the locks, then invokes the shared confirmation transaction. Input is requestId, salesId, fulfillmentId, expectedRevision; actual quantities are read from persisted packing, never supplied by the client. Inventory-backed allocations currently require review rather than automatic release. Confirmation UI and notification integration remain pending.

`dispatch.fulfillmentShortLoadPreview({salesId, fulfillmentId})` is protected for the current driver or manager and returns named assigned/packed/leftBehind lines, releasedQty, revision, canConfirm and blockedReason. Preview performs no writes and does not replace locked confirmation guards.

The short-load inventory guard ignores deleted, released and cancelled allocation rows. Any remaining active allocation requires inventory reconciliation before scope release; historical returned allocations alone do not block it.

Fulfillment evidence revisions include packed quantities as well as ordered, assigned, delivered and available quantities. A packing-only change invalidates existing edit/assignment/short-load previews even when total assigned remains unchanged.

Short-load confirmation returns notificationFailed independently of its committed result. A newly committed positive release sends sales_dispatch_updated to the driver captured under lock; replays and zero releases send nothing. Delivery is currently best effort, pending durable retry integration.

Existing inventory dispatch `release` transitions with orderDeliveryId and a smaller allocationSelections quantity now split the allocation: original quantity/status retains the remainder and a new released allocation records the selected amount. This is a primitive for explicit inventory returns; short-load confirmation does not invoke it automatically yet.
# Short-load inventory reconciliation inputs

Bulk fulfillment's ensure helper creates exact remaining scope and a `FULFILLMENT_ASSIGNED` SalesHistory event atomically. Event source is `bulk_fulfillment`; payload includes actor ID, dispatch ID, order-derived schedule, planned total and scope lines. Reusing a fulfillment does not create another assignment audit.

`confirmFulfillmentShortLoad` additionally accepts optional `expectedInventoryRevision` (SHA-256 hex) and `physicalReturnsConfirmed` (boolean). Active inventory allocations require the revision; the command locks and reloads inventory, validates the revision, and requires explicit confirmation before releasing excess picked stock. Reconciliation and scope/audit changes share the caller transaction. Replay compares both inputs, treating omitted confirmation as false. `fulfillmentShortLoadPreview` exposes `inventoryRevision`, `requiresPhysicalReturn`, and `inventoryReleases`; invalid inventory remains blocked. Client submission and physical-return UI integration are pending.

### Shared worker inbound overview — 2026-09-10
productionInboundOverview and productionInboundActivity accept salesOrderId/inboundId, authorize current Production scope, and return the shared overview DTO/activity. Worker overview filters item demands to authorized components. addProductionInboundNote accepts salesOrderId/inboundId and trimmed note (1–10000 characters); authorization is rechecked in its transaction, and it creates an inboundId-tagged comment without status writes.

### Inbound creation activity — 2026-09-10
Inbound creation orchestration forwards an internal creatorUserId derived from the authenticated actor, never from the public creation input. Shared creation writes an inbound-tagged NotePad creation event before committing. Quick availability retries retain their existing transaction/idempotency behavior.
### Sales request preview — 2026-09-10

`salesRequest.generatePreview` is a protected, off-by-default backend prototype.
Input: bounded nonblank `text` plus the stable empty placeholder `images: []`.
It carries no customer/profile pricing context because the endpoint returns only a
native seed; normal new-form bootstrap supplies that context later.
It accepts no client setting ID, candidate catalog, price, cache scope, image URL,
media type, or base64 payload. Image and mailbox input are separately deferred.
Output contains a strict native `NewSalesFormSeed`, configuration scope/revision,
prompt version and token usage. The seed is checked against configured route, step,
component, cardinality and visibility rules, and the configuration revision is
rechecked after generation. It is not hydrated, priced, or saved. The implemented
shared `initializeNewSalesFormSeed` boundary—not this API—expands the seed through
normal form logic when a future UI/apply adapter supplies authoritative form data
and pricing context.

HPT door output is a strict route-aware union: `noHandle:true` uses
`{dimension,totalQty}`, while handled routes use
`{dimension,lhQty,rhQty,swing?}`. Effective flags include selected-component
`sectionOverride` precedence. The endpoint groups identical HPT configurations,
aggregates duplicate size rows, verifies line quantity against the HPT-row sum, and
requires one selected Door or a line-scoped unresolved Door. Width is not a step.
The compact snapshot carries sanitized price-free door-size variation rules; the
endpoint canonicalizes each source-stated dimension against the selected Height's
`deriveDoorSizeCandidates` result before returning the seed.

Configuration snapshots are cached as compact tuple JSON under server-owned
`sales-settings:<id>` scope and a price-free structural revision. Cache storage is
an optimization: invalid/missing Redis artifacts rebuild from the database, and
pre/post structural probes prevent stale concurrent publication. Price-only edits
do not invalidate the prompt snapshot because prices never enter this endpoint.

`salesRequest.setDefault` is a protected Super Admin-only mutation accepting
`{rootUid, stepUid, componentUid}` where nullable `componentUid` clears the default.
The server derives the active settings ID; client `settingId` is rejected. The write
locks and validates the target route/step/component, preserves unrelated metadata,
and returns the normalized defaults result.
Requires `SALES_REQUEST_AI_ENABLED=true`, the selected provider's server-only
`SALES_REQUEST_*_API_KEY`, and usable Redis.
The endpoint uses the same explicit lowest-active-ID sales-settings authority as
the New Sales Form; clients and environment variables cannot select a divergent
row. Provider and model are never selected by environment variables.
`salesRequest.getAISettings` and `salesRequest.updateAISettings` expose the
server-approved provider catalog and the persisted selection; updates preserve
unrelated metadata. Generation reads this selection with its configuration
snapshot and rejects a result if either changes during the provider call.
No environment values were changed.
Endpoint registration/typechecking and isolated service tests are verified;
live authenticated/model acceptance is not yet verified.

# Completion notice recovery

completeDispatchWithProof requires a trimmed, nonempty receivedBy (maximum 200 characters). The driver proof form validates the same requirement and displays its existing inline field error. A signature alone no longer satisfies recipient identification.

Completion input accepts optional positive expectedFulfillmentRevision. Scoped preview callers should send the reviewed revision; admin pre-packing and locked finalization reject a stale revision before their respective writes. The revision participates in completion retry fingerprinting. Legacy callers can omit it during migration; preview UI wiring remains pending.

The manager-protected fulfillmentDetail response exposes scopeRevision from the saved assignment scope, or null when no valid scope exists. A completion preview can pass that value as expectedFulfillmentRevision; null must not be interpreted as a reviewed scope.

Fulfillment completion persists a FULFILLMENT_COMPLETED history event and current-driver notification intent atomically. The completion worker resolves that audit and delivers the inbox activity through the receipt boundary; failed delivery queues recovery, and the pending sweep includes completion events. Notification jobs accept optional skipActivities to preserve external delivery without a duplicate inbox activity. Durable completion inbox delivery is addressed to the saved driver; legacy events without an audit keep existing behavior. Live worker and concurrency acceptance remain pending.
### 2026-09-10 — Fulfillment completion review contract

`dispatch.fulfillmentCompletionReview` is manager-protected and requires an exact `salesId`/`fulfillmentId` pair. It returns the packing manifest revision, delivery mode, scope revision, assigned/packed/left-behind quantities, order and previously-delivered context, and whether short-load confirmation is required. Unknown, terminal, unresolved, overpacked, or concurrently changed scopes return a blocked review rather than inferred quantities. The returned manifest revision is passed unchanged to `completeDispatchWithProof`, which performs its own locked finalization recheck.

### Sales request seed v2 and catalog publication — 2026-09-11

`NewSalesFormSeed` v2 adds strict custom `{stepId,value}`, native
`lineItems[].meta.serviceRows[{uid,service,qty}]`, top-level
`form.deliveryOption`, and at most one exact Delivery extra-cost row. Version 1
remains readable. Prices, totals, persisted IDs, and arbitrary metadata are
forbidden. Model configuration omits persisted custom rows, sparsely marks custom
steps, and may contain at most 20 sanitized `serviceNames`.

Post-generation validation additionally binds custom values, service labels,
delivery intent, and delivery charges to literal normalized customer-text evidence.
Service rows are valid only on the configured Services root route; generic
delivery/shipping/freight/pickup labels must use native delivery fields. The shared
initializer emits blocking review issues for transient custom selections, every
zero-priced generated service, and delivery without a stated amount. Manual catalog
regeneration stores the combined artifact under the exact published revision key;
the independently versioned service cache is best-effort and falls back to its
bounded fresh query on cache failure.

`salesRequest.updateCatalogPolicy` accepts bounded grace days and normalized
pin/exclude UID arrays. `salesRequest.regenerateConfiguration` accepts no input,
requires settings administration, records generation state, and never creates a
provider or reserves usage.

### Sales request native Mouldings rows — 2026-09-12

`NewSalesFormSeed` v2 line metadata may contain exactly one grouped-row family.
`mouldingRows` is a nonempty array whose unique UIDs must exactly match the selected
UIDs on the configured multiple-selection Moulding step:

- Direct pieces: `{uid,qty}` with a positive integer quantity.
- Linear feet: `{uid,calculation:{linearFeet,pieceLength,wastePercentage?}}`.

The provider boundary validates calculator facts before normalization and returns
only native `{uid,qty}` rows, with line quantity recalculated from the rows.
Moulding rows cannot coexist with service rows or HPT doors. Model-supplied prices,
totals, selected component snapshots, and persisted identities remain invalid.

The server binds each row to the configured Mouldings route and an exact selected
component title or unique alphanumeric catalog profile/SKU. Direct quantities
require explicit piece/count syntax in the same product request segment instead of
merely appearing inside product dimensions. Linear feet and waste are likewise
bound to that segment; commas remain inside the same product segment so trailing
qualifiers such as “including 10% waste” remain attached. Newlines, semicolons, and
numeric conjunctions delimit distinct product requests. Explicitly stated waste
cannot be dropped. Piece length must be encoded by and match the catalog title, so
dimensionless catalog titles fail closed instead of receiving the form calculator's
ordinary 16-foot UI fallback. Generic categories remain unresolved instead of
selecting an arbitrary component.

The evaluation corpus may include strict optional raw-output and normalized-seed
oracles. Results expose `providerOracle` for the provider's unnormalized structured
output and `seedOracle` for the authoritative form-ready seed; normalization must
not hide a raw model mismatch. Both scorers ignore transient line/row UIDs,
form-step ordering, and multi-select UID ordering, but require identical
step/component sets, quantities, delivery facts, unresolved facts, and grouped
native row meaning. Run manifests list `providerOracleCaseIds` and
`seedOracleCaseIds` independently so a case with only one oracle remains visible in
the archived scoring coverage. Mock corpus runs must not be presented as provider
accuracy or token/cost evidence.

Ordinary sales-request provider creation retains one automatic AI SDK retry. The
live corpus runner explicitly overrides that value to zero; its manifest records
`maxRetries: 0`, provider/model, prompt/configuration revisions, timeout, output
limit, usage, and end-to-end generation latency. A failed live attempt requires new
explicit authorization before another billed request.

For House Package Tool rows, an unresolved Door may substitute for a selected Door
only when its `lineUid` matches the line, its `stepId` is the Door step on that
line's active route, and its normalized `field` is exactly `door`. A Door step from
another route or an unresolved width/height fact cannot authorize HPT rows.

### Progressive assistant public contract — 2026-09-12

`apps/api/src/assistant/contracts.ts` defines the first executable assistant
boundary. Tool identities use lower snake case `<domain>_<action>` plus a positive
integer version. Capability states are `implemented`, `coming_soon`, `disabled`,
and `degraded`; effects are `read`, `draft`, `artifact`, `write`, `external_send`,
and `destructive`.

Every result validates stable status, bounded sources/warnings/next actions,
observation time, and distinct artifact/job references. Tool-specific `data` is
accepted only through `createAssistantResultEnvelopeSchema(outputSchema)`, so each
registry tool must supply its own Zod output schema. Artifact and job lifecycles
remain separate. ADR-090 and the assistant implementation contract own the broader
runtime, authorization, MCP, and UI decisions.

### Employee mobile access contract — 2026-09-12

- Platforms are `ANDROID | IOS`. Statuses are `REQUESTED | APPROVED | INVITED |
  ACCEPTED | INSTALLED | REJECTED | CANCELLED`.
- Employee request input contains platform plus an optional trimmed 500-character
  note. Actor and employee ID are never accepted from the client.
- Admin update input contains positive request ID, a non-Requested target status,
  optional 500-character employee-visible/internal notes, and an optional
  255-character non-secret distribution reference.
- Employee output contains lifecycle timestamps and event history but excludes
  internal notes, invitation provider/reference, and reviewer details.
- Admin output includes audit/admin fields plus legal next statuses. Concurrent
  status changes fail with conflict instead of overwriting another reviewer.
- For new iOS `INVITED` transitions, internal `invitationProvider` is
  `MANUAL_PUBLIC_APP_STORE_GUIDANCE`: the admin has sent account/download
  guidance after public release, not an Apple tester invitation. Historical
  `MANUAL_APP_STORE_CONNECT` values remain unchanged. Android continues to
  record `MANUAL_ANDROID_DISTRIBUTION`. Provider/reference stay admin-only.

### Progressive assistant stream contract — 2026-09-12

The chat POST accepts a strict bounded object containing `conversationId`, `requestId`, and one latest `role: "user"` UI message. User parts are limited to text and server-owned document IDs; client-authored assistant/tool/reasoning/source parts, raw file URLs, and unknown keys fail validation. Mentioned integration IDs must resolve inside the authenticated actor's connected-app scope.

Actor scope comes from the active user and one active organization-role assignment. Soft-deleted users, organizations, assignments, roles, role-permission pivots, permission definitions, and individual grants cannot authorize work. Locale, timezone, organization, role, and operation grants are server context rather than client claims.

The stream uses typed `data-rate-limit`, `data-title`, `data-run`, `data-sequence`, `data-source`, `data-warning`, and `data-terminal-status` parts. Request/run creation is atomic; repeated request identities replay the existing run, and only the executor that atomically claims queued state may invoke runtime work. Cancellation wins over a late provider success. Returned and thrown provider errors are normalized and persisted without raw provider text.

Production rate/concurrency enforcement uses one atomic Redis admission command plus renewable token-owned leases and fails closed if Redis is unavailable. Reconnect output is mapped through an explicit DTO and uses private, no-store responses. T04 supplies the real model runtime; T07 supplies connected-app resolution.

### Progressive assistant runtime contract — 2026-09-12

The runtime resolves one allowlisted provider/model identity on the server and records that identity with `assistant-catalog-v1` and `gnd-assistant-prompt-v1`. Each foreground execution is limited to ten AI SDK tool-loop steps, twelve eligible discovery tools, one retry, 4,000 output tokens, and 45 seconds. Token usage is reduced to finite nonnegative counts plus provider/model identity before persistence.

Model messages come from bounded actor-and-scope-filtered durable history. The 40-message/48,000-character window retains complete messages and removes orphaned leading assistant turns. Assistant text is saved through the generated-message idempotency boundary before success is terminalized. Cancellation before that commit prevents persistence; a late abort after committed history retains success. Provider and cleanup errors cannot expose raw text or replace an already valid outcome.

### Progressive assistant MCP registry contract — 2026-09-12

`assistant-catalog-v1` is the single versioned source for MCP exposure, model discovery, UI capability catalogs, future recipes, and diagnostics. Definitions contain a stable lower-snake-case ID, positive version, domain, strict Zod input/output schemas, capability, effect, grants, presentation metadata, related tools, and always-active state. Public catalog/index records omit handlers, actor context, results, and secrets.

Availability and authorization are intersected before Toolpick ranking. Each execution resolves current authenticated access, requires the same user and scope as the originating turn, rechecks the tool grants, parses input again, and validates the tool-specific result envelope. In-memory MCP client/server pairs belong to one request and close across normal completion, cancellation, setup failure, and provider failure. Search and capability-explanation tools remain active so unavailable, degraded, disabled, and coming-soon capabilities can be represented without exposing an executable handler.

### Dashboard chat state contract — 2026-09-13

- The AI SDK transport adapts its message list to the strict server request: `{ conversationId, requestId, message: latestUserMessage, timezone, localTime, mentionedIntegrationIds }`. Earlier messages and client-authored assistant parts are never reposted.
- Persisted conversation hydration accepts only user and assistant roles. Stream `data-title`, `data-rate-limit`, `data-run`, `data-sequence`, `data-warning`, and `data-terminal-status` parts update client state.
- Conversation list accepts bounded `search`, `includeArchived`, and `take`. Conversation fetch includes ordered persisted messages and the latest run's ID, status, and reconnect sequence.

### Sales Request Generation pilot telemetry contract — 2026-09-13

Generation creates a server UUID and 90-day deadline. The durable payload is
metadata-only: actor binding, settings scope/revision, provider/model/prompt/schema
versions, a text-present boolean, status, bounded latency/token/issue counts,
bounded apply/save/feedback categories, changed-field categories, and correction
duration. Raw or normalized request text, images, contacts, credentials, generated
seed JSON, provider bodies/errors, and prices are forbidden. A retained successful
run may hold only the native Sales ID created from it for final-save idempotency.

Successful completion may persist a `h1:`-versioned HMAC binding derived server-side
from the validated seed plus generation/configuration identity. It is pseudonymous,
run-scoped metadata—not request content or client proof. Invalid bindings are
omitted, expired runs reject completion, and account anonymization clears it.

`consumeSalesRequestGenerationRun` is an internal transaction-owned compare-and-set,
not a public endpoint. It requires the creating actor, `succeeded` status, pasted
text, completed time, seed digest, active retention, and no conflicting Sales binding.
Same-generation/same-Sales retry is idempotent. Account anonymization clears actor,
seed digest, and Sales binding together. The binding is an immutable logical pointer,
not a Prisma relation; Sales deletion cannot reopen it, and completion cannot mutate
an already-consumed run.

`recordOutcome` is actor-bound and idempotent for each outcome slot. Apply/save
outcomes may move only toward terminal success (`blocked|stale|unavailable` to
`applied`, or `failed` to `saved`); late failures never replace success. Other
conflicting repeats fail; expired, deleted, absent, and cross-actor identities are
indistinguishable. `pilotSummary` reads one exact closed seven-day UTC interval and
returns aggregates only, including latency p50/p95 and explicit blocked/stale/
unavailable Apply plus failed/successful draft/final-save counts. More than 10,000
rows fails completeness rather than returning a truncated aggregate.

The same summary returns `representativeComparison` over successful applied final
saves only. `assistiveTextFirst` contains rows without a generation-to-Sales
consumption binding; `lowTouchConsumedFinalSave` contains rows atomically consumed
by the low-touch transaction. Each arm exposes finalization count,
generation-start-to-successful-final-save sample count/p50/p95, and correction rate
as Accepted-with-edits over Accepted plus Accepted-with-edits, returned as reviewed
count, edited count, and basis points. `comparison` returns low-touch-minus-assistive
p95 and correction-rate deltas only when every finalized row in both arms has valid
timing and accepted-review evidence; otherwise it returns deterministic completeness
blockers and no deltas. The delta is explicitly descriptive observational evidence,
not randomized or request-family-matched evidence, and is never by itself eligible
to authorize increased autonomy. An anonymized, absent, or malformed actor or
consumption identity is excluded from both arms. The response never exposes the
selected generation, actor, Sales IDs, or source timestamps.
Scheduled retention deletes rows with
`retentionUntil <= now`, including soft-deleted rows, and returns only
`{ purgedCount, retentionDays: 90 }`.

### Sales Request Generation pilot access contract — 2026-09-13

Sales Settings owns a nested, revisioned pilot record containing only `enabled`,
named cohort user IDs, named reviewer user IDs, revision, and change timestamp.
Enabling requires at least one cohort member and one reviewer. Writes normalize IDs,
preserve unrelated Sales metadata under a serializable row lock, and reject any
deleted, revoked, or unknown named user before persistence.

`getPilotAccess` accepts exactly one create surface, `order` or `quote`, and returns
only safe eligibility flags/reason plus the settings revision. `generatePreview`
requires the same surface in its strict input. The pasted-text dashboard sends
`images: []`; the server accepts only that empty placeholder and exposes no dormant
media type, base64, or byte-limit contract. The route always forwards an empty image
list to generation. No image or mailbox client path is part of this pilot.

### Sales Request Generation native unsaved preview contract — 2026-09-13

Human Apply marks the native in-memory New Sales Form record as requiring an explicit
save. Debounced autosave is disabled while this transient hold is active. Local
recovery persists only the hold boolean beside the ordinary native recovery payload;
it does not persist source text, model output, generation IDs, or provider data.

`buildApprovedSalesRequestInvoicePreview` is a local pure composition boundary. It
requires the transient human-applied explicit-save hold plus an unsaved record and
returns the existing Sales `PrintPage` invoice shape. It remains available after
local recovery without persisting source text, provider output, generation IDs, or
undo snapshots. Preview opens this page in memory and returns before its persistence
flush; Print and PDF download remain blocked while the hold is active. The composer
has no API endpoint, mutation, document-token, or outbound-delivery capability.

The Preview action resolves customer/address data through `newSalesForm.resolveCustomer`
and current print settings through the narrow protected
`newSalesForm.getPrintContext` query. The print-context query reads only the current
Sales setting ID and metadata directly; it neither loads the component workflow graph
nor exposes a general client cache-bypass flag. Resolved customer/address DTOs include
business name and address-specific phone/email fields required by the existing print
composer. Neither read persists the Sales form.

### Sales Request Generation low-touch final-save claim — 2026-09-13

`newSalesForm.saveFinal` reserves an optional strict `lowTouchClaim` containing
`source:"pasted-text"`, UUID `generationId`, configuration scope/revision, an
allowlisted provider/model pair, and a strict `NewSalesFormSeed`. Draft saves do not
retain this field. The final-save query splits the envelope from the ordinary native
payload before any diagnostic capture or persistence.

Durable successful-generation telemetry supplies the server-derived seed HMAC used
by the transactional comparison. A claim now activates fresh authority resolution
inside the native Serializable save transaction. Missing or stale benchmark,
generation, configuration, commercial, permission, replay, pricing, tax, or stock
evidence returns `PRECONDITION_FAILED` before the first Sales write. Ordinary
explicit human final saves remain on the existing path.

Human Apply binds exact preview metadata and seed to the semantic revision of the
applied native record. Explicit Finalize sends the ephemeral claim only while that
revision still matches; edits, recovery, Undo, Save Draft, and ordinary manual saves
clear or omit it. Final-save authority also requires exactly two passing adjacent
T10 review periods under the current server-built authority. Pilot membership and
benchmark approval alone are insufficient.

The internal commercial-authority contract now resolves exact active office
customer/profile/address/tax records and returns only their IDs, coefficient, tax
percentage, and a versioned opaque revision. It accepts a transaction-compatible DB
surface, makes no fallback selections, and treats missing, ambiguous, stale,
cross-customer, malformed, or case-insensitive impostor facts as blockers. It is not
an endpoint; `saveFinal` now invokes it inside the native Serializable transaction
whenever a low-touch claim is present. Tax-exempt low-touch requests remain
unsupported pending explicit exemption proof.

The internal generation-run authority accepts the strict ephemeral claim plus the
authenticated actor and a transaction-compatible telemetry reader. It requires one
unexpired successful completed pasted-text run, exact run/configuration/provider/
model identity, current prompt and output-schema versions, and a constant-time match
between the retained `h1:` seed binding and a server-side replay. It returns only
metadata needed by preflight, including the binding and prior consumption ID; it
does not return or persist the claim seed, source text, or provider response.

The internal permission authority accepts only the authenticated actor ID and the
native target surface. It re-resolves one active, non-revoked user plus active
role/role-permission and individual-grant evidence, then allows only Super Admin or
the exact `editOrders` grant for both new orders and quotes. It returns actor ID,
surface, grant kind, and a versioned opaque revision, with no contact or credential
fields. It is a transaction-compatible internal read contract, not an endpoint, and
does not widen existing Sales permissions.

The internal stock authority accepts the fully initialized native candidate and a
read-only transaction client. It reuses the shared inventory sync mapper, resolves
unique active tracked Inventory/Variant/category identities, and returns a
versioned revision plus exact per-line/component/HPT/Mouldings quantities and
observed physical/committed/pending-review capacity. Missing, ambiguous, untracked,
malformed, overcommitted, or insufficient evidence fails closed; Shelf Items and
Services are outside the first cohort. This is observational evidence recomputed
inside the native Serializable save transaction. It reserves or allocates nothing.

The composed final-save authority replays the claimed seed through the current New
Sales Form initializer with fresh route/default/component data and authoritative
profile coefficient/tax percentage. It compares that result against the submitted
record after both use the same native hydration and commercial-fingerprint rules.
Successful native writes, generation consumption, and the versioned metadata-only
Sales History audit are atomic. A draft-key recheck and bounded low-touch-only
P2002/P2034 retry cover create races. After a committed response is lost, only one
exact same-actor/generation/Sales/configuration/model/fingerprint audit permits a
read-only replay; no Sales write, second audit, consumption, or post-save job runs.

### Sales Request Generation provider-benchmark approval — 2026-09-13

`salesRequest.updateProviderBenchmarkApproval` accepts one strict administrative
decision: `approved`, allowlisted `provider`/`model`, bounded `evaluationRunId`,
`corpusVersion`, `policyVersion`, current 64-hex `configurationRevision`, current
`promptVersion`, positive bounded `schemaVersion`, and a lowercase
`sha256:<64-hex>` evidence digest. Actor, time, and decision revision are always
server-derived. Unknown keys—including client actor metadata—are rejected.

The write selects the active Sales Settings authority server-side and then locks and
revalidates that authority, provider/model, configuration, prompt, schema, corpus,
and policy inside a serializable transaction. The settings read surface returns both
the auditable historical record and a current/approved result that is false for every
missing, malformed, revoked, default-only, or stale identity. Evidence content,
provider output, source text, credentials, prices, and seed JSON are never stored.

### Progressive Assistant Sales/customer tool contract — 2026-09-13

`assistant-catalog-v2` adds seven strict version-1 read identities:
`sales_find_orders`, `sales_get_order_status`, `sales_explain_blockers`,
`sales_get_timeline`, `customers_find`, `customers_get_summary`, and
`customers_get_order_history`. Their Zod outputs use the shared typed Assistant
envelope, bounded record sources, executable next actions, and validated order or
customer entities.

Sales detail projects the canonical `sales-pipeline/v2` snapshot and returns decimal
money and quantities as strings. Duplicate order/quote identities return
`requires_input`; stale expected revisions return `conflict`. Detailed revisions
include child delivery, payment, statistic, pipeline, and timeline-history evidence.
Customer results use `cust-<id>` as the supported non-contact route key and omit
phone, email, address, metadata, and raw history payloads. Payment values and
payment-dimension blockers are null or absent unless the actor has the existing
payment-view grant.

### Progressive Assistant operations/Community tool contract — 2026-09-13

`assistant-catalog-v3` adds nine strict version-1 read identities:
`inventory_check_status`, `inventory_get_demand`, `production_check_status`,
`production_get_schedule`, `fulfillment_check_status`,
`fulfillment_explain_exceptions`, `community_search`,
`community_get_project_summary`, and `community_list_units`.

Inventory quantities distinguish physical stock, committed allocation,
pending-review allocation, inbound quantity, and outstanding demand. Production
reads bind worker results to active assignments and active Sales orders; manager
reads remain organization-scoped. Community summaries gate each child resource
family independently and never return install costs. All outputs use bounded
pagination, source records, evidence-backed revisions, related actions, and typed
Community project/unit entities.

### Sales Request Generation exact pilot review period — 2026-09-13

`salesRequest.pilotSummary` accepts exactly `{ periodStart: YYYY-MM-DD }` and
derives one closed seven-day UTC interval using half-open `[from, toExclusive)`
semantics. It resolves current Sales Settings, configuration, provider/model,
prompt/schema, pilot revision, and benchmark approval in the same repeatable-read
transaction as telemetry. Closed, retained, non-truncated intervals remain
reviewable after rollback or authority drift, while stable blockers and
`eligibleForAdvancement: false` prevent those metrics from authorizing expansion.
This intentionally replaces the earlier rolling `{ days }` pilot-only contract;
there was no production caller in the repository when it changed.

The response contains the period, coverage state, safe authority identity, stable
blockers, advancement eligibility, and aggregate metrics. Only open, retention-
expired, or over-10,000-row coverage returns `metrics: null`; empty, legacy, mixed,
incomplete, disabled, or stale-authority periods remain visible but cannot advance.
It never returns
run IDs, actor IDs, request/customer text, generated seeds, provider bodies, contact
data, or credentials.

Provider execution now uses a three-stage metadata lifecycle: durable `beginRun`,
durable `markProviderAttempted`, and best-effort `completeRun`. Failure of either
pre-provider write prevents provider construction and invocation. A terminal-write
failure preserves the valid preview but leaves the run visibly incomplete for
advancement. The summary includes privacy-safe evidence coverage for terminal
lifecycle, provider-attempt marker/latency, input/output tokens, issue counts,
feedback, Apply semantics, and edited-correction samples. Missing tokens are null,
not zero. `eligibleForAdvancement` remains false unless explicit thresholds and a
verified review signoff evaluate to pass; the current endpoint does not accept
client-authored thresholds or signoff.

Feedback is keyed by the exact generation UUID. Before Apply only categorized
Rejected feedback is valid; after successful Apply, Accepted, Accepted with edits,
or categorized Rejected is valid. A successful pre-Apply rejection is terminal for
that proposal and races atomically against Apply. `correctionMs` is server-derived
from successful Apply to Accepted-with-edits feedback only.

## Progressive Assistant PDF artifacts (2026-09-13)

`assistant-catalog-v5` defines typed status, generation, and cancellation contracts
for invoice, quote, packing-slip, Production, and order-packing PDFs. Jobs and
artifacts keep separate lifecycle states and return opaque snapshot/document IDs,
canonical source revisions, expiry, and dashboard entity references. Trigger run
IDs are operational metadata and never authorize document access.

Generation and cancellation handlers remain `coming_soon` until T17 supplies the
approval execution boundary. Their durable handlers already enforce one stable
idempotency key, terminal stale/conflict outcomes, bounded retry, and cancellation
without external-send side effects.

### Sales Request Generation durable pilot review contract — 2026-09-13

The active Sales Settings metadata may contain `pilotReviewPolicy` with a strict
provider/model, threshold policy, server-derived SHA-256 digest, revision, actor,
and UTC change timestamp. An identical digest is a no-op. Changing thresholds
requires a new `policyVersion`, increments the policy revision, and increments the
pilot-settings revision so earlier periods cannot silently retain authority.

`salesRequest.recordPilotReviewDecision` accepts only:

```ts
{
  periodStart: "YYYY-MM-DD";
  decision: "pass" | "fail";
  signoff: {
    unsafeApplyCount: number;
    ambiguousUnsupportedFactCount: number;
    ambiguousUnsupportedVisibleCount: number;
    saveReopenCheckedCount: number;
    saveReopenSucceededCount: number;
  };
}
```

Reviewer identity, review time, benchmark status, authority match, evidence digest,
policy digest, and final decision are server-owned. Pass cannot override a failed
threshold. Evidence must describe one closed, retained, complete seven-day UTC
period under the current configuration/provider/model/prompt/schema/pilot/
benchmark/policy authority. `(settingId, periodStart)` is immutable and duplicate
writes conflict.

`pilotSummary` returns only aggregate current-period evidence plus safe decision
metadata for the latest two stored periods. Before evaluation, stored JSON is
parsed and all authority/evidence/policy digests are recomputed. Missing, invalid,
nonadjacent, failed, stale-authority, or policy-mismatched periods produce explicit
blockers and `eligibleForAdvancement: false`.

## Progressive Assistant saved-action contracts (2026-09-13)

Prompt shortcuts contain a bounded prompt template. Deterministic recipes contain
a registry tool/version identity derived from a durable successful execution, a
strict recursive JSON template, unique typed parameters, bounded output paths, and
a catalog compatibility revision. Execution returns `prompt_ready`,
`repair_required`, a typed safe result, or a fresh `requires_approval` proposal;
saved approval tokens are not part of the contract.

## Progressive Assistant feature-request contracts (2026-09-13)

Missing capability is distinct from denial, ambiguity, outage, unmet prerequisite,
and degraded rollout. Submission accepts a durable client request UUID, editable
bounded summary, minimal scoped evidence, and independent release opt-in. Analysis
uses a strict output schema and a category-scoped knowledge snapshot capped at
64,000 UTF-8 bytes. Release publication derives title and structured grants from
the exact implemented registry version and requires nonfuture rollout verification.

### Sales Request final-save exception contract — 2026-09-13

`salesRequest.listFinalSaveExceptions({ limit? })` is strict and accepts no actor,
request, customer, provider, seed, or commercial selector. It returns
`{ items, truncated }`; every item contains only `generationId`, constant kind
`final-save-failed`, `failedAt`, and `retentionUntil`. Source text, model output,
seed content, provider bodies, contacts, addresses, prices, amounts, and Sales IDs
are never selected or returned.
# Assistant consequential-action contract — 2026-09-13

- Proposal creation accepts `conversationId`, UUID `clientRequestId`, exact `toolId`/`toolVersion`, and typed tool `input`. Caller-authored review diffs are rejected.
- Proposal receipts include status, tool identity/effect, expiry, safe error code, and an authorized review containing title, exact parameters, target revision, and server-derived diff.
- Approval decisions accept `proposalId`, browser-held `approvalToken`, UUID `confirmationRequestId`, and `approve | reject`.
- Known execution envelopes map to durable success/conflict/denied/failure states. Exceptions and expired execution leases map to `unknown`; clients poll status and never repeat the effect.
- `data-assistant-document-action` is a strict persisted chat part for `documents_generate_pdf@1` with order number, mode, approved Sales revision, and regeneration choice.

## Sales Request mailbox policy contract — 2026-09-13

`salesRequest.getAISettings` includes `requestGeneration.mailbox` and
`mailboxSource`. Missing or invalid persisted policy returns a disabled,
emergency-disabled, manual-only default. `salesRequest.updateMailboxPolicy` accepts
only supported Gmail/Microsoft Graph providers, named eligible employee IDs, bounded
retention, an organization automation ceiling, and attachment controls. It derives
the active Sales Settings record on the server, normalizes lists, increments the
revision only on change, and preserves unrelated Sales metadata.

The shared provider contract normalizes account identity, token lifecycle, message
summary/detail, pages, opaque cursor recovery, and optional subscription renewal.
The initial provider consent is read-only and cannot create drafts or send mail.

OAuth state is an opaque 32-byte base64url value; only its domain-separated digest
is retained. The server record owns organization, employee, provider, fixed redirect
key, ten-minute expiry, and consumption state. Callback persistence must claim it
atomically before code exchange. Synchronization requests carry an opaque cursor or
page token plus a bounded `since` value and full-recovery flag; the shared recovery
contract permits one cursor reset and never exposes continuation secrets to clients.

Mailbox display and model text are separate plain-text projections. Both are
bounded; neither loads remote HTML content. The model projection removes conservative
quoted-history/signature markers and wraps remaining content as untrusted data, but
does not claim semantic prompt injection can be sanitized away.

`SalesRequestMailboxAdapter.listMessages` accepts one optional provider source scope
per synchronization stream: a Gmail label or Microsoft Graph folder. Missing scope
means the provider Inbox. The orchestrator will fan out configured source arrays and
persist cursors per connection plus source scope. Every page returns new/changed
message summaries and explicit provider-message tombstones; tombstones count toward
the same page/message budget and prevent provider-side deletion or label/folder moves
from leaving stale Sales Request Inbox entries. Graph next/delta URLs are opaque but
must remain on the exact Graph origin and `/v1.0/me/` path; Gmail page tokens are
wrapped with their full/history synchronization identity.

The database-independent Inbox contract accepts only bounded status, search,
API-issued opaque keyset cursor, and limit fields; clients cannot select owner,
organization, provider, source, or connection authority. Summary/detail projections
exclude provider IDs/cursors/payloads, credentials, raw errors, HTML, and model input.
Content authorization requires an active actor, current authority, exact connection
office, and connection owner. A same-office administrator may receive only bounded
connection health. Runtime job payloads are strict `{workId}` references; durable
resolvers load actor, source, message, and revision evidence server-side before the
lifecycle store repeats authorization.

Retention is the sole exception to reference payloads: its scheduler-owned task
accepts exactly `{}`. Limits and time cutoffs are package/store owned; the store uses
database current time and returns bounded aggregate counts plus `hasMore` for safe
continuation. Clients cannot invoke it with a cutoff, owner, connection, or limit.

Inbox cursors are short-lived, HMAC-authenticated `mbx1` keyset envelopes. Their
scope digest binds owner, organization, connection, connection revision, authority
revision, normalized status, and normalized search; provider cursors and raw scope
values are never exposed. Persisted mailbox model input must match the one canonical
untrusted-data envelope produced by the sanitizer. The mailbox-to-preview bridge
resolves it owner-side, sends the hardened envelope to the configured model, uses
only its decoded request for deterministic grounding checks, and repeats mailbox
authorization/content identity before the existing preview lifecycle can record
success. Its result is the existing native, review-only unsaved Sales seed.

The implemented tRPC boundary exposes connection status/start/disconnect, Inbox
summary/detail, and mailbox preview. Every call derives the actor from the protected
session and re-resolves current employee, canonical office, Sales Settings policy,
connection revision, and ownership. OAuth callback routes accept only Gmail or
Microsoft Graph, consume server-stored state, best-effort submit durable initial
sync work, and redirect to a fixed same-origin Sales Request Inbox location.
Provider authorization URLs must be bounded HTTPS URLs.

Disconnect deliberately ignores current mailbox eligibility and policy-revision
equality so policy disablement cannot trap stored credentials. Its first durable
claim still requires the active owner, active employee profile, organization, and
the same canonical office authority key; later cleanup resumes only from the exact
persisted disconnect claim.

Connection listing resolves the actor's active employee profile and canonical office
before querying. Returned rows must match owner, employee profile, organization, and
office authority key. It does not require current provider eligibility or policy-
revision equality because those connections must remain visible for disconnect.

Mailbox preview handoff routes `quote` to the native quote form and `order` to the
native order form. The handoff-only review mode may initialize a partial shell with
unresolved selections blank; normal Apply still rejects unresolved facts, and no
low-touch claim is attached to an unresolved proposal.

## Workflow component default contract — 2026-09-14

Active component DTOs expose `default: true` only when marked; false is omitted.
Default writes are component-owned and step-scoped. Request configuration and the
native initializer no longer accept route-level default maps. For an omitted safe
step, selection precedence is marked eligible component, then the first eligible
component in canonical `sortIndex/title/UID` order. Explicit, ambiguous, unreadable,
empty-family, and redirect-target behavior remains fail-closed or blank as defined
by the native initializer.

The global pasted-request shortcut calls the existing `generatePreview` contract,
then transfers that exact validated response by generation ID to the New Sales Form.
It does not introduce an API that saves or finalizes a Sales order.

## Assistant quota contract — 2026-09-14

Quota admission is server-derived, serializable, and idempotent by run ID. Policy
nulls mean unlimited. Hard mode blocks projected overage; warning and dry-run modes
record the reservation without blocking. Terminal runs settle reservation usage
from the provider ledger, while unknown receipts retain their conservative reserved
amount until reconciliation. User bootstrap omits organization-wide spend data.

## Sales Request provider diagnostic contract — 2026-09-14

Provider failures are normalized into a closed metadata vocabulary. Structured-output
causes are `json-parse` or `schema-validation`; schema issues retain only an allowlisted
Zod code and a path whose unknown segments are replaced before persistence. HTTP and
provider status values must pass existing numeric/enum allowlists. All lists and
strings are bounded. Raw error messages, request/provider payloads, contacts, and
credentials are forbidden at the provider, persistence, aggregation, and tRPC output
boundaries.

DeepSeek uses generic JSON-object response format at the adapter boundary and strict
local V2 seed validation before returning. Other providers retain their existing
typed-object strategy.

The current DeepSeek Flash API identifier is `deepseek-flash`. Sales Request settings
normalize the retired persisted `deepseek-v4-flash` identifier to the current value
when read, while new writes and provider calls accept only the current allowlisted ID.
Evaluation corpus configuration locks must pass before a one-call approval is
consumed or any provider is constructed.

## Assistant runtime settings contract — 2026-09-14

Runtime settings expose provider IDs, labels, allowlisted model IDs, default model,
and a credential-configured Boolean. They never expose credential names or values.
Updates carry `expectedVersion`; a stale version returns a conflict. A valid saved
selection overrides environment provider/model defaults for new runs, while an
invalid retired selection falls back to the validated environment default and is
reported as an invalid source for administrator repair.

### Batch sale deletion confirmation

`sales.deleteSalesByOrderIds` preserves `count` and additionally returns
`deletedSalesIds: number[]`. The soft-delete write is bounded to the numeric IDs
captured before it runs. IDs are confirmed only when the entire bounded set was
updated; a partial count returns an empty confirmed list. Consumers must not infer
individual success from a count. Handoff reconciliation keeps its existing scope.

## Sales Request manual-draft benchmark scope — 2026-09-15

Manual preview/Apply no longer require benchmark approval, per explicit user decision.
All access, usage, catalog and output-validation gates remain. An unapproved manual
run records providerBenchmarkApprovalRevision: 0; this grants no automatic-final-save
or rollout authority. Final-save benchmark enforcement remains unchanged. DeepSeek
output normalization may lift an incorrectly nested unresolved array only when every
fact already names that same line; strict schema validation follows unchanged.

## 2026-09-15 — Assistant public outcome and history contracts

`data-assistant-outcome` contains an allowlisted `kind` plus optional opaque `ERR-` reference; it carries no raw error text. Staff copy comes from `outcomes.ts`. Outcomes distinguish empty, input correction, denied access, unapproved action, sign-in, temporary/partial failure, unsupported capability, cancellation, conflict, uncertain write and limits. Failure narration is consolidated with priority for uncertain/restricted actions. Trusted feature-request cards remain actionable. Tool lifecycle parts persist once per stable ID, with terminal state replacing running state. Failed responses persist the same safe outcome/reference before run finalization. Model history appends bounded prior execution names/status/outcome, explicitly marked historical; it excludes tool inputs, raw outputs, diagnostic details, and references.

### Assistant model boundary and MCP error results

Every model step now receives sanitized tool error outputs, including SDK-generated error-text/error-json and MCP isError payloads. Typed failure envelopes are projected to safe outcome/message pairs; successful business outputs and tool selection are preserved. Handler failures return friendly content plus `_meta.assistantOutcome` with the captured reference. Runtime recognizes MCP isError as failure and reuses that reference rather than capturing it again. A provider interruption after a write/destructive tool starts produces an uncertain outcome.

### Assistant client reports and diagnostic filters

Browser-safe diagnostic schemas now live in `assistant/diagnostic-contract.ts`. List filters include outcome category alongside status, stage, provider/model, environment, reference and date bounds. Client reports accept only UUID event identity, bounded conversation/run IDs and one of transport/render/attachment/reconnect; arbitrary messages, URLs and additional properties are rejected. Duplicate event delivery for the same actor derives the same occurrence reference.

### Assistant diagnostic client/approval additions

Client failure reports accept a generated eventId and one allowlisted stage, with optional conversation/run identities validated against the actor. Conversation is required for transport/reconnect; pre-chat attachment/render reports may omit it and cannot supply a run alone. No client error text or URL is accepted. Approval create/read/decide exception responses use the shared AppError public envelope and validated referenceId; uncertain decisions are not publicly retryable. Returned failure envelopes still require a complete capture audit.

### Assistant private monitoring metadata

Assistant diagnostic `details.monitoring` contains status (`submitted`, `unavailable`, `failed`) and an optional validated 32-character hexadecimal eventId. This stays in the administrator-only diagnostic DTO; public chat retains only its opaque reference. The existing Sentry adapter receives sanitized cause/frame data and a deterministic occurrence event identity. Submission and durable remote delivery are intentionally distinct.

### Approval failure receipt outcome

Proposal receipts now expose `outcome`, either a validated public Assistant outcome or null. Newly finalized execution failures persist the same outcome inside the safe result's `assistantOutcome` and the parent run terminal result. Authorized replay/status reads reuse the reference. `includeProtected: false` always returns null outcome, even when persisted data contains a reference. Failure envelope warning/body content is not returned in the saved public failure result.

### Diagnostic pagination cursor

The Diagnostics list cursor now contains the immutable UTC millisecond timestamp and reference (`<ISO timestamp>|<ERR reference>`). The browser-safe codec is exported as `@gnd/db/assistant-diagnostic-cursor`; it has no database/runtime imports. API validation rejects invalid dates, extra fields and old reference-only cursors. List queries apply a strict descending timestamp/reference boundary, so retention can remove the original cursor record without losing the next page. Cursors are transient UI state, not stored incident identities; refresh resets an older in-flight cursor after an upgrade.

### Captured Assistant operation propagation

Internal AssistantOperationError extends the shared AppError and carries a validated public assistantOutcome/reference. It has no original exception cause. REST forwards this public outcome instead of capturing again; nested operation boundaries preserve the same instance. Authenticated history/attachment operations bind run/chat/request and actor scope server-side. Explicitly cancelled requests do not create an operation incident. This marker is an internal server contract, not client-submitted data.

New tool-execution result summaries retain warningCount (bounded to 20) instead of raw warning strings; legacy persisted rows are unchanged.

### Unconfirmed reply-history save

`history-unconfirmed` is an approved outcome with static copy. A separate `data-assistant-history-notice` stream part (stable id assistant-history-notice) contains only this literal kind and an optional validated error reference. It does not replace the primary response/outcome. Successful runtime execution whose history save throws returns success/usage with committed false; no provider or business tool is retried. The history diagnostic uses operation assistant.saveReply. The notice says "may not be saved" because a database commit may have occurred before the response was lost.

The client renderer validates the distinct notice schema, retains answer text/Copy, and provides secondary diagnostic Help. The notice is live recovery state; a failed persistence cannot promise a durable transcript.

### Approval preflight and stale recovery outcomes

Stale executing proposals persist uncertain assistantOutcome/reference in both proposal result and parent run terminal result. Capture happens only after a successful conditional recovery transition, using the same execution occurrence reference on subsequent reads. An unexpected preflight outage remains a temporary captured operation error before execution; it does not mutate a pending proposal into denied.

Expected precommit errors expose internal HTTP classification hints (403 denied, 409 conflict, 500 failed) to the shared error classifier. Original unexpected preflight causes are retained internally for sanitized capture. Status reads and decision replays distinguish TARGET_CHANGED from AUTHORIZATION_CHANGED while hiding protected result/review data in either case. Clients must inspect these error codes before interpreting a receipt's historical status as an accessible current success.

### Assistant private model-history context (2026-09-15)
`getAssistantModelHistory` keeps visible historical text separate from optional bounded executionFacts. Both count toward the existing history character budget. execute-turn supplies facts as private system context; facts are not appended to a past assistant reply or added to the public history contract. Live follow-up recall and 53 focused tests verify the new path.

### Distinct ambiguous Assistant outcome (2026-09-15)
Trusted requires_input envelopes with more than one candidate map to public kind `ambiguous`: “I found more than one match. Which one do you mean?” Missing input remains `input`; no match remains `empty`. Typed candidates remain separate record links. This low-impact outcome cannot override denied or uncertain outcomes. Private history accepts the new outcome vocabulary; its diagnostic classification is informational.

### Diagnostic UI rollout contract (2026-09-15)
`assistant.diagnosticAccess` now returns `{ allowed, uiEnabled }`. `allowed` remains server-authorized Super Admin access; `uiEnabled` additionally requires ASSISTANT_DIAGNOSTICS_UI_ROLLOUT to be unset or super-admin. Off/unknown values disable UI only. Detail/list/review authorization and capture are independent. Consumers fail closed when uiEnabled is absent.

### Preserved order findings (2026-09-15)
Additive `data-assistant-finding` part contains strict order-status data: orderNo, salesType, allowlisted status code and observedAt. Runtime produces it only from successful trusted native order-status/blocker/fulfillment results. Canonical lifecycle status takes precedence; only commercial pending has an explicit fallback. Arbitrary returned labels/messages, finance values and errors are not copied. At most six distinct order/quote findings are emitted; stable IDs update repeat observations. execute-turn validates before persistence. Unknown/malformed findings are ignored by the view model.

### Bounded automatic read recovery (2026-09-15)
Each request-owned MCP session has one shared automatic retry budget, including concurrent tools. Only thrown explicit transient codes/statuses on effect=read qualify; returned failure envelopes, arbitrary error text, drafts, artifacts, sends and writes are never automatically replayed. Retry waits honor supported Retry-After seconds/date values up to one second; longer/invalid values skip automatic retry. The existing tool abort signal controls waiting and the second operation. Actor identity, scope and current grants are resolved again before executing the second attempt.

Failed attempts have separate diagnostic references. The first attempt selected for silent recovery stores details.attempt=1 and presentation=not-shown; its publicMessage truthfully says no error was shown for that attempt. A failed second attempt receives its own visible failure reference. Cancellation produces neutral cancelled state with no new cancellation incident. Terminal tool summaries may add recovery `{attemptCount:2, firstFailureReference?}`; normalization accepts only the fixed attempt count and valid opaque reference. Public successful tool output does not expose recovery internals.

### Capture-health counters (2026-09-15)
Super Admin-only `assistant.captureHealth` returns `{available, periodStart, counts}` for the current environment/UTC day. Counts are null when unavailable or malformed, not zero. Fixed counters: attempts, storageConfirmed, storageUnconfirmed, monitorSubmitted, monitorUnavailable, monitorFailed. They count capture attempts, not unique incidents, failed requests or proven remote deliveries. No references, payloads or record IDs enter the metrics hash.

Capture records health after its existing bounded storage attempt; metric work has a separate 150ms bound and never changes the capture result. Store timeout is unconfirmed, not proven loss. A failed metrics write emits a bounded reference-only server-log event. Redis writes are atomic and daily hashes expire after 31 days. Reads use JSON-returning EVAL for compatibility with the existing TCP Redis adapter.

### Assistant attachment correction outcomes (2026-09-15)
The public outcome vocabulary includes attachment-too-large, attachment-unreadable,
attachment-unsupported and image-unsupported, with fixed correction copy and no
automatic retry action. Known PDF invalid/password and Sharp corrupt/unsupported
input errors become informational corrections; unexpected decoder failures remain
temporary failures. The private diagnostic records the preprocessing operation.

### 2026-09-15 — Upload failure Help and exact diagnostic copy
Added upload-failed to the strict public outcome vocabulary and shared its fixed
copy with the attachment composer. Client attachment reports now record that exact
copy instead of the generic temporary-check message. A confirmed recorded report
adds the existing Help / authorized View diagnostics control beside the composer
error. Missing/failed recording adds no misleading link. Generation and error
version checks discard late report references after a new attempt, clear, discard
or removal. Tests: 13 pass / 58 assertions across client-report, health, outcome and
diagnostic-details suites. Live Help-link acceptance remains dependent on working
upload/report infrastructure; no durable capture was claimed in the failing local
upload test.

Assistant chat and reconnect HTTP 401 responses now return the signed-out public
outcome and fixed sign-in wording. Authentication rejection remains before
conversation persistence.

### 2026-09-15 — Monitoring event lookup link
Submitted Sentry captures now retain a validated SENTRY_ORG slug with their event
ID. The authorized diagnostic detail sheet builds a fixed sentry.io organization
issue-search link for that exact event ID and a 30-day window. It ignores arbitrary
stored URLs and hides links for unavailable/failed/malformed or legacy records
without an organization. No environment files changed. This is an event lookup
link, not proof of remote event delivery or a resolved issue permalink.
Reference for event-ID issue lookup: https://forum.sentry.io/t/event-id-sentry-issue-url/4005/2
Live remote destination/delivery verification remains outstanding.

### 2026-09-15 — Capture upload validation before generic wrapping
The upload endpoint already parses Assistant PDFs before storage. Malformed PDF
validation therefore explained the earlier incomplete-file test without proving a
blob service failure. Added typed upload-validation reasons with retained decoder
causes. Assistant validation runs inside assistant.validateUpload capture, with
actor/scope context and fixed unreadable/size correction copy. Unexpected decoder
failures remain upload-failed, not a claimed invalid file. The composer accepts
only approved server copy with a valid reference and avoids duplicate browser
reporting when the server already captured it. Other upload workflows retain their
existing BAD_REQUEST messages. Actual parser test proves InvalidPDFException cause
retention. API typecheck reports only the existing Sales copy nullability issue.
Live re-test of corrected upload Help flow remains open.


## Native sales form customer request context (2026-09-15)

The shared sales form metadata contract accepts optional nullable
`customerRequestText: string` (maximum 20,000 characters). It preserves the exact
pasted request, including whitespace, rather than a generated summary. Apply binds
it from client source context into form metadata; ordinary save stores it at
`SalesOrders.meta.newSalesForm.form.customerRequestText`, and form hydration returns
it for the rep's collapsed request-reference section. It follows existing sale
read/write permissions and is not an authorization or automatic-finalization claim.
Generation telemetry and low-touch evidence remain source-free; this explicit sales
record context is separate from those earlier no-source-retention guarantees.
No database schema migration is required. Targeted save/reload test: 1 pass / 15
assertions; shared normalization/schema round trip also passes.

### AI moulding quantity review (2026-09-15)

V2 allows qty0 only for pending moulding rows with line-scoped quantity unresolved (stepIdnull). Native marked rows preserve quantityReview:true at0; final-save rejects those until positive, while draft save permits review. Explicit exact-title counted moulding omissions invoke bounded correction. Prompt v10 removes length requirement for direct piece counts. Existing native catalog/pricing/permission checks remain.

### Moulding saved calculations (2026-09-15)

V2 moulding qty rows may retain validated calculation {linearFeet,pieceLength,wastePercentage?}. AI normalization retains these inputs with the derived qty and grounding revalidates calculation facts. Native rows store optional calculation in existing line meta.mouldingRows; save/reopen preserves it without migration. Native manual qty overrides do not recompute from saved inputs until calculator Apply. Calculator callbacks accept optional calculation alongside qty, keeping qty-only callers compatible.

Grouped legacy row reconstruction restores only validated calculation metadata from the persisted row with matching UID; relational item quantity and pricing remain authoritative, including manual overrides. Verified through actual local saved-order09664PC reopen.

### Request clarification and rules — 2026-09-15

generatePreview returns the existing validated preview plus clarification:null or {sessionId,revision,round,questions}. Questions include id,lineUid,field,question,sourceText,reason. answerClarification accepts sessionId/revision and all current {questionId,answer,reuse} records once; returns the next questionnaire or resolved preview. Original text is preserved; verified source anchors bind short answers. Global rules and remembered guidance cannot supply new numerical facts.

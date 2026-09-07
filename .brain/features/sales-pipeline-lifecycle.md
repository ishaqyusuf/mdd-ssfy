# Canonical Sales Pipeline Lifecycle

## Release closure — 2026-09-07

All18 approved tickets are complete with196/196 acceptance checks. The three
retired Production lifecycle selector keys were removed with explicit approval
and their absence verified. Active Sales Orders read-model settings remain.
Runtime does not consult the removed keys, so immutable older deployment env
snapshots are harmless. No production database mutation was part of cleanup.

## Post-cutover indexed Production membership

After canonical cutover, Production summary/list membership reads the
current-version canonical stage columns on `SalesOrderListProjection` directly.
The dashboard computes this membership once and shares it across summary,
spotlight, Due Today, Due Tomorrow, and Past Due sections. Only missing,
unready, version-mismatched, or incomplete projections reconstruct canonical
source evidence. A source row that becomes unavailable during fallback is
reported as unavailable/excluded rather than failing the complete workspace;
visible result rows still hydrate their current canonical snapshot.

Production and Fulfillment state labels are owned by the canonical contract.
Customer and Dealer channels return an explicit `Status unavailable` projection
when evidence is unavailable instead of dropping an existing order or
reconstructing lifecycle from legacy strings. Mobile dashboard unknown,
conflict, and not-required stages remain outside active queue counts, while
administrative completion counts as completed.

## Purpose

`@gnd/sales` owns one versioned Sales Pipeline Snapshot for lifecycle meaning
across Sales Orders, Sales Overview, Production, Fulfillment, Dispatch, worker,
driver, mobile, dealership, storefront, customer, jobs, documents, reports,
notifications, saved tabs, and exports.

The snapshot composes domain-owned evidence. It does not replace the systems
that own payments, inventory, Production assignments/submissions, packing, or
Dispatch proof.

## Contract

Single-item Production assignment now uses the same locked canonical command
authority as batch assignment, reloads source capacity in the transaction, and
rejects excess, fractional, negative or incompatible handed quantities. Legacy
placeholder control UIDs are matched only within the exact item/door/shelf;
no-handle pending quantities cannot expose negative hand counters.

Planning loading/error presentation is isolated for deterministic query-retry
testing. Failed queries show an alert and Retry, not stale cards or raw source
errors. Escape dismisses the filter menu without clearing URL filters; clearing
via Escape is limited to the search input. All six status text palettes pass
WCAG AA contrast against actual light and composited dark theme colors.

Planning cards use the order's stored slug for edit navigation and always show
unknown material applicability as Readiness unavailable, never a simultaneous
ready claim from an empty requirement aggregate. They show
normalized priority, including Normal. Permission and overview-navigation hooks
are owned by the Calendar, not repeated for each rendered card. Planning
payloads are rejected by strict Production schedule-move input; existing
assignment-group moves retain their original contract.

Commercial statuses `void` and `voided` share canonical cancelled semantics:
cancelled headline, no actionable planning membership and rejected assignment
commands. Planning Unknown applicability remains non-assignable and exposes
`STAGE_APPLICABILITY_UNKNOWN` with a readable requirement-review explanation.

ADR 086 makes unresolved Sales reconciliation an informational cleanup
population rather than a rollout failure. The fresh local comparison reports
8,172 orders, with 7,500 accepted and 672 informational exceptions; 547 are
from 2026 onward and 125 are older. Cutover continues to require zero stale
projections, zero unexplained workspace membership, acceptable latency, and
operator approval. Unsafe legacy-transition counts and incomplete conflict
sampling remain visible in the report but do not require automatic repair.

For a deliberately selected status-only action, an exceptional Production or
Fulfillment target stage may preserve known supported cross-stage conflict
codes as immutable information rather than rejecting the user decision. The
command still writes only the selected administrative completion record, never
operational proof. Unknown future conflict codes, cancelled orders, coherent
wrong-stage actions, stale revisions, absent reasons, missing permission, and
idempotency mismatches fail closed. No database schema change is required.

This policy is deployed to Production in
`dpl_HUPC9gH7aiVmszXfqv5U2C2KUh8p`, READY on www/apex with the canonical cohort
unchanged at 5%. The isolated release used the exact prior live source and only
the reviewed `64eb7dde8` overlay. Focused tests, both scoped compilers, the
Production build, and HTTP smoke checks pass. The 13.80-second Orders smoke does
not satisfy the independent reliability gate; no database push or data repair
was part of the release.

The September 6 fail-closed local administrative run consumed only complete,
source-audited single-stage candidates and revalidated their exact revision,
policy, assignment shape, source guard, and actor permission before each
sequential write. It completed 497/497 local actions—490 Fulfillment and seven
Production—with zero replay, skip, or failure. Immutable administrative
provenance is the only reason those rows cease to count as unsafe; their
operational facts are preserved. Independent 5% and 100% shadows compare all
8,172 orders with zero unexplained membership differences and 672 unsafe
transitions remaining. A fresh source audit classifies all 674 remaining
missing-proof Dispatches as non-reconstructable and proposes zero deterministic
source repairs. Those orders remain fail-closed for human source-fact review;
production data and the existing 5% cohort are unchanged.

The September 5 fresh-local convergence uses served top-level projection
revision/version fields as reconciliation authority and repairs derived
presentation drift before returning a fresh blocking conflict for review. A
revision-checked, backed-up local-only run converged 1,269 projections without
changing lifecycle facts. The subsequent full shadow comparison has zero stale
or unexplained-membership rows but 1,169 unsafe legacy-versus-canonical
transitions, so the unsafe-transition cutover gate is open. The material review
tool also supports an explicitly read-only audit-all inventory: it classified
all 101 candidates, including 75 ambiguous rows, while mutation remains
fail-closed. Neither result authorizes synthetic completion or a broader live
cohort.

Historical schedule parity diagnostics accept an explicit operational date.
They compare Calendar to the exact-date Production list and do not relabel the
runtime-day summary as historical. The corrected 2026-09-02 local 5% and 100%
runs both return `09322AD`, `09454DB`, and `09502PC` in Calendar and list;
runtime-day empty parity remains separately labelled. Audit acceptance exhausts
bounded list pagination, records both sorted ID sets plus truncation, and claims
exact parity only for an untruncated identical set.

The shadow report also classifies administrative-resolution policy without
executing or authorizing a command. In the fresh local unsafe population, 503
rows are Fulfillment status-only eligible, 7 are Production status-only
eligible, 658 contain supported codes across both stages and remain rejected by
the approved single-stage/cross-stage fail-closed contract, and one already-
fulfilled headline retains a Production conflict. This is a decision inventory,
not permission or migration evidence.

The same report may simulate those already-evaluated decisions only against an
in-memory snapshot copy. Eligible Production/Fulfillment stages resolve to the
`administratively_completed` headline while their original blocking evidence
remains visible; operational evidence is neither added nor rewritten. Cross-
stage or terminal unsupported cases remain unchanged. Simulation never invokes
the command executor or a database writer and is explicitly not authorization.

Unsafe-transition diagnostics also retain source-fact shapes. A Production
assignment is completion-evidenced only by a completion timestamp or sufficient
accepted completed/submitted quantity; non-open zero-quantity assignments with
no such evidence are indeterminate. The corrected fresh-local inventory finds
1,147 completion-evidenced-only histories with missing delivery proof, three
completion-evidenced/indeterminate histories with missing proof, 11 completion-
evidenced/open histories with missing proof, and eight completion-evidenced-only
histories without a Fulfillment gap. Committed inventory is present for every
proof-incomplete Dispatch. The 11 open rows and three indeterminate rows remain
distinct high-risk operator-review populations even when the pure status-only
policy says the Fulfillment stage is eligible.

Latest release: `dpl_HHZGDvhKgQqfCh2CQhqXvjbwAmAx` is Ready on both live
aliases, with the reviewed page/material query improvements and complete
material-applicability dependency closure throughb19823a53 at unchanged5%.
Isolated317 package/hydration tests,721 API tests, Sales/API typechecks, and
both reviews pass. Active and Completed render all sections, but the first
live GET still logs a15-second timeout despite eventual rendering. Separate
missing-server-action POST404 warnings remain untraced. Live performance and
full membership acceptance stay open; Scratch retains exact request evidence.

Completed query/row cohort parity is implemented under ADR085 and deployed in
`dpl_H1DSyqsLp2A8nD4UimxKNattFcU2`, Ready on both live aliases.
An independent September5 read-only cohort audit found20 canonically completed
orders without list projections. Positive-only cache discovery silently
under-counts them; the proposed fix needs bounded fresh-evidence fallback.
The local correction now resolves missing/unusable projection candidates from
bounded fresh evidence without cache writes. Missing source evidence rejects;
valid projected candidates retain revision validation. Both branches preserve
workspace filters, and assignment details use the original scope rather than
the cohort OR predicate. The read-only summary now matches the independent
1295 total. Final Spec and Standards reviews, 233 Sales tests, 721 API tests,
and Sales/API typechecks pass. Live Completed renders1295, matching the audited
partial-cohort count, but default-route timeout and legacy-label contradictions
remain. A ready/current projection that incorrectly claims non-completion
is outside this fallback, so universal membership parity is not established.

The latest user-requested inspection of the original localhost Production tab
shows analytics, tabs, and order rows loading. The two September 4 failed
background jobs for sale 26929 still report `STALE_REVISION`; neither has been
replayed or dismissed. Local rendering is not live rollout acceptance.
A subsequent separate authenticated fresh navigation also finishes loading
all sections (Active3489, Completed1832); the reported failure did not reproduce.
This observation does not establish sustained health or correct membership.
Historical development-log errors must not be presented as current failures
without matching the fresh request. The background job's original payload and
invalidating source change remain unverified, so automatic replay is unsafe.

Database-sorted Production pages without legacy/worker post-filtering now
request only the page plus one look-ahead row, capped at100, instead of always
loading100 full records. Post-filtered scans retain100. The public-query
regression proves first/second page and cursor continuity. This local follow-up
does not change membership, ordering, material evidence, or status authority.
Read-only list timing still exceeds the15-second runtime budget; Scratch keeps
the evidence and remaining request-cost bottlenecks. Now deployed in the latest release.

The shared Production material plan loader now reads the same evidence through
four concurrent branches: header/delivery, catalog, commitments, and inbound.
Each keeps the existing scope, limits, and selected fields. Lines/components
join by ID, and absent/mismatched evidence rejects. Catalog and commitment
inventory/variant/category/subcomponent identities must agree before merging,
preventing a surviving component ID from hiding a concurrent material retarget.
The readiness resolver, authorization, and transaction boundaries are unchanged;
this is not an atomic multi-query snapshot. Read surfaces retain unavailable
fallbacks; mutation readiness callers retain fail-closed behavior. Read-only
61-line parity, select-aware reordered/missing/retarget fixtures, and both
reviews pass. This follow-up is deployed; live latency is not accepted.
Release dependency review also requires unavailable material evidence to retain
`unknown` applicability as well as the existing unknown badge. An unavailable
empty result must not assert that material is not required; the latter applies
only to successfully loaded, empty tracked-material evidence.

Database-sorted Production list reads now anchor the ordered page with IDs,
then read header, controls, assignments, and deliveries concurrently. Header
reads revalidate the original workspace scope; branch data joins by ID in page
order and missing/replaced evidence rejects. Selection and assignment filters
are unchanged, and post-filtered scans retain their existing bounds. This
local slice passes the301-test Sales matrix,721 API tests, Sales/API typechecks,
and both review axes. Its read-only20-row list sample measured11062ms including
connection. It is not an atomic snapshot or a live performance acceptance
claim; material/global-sort paths are unchanged. Live acceptance remains open.

`@gnd/sales` declares `@gnd/errors` as a direct runtime workspace dependency for
its canonical command error contract. Release validation must run against an
isolated installation; a working root installation can mask missing workspace
dependency declarations.

Dashboard declares the Calendar hydration regression's tRPC server/options
packages as development dependencies. The frozen release install retains the
existing resolved tRPC versions and runs the regression without relying on
accidental root-workspace dependencies. This is test packaging only.

Root reconciliation, shadow-report, and material-review operator scripts
declare `@gnd/auth`, `@gnd/db`, and `@gnd/sales` as workspace development
dependencies. Their supported clean-install validation includes the root
workspace, not only a web app's filtered graph. Existing resolved package
versions are unchanged. Operator validation generates Prisma with a dummy
URL and runs the real script suites without a database connection; a working
developer installation alone is not proof that the operator bundle is usable.

The shared full-evidence snapshot loader retains 250-order bounded batches
and uses four concurrent, independent read branches: commercial/header
evidence, item controls, Production assignments/submissions, and Fulfillment
deliveries. All branches reuse the existing canonical select fields and join
by order ID before the unchanged resolver runs. An ID present in only some
branches rejects rather than becoming an empty stage; IDs absent everywhere
retain not-found behavior. This does not promise atomic reads during concurrent
updates, increase transaction guarantees, cache evidence, or remove revision
validation. A read-only 250-order comparison produced identical revisions;
Scratch records operator timings separately from the unproven runtime p95.
This loader optimization is deployed in `dpl_Cc4v3doW1yespjaF36ow3Un7mtLt`,
READY on both live aliases. Live analytics render, but tabs/table still fail
with confirmed 15-second runtime timeouts. Runtime acceptance remains open.

Production list attachment and schedule membership preselect lifecycle
evidence reads with the shared rollout observation gate: canonical cohort
orders and sampled shadow orders retain full evidence; unconsumed snapshots
are not loaded. This does not change row membership or shadow logging.
Calendar still loads raw evidence for its legacy aggregate-conflict guard,
and Completed counts retain all revision checks. The follow-up is not yet
deployed. Scratch retains the unchanged-count read-only timing comparison;
the all-Completed scan remains the largest observed summary bottleneck.

Fulfillment's Backlog and Dispatch order headlines use the same cohort-selected
canonical projection as Orders/Overview. Headline and Production dimension
switch together; Dispatch operational status remains a separate dimension.
Backlog resolves only the returned page's evidence, while Dispatch reuses its
already-loaded batch. Deployed Backlog verification confirms 09530DB now shows
Production queued. Full live cutover remains open, including Production summary
health; a partial surface check does not satisfy the entire gate.

The September 5 local Production failure is a shared-summary failure, not
evidence of missing orders: the completed-count freshness check rejects stale
projection 17567 (`07241DB`), and both analytics and tab counts consume that
same rejected summary. Historical `update-sales-control` failures for 26929
are separate `STALE_REVISION` command rejections before the action callback;
they must not be blindly replayed. A guarded read-only live summary diagnostic
timed out after 30 seconds without identifying the live exception. Local
diagnosis cannot substitute for live health evidence. Current operational
evidence and remaining acceptance gates are tracked in Scratch Ticket 14.

The September 5 follow-up release is READY on both live domains. Initially,
exact-deployment logs confirmed 15-second timeout failures on the unfiltered
Production page and batched summary/list endpoint. Two later, backed,
single-order derived-cache repairs (20780 and 26689) independently verify
clean revisions without changing operational facts. The actual live browser
now loads analytics, tabs, and rows, matching the successful direct summary.
This observed recovery does not prove latency or status parity: completed
09498DB and legacy-labeled non-production 09471LM still appear in Active. Query-cost and
cohort membership/presentation consistency remain open in Scratch Ticket 14.

A later fresh reload of the user's local Production tab passes analytics,
tabs, and rows; its two historical 26929 STALE_REVISION jobs remain untouched.
The latest live release's tabs/table errors mean the earlier observed live
recovery is not durable acceptance. Fresh read-only evidence also corrects
09471LM: its canonical state is an applicability conflict with operational
Production evidence, not genuinely non-production. All four sampled orders
(09471LM, 09498DB, 09502PC, 09551PC) fall outside the 5% canonical cohort;
legacy row labels are not canonical ground truth. Scratch retains the audit.

The reconciliation CLI accepts `--order-id <id>` or `--order-id=<id>` to limit
discovery and therefore classification, backups, and derived-cache repairs
to one active order. Invalid, missing, duplicate, or unsafe-integer values
fail before database access. The scope cannot be combined with `--undo-run`,
which retains its existing whole-backup semantics. Omitting scope retains
the existing full audit behavior. Actor checks, reason, backup, deterministic
classification, and revision-guarded refresh requirements remain unchanged.

Completed Production membership validates each bounded projection page before
loading the next; stale or missing evidence stops immediately. Only accepted
IDs are retained across pages. The summary still fails visibly rather than
returning a partial or stale count. This reduces retained snapshot memory and
wasted reads after a stale page; it is not a cache repair or a claim that the
full-population request meets its latency budget.

Date-scoped Production list and summary reads apply their existing final
order predicate to initial assignment discovery, retaining customer, payment,
search, and worker filters before evidence enrichment. Timestamp-completed
assignments are excluded at that read boundary because the shared open-work
resolver always rejects them; quantity/submission checks and the final order
intersection remain unchanged. Read-only Production comparisons preserve all
nine summary counts, but most legacy assignment rows lack completion dates,
so this narrow pushdown does not resolve full-summary latency. Ticket 14
retains phase timings and the remaining full-evidence loading gate. No schema
or public contract changed; this prefilter correction is not yet deployed.

Canonical Production workspace membership partitions assignments with one
shared open/completed evidence predicate. Fully approved submissions qualify
for Completed even when assignment counters or completion timestamps lag;
partial, pending, rejected, and cancelled submissions do not. Calendar's
legacy aggregate fallback ignores a typed aggregate-drift contradiction from
its already-loaded snapshot unless actual or administrative completion is
satisfied. Explicit legacy-label compatibility remains until retirement.
Read-only Production evidence confirms 09502PC is awaiting review, not
completed; the corrected 5% Calendar query no longer paints its in-range work
as completed. This code correction is deployed in Production release
`dpl_9C6K8vVfuwq1qDqpUDjJyB4RU2bE`; application acceptance remains open. Scratch Ticket 14
retains regression, review, live-data read, and outstanding rollout evidence.

Actionable material-review counts reuse the same four inactive classifications
as detailed review queries. Successor checks are batched across candidate
orders, scan 250 records per page, and match strictly newer pending reviews
with active submissions by same-order control or assignment identity. Count,
list, and detail share that lookup; caller search filters do not hide valid
successors. A read-only live-data comparison retains count 97 while reducing
model reads from 103 to 3. Operator elapsed time remains about 10.6 seconds,
dominated by canonical snapshot loading; this is not a serving-latency pass.
This successor batching correction is not yet deployed.

Counts also retain the earlier optimization: the same inactive classifications
as detailed review queries, without material-detail enrichment. Material state
and assignment-proof ambiguity change the review classification/action, not
membership after those exclusions. Detailed active reviews and mutations still
evaluate their full evidence. Counts retain fresh snapshot/supersession reads,
advance across fully excluded pages, and propagate failed membership reads.
The measured local result remains 82 with material evaluations reduced from
86 to zero; live latency is not proven. Scratch Ticket 14 records tests, both
reviews, the separate Production count deadline, and exact historical evidence
behind review 1's unsafe audit stop. No schema or public API shape changed.

Production summary Completed counts, both admin and worker-scoped, retain the
same workspace order filters as the other order counts instead of forwarding
only search/priority/assignee. Pending-only predicates stay separate, and
worker assignment completion semantics remain unchanged. Query-contract
regressions and a real local Paid/Pending summary/list comparison verify the
correction. This does not resolve the separate cohort completion-policy gap,
change the global material-review count scope, or prove live query latency.

The local September 5 summary outage recovered after 78 deterministic cache
repairs in backed-up 25-record batches. An independent full local audit then
reported zero deterministic remainder and zero unsafe records; the actual
unfiltered summary and the user's reloaded local analytics/tabs both succeed.
Operational facts and historical failed jobs were unchanged. This local
recovery does not prove live Production health. The separate read-only live
material audit stops at ambiguous review 1 without mutations; Scratch retains
the reports, backup, and unresolved historical-scope assessment.

Live follow-up reproduces healthy analytics/tabs with a single-order search
and failed unfiltered summary panels alongside a 15-second page timeout.
Calendar server-prefetch now explicitly supplies `scope: "all"`, matching the
client input before schema defaulting so both use the same hydration key.
Actual-callsite input tests exercise the real tRPC and TanStack hydration
boundary; authenticated local filtered Calendar, analytics, and tabs render.
The correction is not yet deployed. Scratch Ticket 14 records the exact live
requests, unresolved cohort count/color mismatch, broad-summary failure, and
separate drag-handle hydration warning. None authorizes bypassing auth or
serving stale counts.

Operational reconciliation read deadlines do not cancel database operations.
Shadow audit revalidation preserves the same ready/current-version/current-
contract eligibility as the initial read. Missing canonical or projection
evidence remains a named, gate-blocking comparison; vanished evidence cannot
reuse an earlier snapshot. The gate's stale-projection count includes unresolved
concurrent revision drift, whose separate counter is a diagnostic subset, not
an exemption. Empty audits fail without producing a successful report.
Standalone reconciliation CLIs await command and report settlement before
applying a five-second terminal disconnect deadline. They flush report/error
output and explicitly exit afterward, including when a retired client retains
handles despite successful cleanup of its replacement. Domain writes never
receive this cleanup deadline; failures retain a nonzero exit status.

The deterministic projection repair wrapper waits for a write attempt to
settle before retrying an eligible connection rejection and does not retry
synthetic read timeouts. Material-review history and ready-approval commands
are never automatically retried. The material audit emits per-review read
progress, bounds read attempts to three, and rotates failed clients without
blocking recovery on a stalled disconnect. An incomplete audit cannot satisfy
the Production repair/cutover gate. The material runner processes each review
in read/plan/apply order, stops immediately on unsafe or non-converged work,
and never advances its resume cursor past a budget-skipped repair. Invalid
supplied cohort boundaries and unavailable material revisions fail closed.
Ready-review reconciliation uses `runSalesPipelineCommandTransaction`, just
like the application route: it locks the order, enforces the freshly read
canonical revision, and uses the existing workflow transaction profile. Its
explicit `retryOnWriteConflict: false` prevents automatic replay during repair;
ordinary application callers keep the executor's prior retry default.

Production material-review classification v2 includes the transactional
assignment-scope proof in read preflight. One validator and nested select serve
list/count/detail and the decision command. Missing or stale scope evidence
stays visible as ambiguous with no automatic repair, even when material is
ready. The write path still revalidates inside its transaction; a read result
is not authorization to skip concurrency or historical-proof checks. Legacy
assignment revisions must remain strictly earlier than the submission, while
modern scopes retain their owner/revision/quantity/membership validation.

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

- Derived sales-item control rebuilds must not disconnect/reconnect assignment
  links or advance assignment revisions. Current controls are upserted in
  place and reactivated if previously inactive. Stale controls are soft-deleted
  to exclude them from active applicability; those referenced by assignments
  or packing reports are retained for history. This does not make already-ambiguous legacy assignment
  snapshots verifiable or bypass material-review decision guards.
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

- Ticket 17 is complete at 12/12 and the authoritative Scratch batch is 177/196.
  Production and Fulfillment full-workflow jobs persist immutable per-sale
  outcomes, while a second explicit status-only confirmation is offered only
  for the unsuccessful eligible subset. The package-owned preview and command
  require a reason, bind current completion and pipeline revisions, revalidate
  supported blockers and editor authorization, and link the original attempt,
  outcome, fallback decision, and resulting status-only record without
  repeating successful side effects or fabricating operational evidence.
  Formal review locked provenance to the internal fallback boundary, added
  fingerprint integrity checks for every persisted outcome, bounded preview
  concurrency, sanitized unexpected errors, and moved pending confirmations
  into a FIFO/keyed global provider so they survive navigation without modal
  preemption. The focused matrix passes 109 tests / 380 assertions. No schema
  or additional database column was required.
  READY Production deployment `dpl_J8rgFzwLZUGYirwPMcWbzCgXeJKH` is aliased to
  `https://www.gndprodesk.com`; the corrected candidate passed the full remote
  Next.js production build after replacing a build-fragile Zod `.omit()` schema
  derivation with the direct strict public base schema.
  Authenticated QA also confirmed and corrected that unavailable/conflicting
  lifecycle actions must retain the same Full workflow or Status only choice;
  administrative provenance no longer forces or preselects Status only.
  READY clean-build deployment `dpl_8fJCigQxVcTPT6JWrFQzyvuts5Pq` contains
  that correction and owns the Production alias.
  Authenticated Production and local browser QA then verified both milestones,
  safe cancellation, and a persisted failed-workflow-to-status-only fallback.
  Exact 390×844 QA found and fixed the expanded form's vertical overflow; both
  completion dialogs now cap to the dynamic viewport and scroll internally.
  Mobile/tablet Calendar, Tab focus, Escape, and no-horizontal-overflow checks
  pass. READY deployment `dpl_CTJRtcF9uerErnk1k2bM1Qk7V8Ua` completed a clean
  remote Next.js build and now owns the Production alias.

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
- Across the eighteen-ticket Scratch queue, 161/196 acceptance checks are
  verified: Tickets 01–10, 12, 13, 15, and 16 are done; Ticket 11 is in
  progress; Ticket 14 is in production rollout at 9/13; and approved Ticket 17
  is queued after Ticket 14 at 0/12. Approved Ticket 18 is queued after Ticket
  17 at 0/18; the larger denominator is added scope, not reopened work. Ticket
  15's simplified
  visible action pair now routes ordinary and audited exception commands by
  canonical lifecycle state, and Sales Order editors may use the bounded
  exception path. Ticket 16's confirmation uses the shared shadcn picker with
  no native date input. Its authenticated desktop, 390×844, and 768×1024
  browser matrix passes across Production, worker read-only, Fulfillment V2,
  and legacy Fulfillment. A controlled local move restored `09439PC` to Sep 4
  after proving its Sep 5 write and refresh. The focused
  lifecycle/rescheduling pass covers 254 tests and 938 assertions with no
  failures. Scratch is authoritative and Brain mirrors its checked evidence.
  Ticket 17 preserves the concise Production-completed/Fulfilled action pair
  while always opening a deliberate **Full workflow** or **Status only** mode
  selection. Partial full-workflow failures may offer a second explicit
  status-only confirmation for only the unsuccessful eligible subset; the
  system must never silently downgrade or repeat side effects.
  Ticket 18 preserves the assignment-backed Schedule and its parity with Due
  Today/Past Due while adding a separate admin Planning-gaps projection for
  eligible orders whose order-level Production due date exists without full
  assignment coverage. It also locks Calendar colors to canonical Production
  state: planning amber, assigned purple, in-progress blue, completed emerald,
  conflicts rose, and unavailable neutral, with status-only completion kept
  green plus explicit provenance. Worker calendars remain assignment-only.
  Ticket 14's local synchronized-data validation is complete; the operator
  explicitly waived Preview and authorized the direct-production path, so that
  gate is recorded as satisfied without claiming a Preview run occurred.
  Ticket 09 is complete at 11/11: worker lifecycle events refresh the exact affected
  queue, dashboard, Calendar, and detail projections, and actionable review
  counts use the same package-owned current-evidence membership as admin
  Production and Sales Overview. Dev Quick Sign In authenticated the inner
  browser as Izri for order `09502PC`; all three exact-size items, material
  states, and single grouped inbound lines match the admin projection. A full
  reload preserves the exact expanded item. The reproducible worker harness
  passes at 390×844 and 768×1024 with no horizontal overflow and reachable
  inline detail. A 2026-09-04 browser rerun found and closed one shared-header
  regression: `assigned-production` now suppresses `Inbound · 2 inbounds`
  while exact item rows retain the inline evidence and the admin summary remains
  intentionally unchanged. The focused suite passes 26/26 tests with 91
  assertions, including mode wiring; authenticated 390×844 and 768×1024 proof
  confirms keyboard activation and no mobile document overflow, and a Super
  Admin rerun proves the admin summary is preserved.
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
- Part 5 classified 8,160 current production orders with 2,892 deterministic
  projection repairs, 1,269 review-required, 261 known compatibility
  differences, and zero unsafe. Its authorized 25-row apply wrote a separate
  473 KB v2 rollback backup and later exhausted bounded whole-cohort retries
  during a sustained prerequisite-read outage. The failing cohort never
  reached upserts. Earlier cohorts may have converged and must be measured by
  an independent read-only audit after endpoint recovery; no source-domain or
  material-review mutation was eligible.
- Post-recovery audit `067c1425-cf4f-42ff-9f59-58f76e52ae6e` completed across
  8,160 orders and measured exact part-5 convergence of 326 projection rows.
  The remainder is 2,566 deterministic repairs, 1,269 review-required, 284
  known compatibility differences, and zero unsafe. Part 6 retains a fresh v2
  backup and the same 25-row/revision-checked cache-only contract.
- Part 6 run `6a428d71-20f6-41a3-b8e5-0485865a5944` completed behind its
  separate 421 KB v2 rollback backup, persisting all 2,566 requested projections
  across 103 cohorts with zero stale skips and zero remainder from its starting
  population. The first independent audit could not load its first page after
  20 provider-connection attempts; it made no write and produced no report, so
  current zero drift is not yet claimed. The
  production shadow reporter now shares the bounded P1001/P1017 read-recovery
  policy, resets its Prisma connection before retry, and fails fast for other
  errors. The material-review runner also retries only its read phases and
  serializes detail reads; audited mutations remain non-retried. The shadow
  report now emits review-reason frequency counts for auditable sampling.
  Combined operational-script coverage passes 20/20, and the broader
  material-review matrix passes 116/116 across policy, permissions, queries,
  and presentation. No cutover gate is claimed before an independent
  zero-drift audit and real production shadow report.
- The intended Vercel production project was re-verified read-only as
  `gndprodesk/gndprodesk` (`prj_BbeTM6D2N5TkqWW9SzaZvdXBPnsr`, root
  `apps/dashboard`). It has no lifecycle read, command, or cohort environment
  overrides, so the package's production shadow defaults remain in force.
- During the operator's network change, DNS and a credential-free TCP probe
  reached the provider and received its port-3306 handshake. A fresh
  Prisma-backed audit still exhausted all 20 initial connection attempts before
  reading any order, made no write, and produced no report. Current zero drift
  remains unproven until that independent audit completes.
- Ticket 14 now has a Scratch-owned retirement checklist that separates actual
  runtime lifecycle fallbacks from facts and compatibility tools that must not
  be deleted. The gated removal set covers Sales Orders materialized legacy
  restoration, storefront/dealer local status reconstruction, Dashboard
  `SalesStat` bucket reconstruction, Production aggregate presentation
  fallbacks, legacy string headline inference, and rollout/cohort branches.
  Inventory migration workflows, operational Production/Dispatch/payment facts,
  analytics quantities, audit history, and rollback backups are explicitly
  retained or require separate review.
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
# Ticket 18 local Calendar integration — 2026-09-07

Admin Production Calendar now has URL-backed Schedule and Planning gaps modes.
Planning uses order Production due dates and canonical uncovered assignment
quantity, with review-only exceptions and a separately permissioned read API.
Both projections receive package-owned color and completion provenance; active
status-only completion is emerald and explicitly labelled. Planning cards open
existing Production details and authorized order edits, never schedule moves.
Pipeline change events refresh both modes. Local verification: 134 tests / 427
assertions and API typecheck pass; browser QA and database-plan verification
remain open. This Ticket 18 implementation has not been deployed.

# Task: Cut over consumers and retire legacy lifecycle authorities

## Status
Done — 13/13; deployed/authenticated and approved environment cleanup verified

## Canonical Ticket
[Scratch ticket](../../.scratch/sales-pipeline-lifecycle-implementation/issues/14-cutover-and-retirement.md)

## Created Date
2026-09-04

## Last Updated
2026-09-07

## Progress

- Final: exact user approval received. All three named retired Production
  lifecycle keys removed successfully; independent listing verifies absence.
  Active read-model settings preserved. Five retirement tests/96 assertions
  pass. All18 tickets/196 checks complete; no database mutation. Historical
  blocked/deployment entries below are superseded by this closure.

- Current: Ticket18 deployed and complete, batch195/196. Only this closure
  checkbox remains. Exact deletion approval for SALES_PIPELINE_READ_MODE,
  SALES_PIPELINE_COMMAND_MODE and SALES_PIPELINE_COHORT_PERCENT requested but
  not received. No deletion retried. Older deployment-pending entries below
  are historical. Current live deployment: 2a6aYAmYhupqpKz9PMRDr2NFySA9.

- 2026-09-06: Both final review lanes are resolved locally. Production
  dashboard sections now share one indexed canonical membership read; ready
  projections classify from canonical stage columns, while unavailable
  projections alone use fresh source reconstruction and cannot abort the full
  workspace. Canonical state-label helpers serve Production and Fulfillment;
  dashboard administrative completion, unavailable/conflict/not-required
  buckets, Storefront/Dealer unavailable projections, Sales Handoff unavailable
  state, and customer address snapshot/auth ordering all have focused coverage.
  The retirement scan now includes API, Dashboard, Dealership, Mobile,
  Storefront, Jobs, and Sales. Production passes 73 tests / 215 assertions,
  review-focused API 47 / 159, canonical/retirement 32 / 151, and Sales/API
  typechecks pass. Ticket 14 remains 12/13 and batch 165/196 pending production
  deployment, lifecycle environment removal, authenticated acceptance, and
  closure. No schema, DB push, reconciliation apply, or business-data write ran.

- 2026-09-06: The post-cutover legacy-authority retirement is complete locally.
  Orders, Production, Dispatch, dashboard, dealer, storefront, customer
  statements/address immutability, Sales Overview, and Sales Handoff now use
  canonical snapshots directly or fail closed as Status unavailable. Runtime
  lifecycle cohort/shadow selectors and command bypasses are removed; Production
  membership is bounded and projection-indexed with fresh reconstruction for
  unavailable projections. Shared headline codes, labels,
  and tones moved into `sales-pipeline.ts`; `order-status.ts` is metadata-only.
  The former mutable-string interpreter is isolated in an explicitly named
  compatibility adapter, and a repository-scanning test limits it to ten
  reviewed historical inventory/full-workflow seams that do not serve ordinary
  headline or workspace membership. The consolidated matrix passes 235 tests /
  919 assertions; the focused retirement matrix passes 52 / 222; Sales and API
  typechecks pass. Ticket 14 is 12/13 and the batch is 164/196. No schema,
  database push, reconciliation apply, or business-data mutation accompanied
  this slice. Final validation, production deployment/config retirement,
  authenticated acceptance, and closure remain.

- 2026-09-06: Canonical-only retirement is in progress. Runtime lifecycle
  selector/cohort/shadow branches and command rollout bypasses were removed;
  the focused retirement/Orders/dashboard matrix passes 35 tests / 167
  assertions, and Sales/API typechecks pass. The Production suite currently
  reports 29 obsolete cohort-era expectation/mock failures and exposed repeated
  projection validation across summary buckets. Checklist 6 remains open until
  Production membership is consolidated and the canonical-only suite is green;
  no deployment or data change has been made for this slice.

- General lifecycle serving is now canonical at 100% for reads and commands.
  Authenticated Production, Orders, Sales Rep, and Fulfillment V2 checks render
  their canonical contracts. Final READY deployment
  dpl_2phCmPHt6pqj68Vc7v9CrzGJDwdo corrected the Fulfillment Calendar serving
  seam: one shared builder preserves the 500-row query contract, while the
  Calendar and its summary load only in the authenticated browser and no longer
  hold the server render open. The initial load and a 2.3-second repeat reload
  render analytics and rows; fresh logs contain successful page,
  dispatch.workspaceSummary, and dispatch.calendar requests with no
  Fulfillment timeout or authentication error. The Fulfillment suite passes
  31/31 with 206 assertions, scoped Biome/diff integrity and Vercel build pass.
  No schema, DB push, reconciliation apply, or business-data mutation ran.
  Retirement gates now pass; physical fallback removal is next.

- The bounded 5% Production cohort passes its live reliability gate. Twenty
  independent authenticated GETs returned HTTP 200, rendered all 20 first-page
  rows, preserved Active 3,331 / Unassigned 858 / Past Due 268 / Unscheduled 73 /
  Completed 1,293 / Review 97, and recorded zero timeout. Correlated p95 phases
  are proxy auth 478 ms, proxy-to-page 1,290 ms, page auth 1,535 ms, filters
  3,496 ms, list 5,458 ms, and summary 6,617 ms; all server phases pass the
  10-second target. Ticket 14 advances to 11/13 and the batch to 163/196.

- The request-scoped authorization prototype was locally green but is deferred
  and removed from the shipping worktree because the smaller filter release
  already satisfies acceptance. Its 12-test / 64-assertion proof remains design
  evidence, not deployed behavior. The exact-parity schedule split also remains
  rejected because it preserved 935 open assignments / 343 order-date keys but
  regressed 332–336 ms to 360–470 ms. No schema, database, data, reconciliation,
  or cohort mutation accompanied this acceptance.

- The bounded Production-filter release is READY as
  `dpl_5WZw6SiQtiw3B1wJjapqSfmFoPZ2` on www at the unchanged 5% cohort. Seven
  high-cardinality Sales filters retain their keys/semantics as typed inputs;
  invoice/status/priority and the bounded worker list remain options. Local
  filter time is 1–2 ms with no Sales-order scan, Redis/cache dependency, or
  write. The route now requires the same operational viewer audience as the
  Production workspace. Nine focused tests/55 assertions, 725/725 broad API
  tests with a process-local encryption test secret, API typecheck, exact
  four-file candidate verification, and the Vercel build pass. The 20-request
  authenticated gate above now verifies the live render and timing. No DB push,
  schema, data, reconciliation, or cohort change.

- Active-order parity is live in READY deployment
  `dpl_HmMgg87s4rPTq3gNyY6JZ43Grhv2`. Production renders Active 3,338 /
  Unassigned 865 / Past Due 268 / Unscheduled 73 / Completed 1,286 / Review 97
  and rows, confirming deleted orders no longer inflate analytics. Three
  requests avoid a hard timeout but still show summary 7,566–9,587 ms, list
  6,958–9,160 ms, and filters 5,381–11,807 ms. Two filter samples include the
  unavailable Redis option cache's 1,500 ms timeout. This selected the bounded
  filter release above; checklist 4 remains open.

- Production analytics/list parity now explicitly excludes soft-deleted Sales
  orders in the shared workspace and nested Calendar predicates. The database
  client had applied this only to `findMany`, not `count`, explaining local
  Active 3,547 versus list-equivalent 3,331 and analogous Unassigned/Past Due/
  Unscheduled/Completed deltas. Corrected local counts agree across operations;
  83 focused tests / 263 assertions, Sales typecheck and Biome pass. No global
  client, schema, data, lifecycle, or cohort change. Isolated 5% Production
  verification remains part of checklist 4.

- The Production-summary fanout reduction is live in READY deployment
  `dpl_Gubvi8Ut77RT5ukaDCx25hLirodH` on www/apex at the unchanged 5% cohort.
  All three authenticated samples render the unchanged live counts and first
  page without a timeout, but summary settlement is 9,161 / 8,287 / 6,406 ms
  and reload observation is 10,023 / 9,731 / 8,044 ms. The final sample is
  effectively equal to the 6,329 ms baseline, so checklist 4 and the reliability
  gate remain open. No DB push, migration, data mutation, or cohort change ran.
  Request-time projection freshness remains required; a non-equivalent local
  Active/Unassigned query experiment was rejected before application code.

- Authenticated www timing now attributes the current request primarily to data
  work after route entry: proxy auth 367 ms, filters 4,206 ms, list 5,886 ms,
  summary 6,329 ms, and 7,668 ms to rendered reload. The locally implemented
  summary consolidation loads open schedule evidence once and preserves exact
  date/filter/worker/canonical semantics. A read-only 5% local benchmark reduces
  traced ORM operations 33 to 20, assignment reads 5 to 1, and SalesOrders reads
  17 to 13; focused validation passes 109 tests/384 assertions, scoped Biome,
  diff integrity, and Sales typecheck. No data/schema/cohort change. Isolated
  Production deployment and authenticated timing were completed as recorded
  above; the unchanged latency remains the current 4/13 gate.

- The non-blocking reconciliation policy is live in Production through READY
  deployment `dpl_HUPC9gH7aiVmszXfqv5U2C2KUh8p` on www/apex, with the canonical
  cohort unchanged at 5%. The isolated prior-live-source-plus-`64eb7dde8`
  candidate passes 72 tests / 219 assertions and both scoped compilers; Vercel
  built successfully and HTTP smoke checks return 200. A 13.80-second Orders
  smoke keeps the separate reliability and broader cohort gates open. No schema
  push, reconciliation apply, or Production-data mutation ran.

- The approved non-blocking policy removes automatic reconciliation from the
  cutover prerequisites. The 8,172-order local report now represents 7,500
  accepted orders and 672 informational exceptions; 547 are from 2026 onward
  and 125 are older. Known cross-stage exception codes may remain in immutable
  audit information when an authorized user deliberately selects status-only
  completion for an exceptional stage. Unknown codes and the existing actor,
  permission, reason, revision, idempotency, cancellation, and wrong-stage
  guards remain fail-closed. Ticket 14 advances to 10/13 and the batch to
  162/196. Final relevant validation passes 199 tests/512 assertions, both
  scoped typechecks, Biome, diff integrity, and local Spec/Standards review. No
  Production data/schema change or automatic repair occurred.

- The fail-closed local administrative runner completed 497/497 guarded
  actions: 490 Fulfillment and seven Production, with zero replay, skip, or
  failure. It revalidated exact revisions, actor permission, single-stage
  policy, source guards, and assignment risk before each sequential write;
  backup and durable journal evidence are retained in Scratch. An independent
  100% shadow compared 8,172 orders with zero unexplained membership
  differences and 672 unsafe transitions. The follow-up source audit found 674
  missing-proof Dispatches, zero deterministic proof repairs, and held all 672
  remaining orders. Production and operational source facts were unchanged;
  the existing 5% production cohort remains.

- Corrected local-only reconciliation repaired and backed up 1,269 derived
  projections with zero stale skips and no operational-fact changes. Converged
  shadow evidence has zero stale and zero unexplained-membership rows, but
  1,169 unsafe legacy-versus-canonical transitions; full read-only material
  inventory finds 75 ambiguous candidates among 101. Scratch reopened the
  unsafe-transition check first. Ticket 14 is 8/13 and the batch is 160/196;
  Production data and the existing 5% cohort remain unchanged.

- Corrected unsafe-transition source-fact labels now require affirmative
  completion evidence and isolate seven indeterminate assignments across three
  orders instead of calling every non-open assignment complete. The full local
  rerun remains 8,172 compared, zero stale, zero unexplained, and 1,169 unsafe;
  `PENDING_REVIEW` output remains open under the shared canonical predicate.
  Focused validation passes 88 tests/195 assertions, Sales typecheck, Biome,
  diff integrity, and both re-reviews. No lifecycle fact or Production data was
  changed.

- Unsafe-transition evidence now includes exact sorted assignment and Dispatch
  identifiers for operator reconciliation. Scratch lists all 34 open and seven
  indeterminate assignment IDs with their missing-proof Dispatches; the full
  private report carries the same identifiers for every unsafe row. Both final
  review lanes are clear. No write.

- A pure in-memory resolver-outcome simulation predicts approved status-only
  evidence would present 510 eligible rows as `administratively_completed`
  while preserving their conflict evidence and operational facts. The 658
  cross-stage rows and `09592DB` remain unresolved by policy. Command integration
  was not exercised; no executor or database write ran.

- Fresh local replacement and access restoration completed. Scratch owns the
  292-table verification/rehearsed backup evidence and retained first local
  audit-launch failures. Production unchanged; correctness gate remains open.

- Local-first export continues; the separate integrity refresh now resumes
  verified eight-table chunks after a source EOF instead of repeating whole
  groups. Scratch owns recovery, digest and runtime evidence. Local data is
  still untouched; staging/reset/audits remain pending and checks stay 9/13.

- Operator approved two Page Traces on www.gndprodesk.com. Both completed on
  Cpmm: total 10.84s / 10.02s and function 10.1s / 8.65s, middleware about
  0.3s. Counts remain Active 3554 / Completed 1295. Scratch owns trace IDs,
  timings, limits and cleanup evidence. No continuous tracing, global sampling,
  upgrade, deployment or DB write. Prior approval gate is resolved; no timeout
  reproduced or application/query attribution proven. Checks remain 9/13.

- The same tracing approval gate has persisted for three consecutive turns;
  goal execution is blocked, not complete. Safe preflight is exhausted for
  this diagnostic step, no trace capture is running, and Scratch records
  the exact resume scope. Full 18-ticket objective and verified checks remain.

- Read-only tracing preflight confirms no project sampling rules and supported
  CLI single-request capture. Scratch now prefers two authenticated browser
  Page Traces over metered always-on rules; approval remains pending. No trace
  capture, cookie extraction, settings change, purchase or check advancement.

- Vercel read-only resource/observability evidence is recorded in Scratch:
  exact route 70.1 MB / Node 24.x / IAD1 / 15s; matched failure 15.14s and
  614/1024 MB. Aggregate CPU throttling is a candidate, not attributed cause.
  Existing traces are absent in the checked window; configuring bounded tracing
  requires approval. No settings, purchases, application/data changes or checks.

- Local isolated compile-only trace attempt produced no usable route trace.
  The confirmed idle build was interrupted with exit 130; no restart or
  production/source changes. Scratch records limits and evidence; no checks
  advanced. Approved expanded queue remains 161/196 across 18 tickets.

- Read-only startup follow-up confirms the full runtime router is reachable
  through both page and sidebar hydration imports. Scratch records candidate
  SDK/instrumentation initialization and a trace-first experiment, without
  attributing the delay to an unmeasured module. No code or acceptance changes.

- Approved diagnostic companion is Ready on both live aliases. Scratch records
  a real15-second failure and successful reload; timing rules out proxy auth as
  the main delay in these samples and prioritizes the post-proxy/pre-page gap.
  No authentication/query fix or acceptance advancement is claimed.

- Operator explicitly approved the timing-only Production release. Current
  HvW rollback, project identity, and isolated runtime hashes were revalidated;
  deployment resumed with unchanged auth and5% settings. Scratch owns evidence.

- Goal execution is blocked after the same explicit deployment-approval gate
  persisted across three continuations. Scratch owns the resume instructions;
  no deployment process started, no checks advanced, and scope is unchanged.

- Read-only filter/authorization audit updates the Scratch performance plan:
  full-order options scan, overbroad HR loader with possible permission seeding,
  and missing explicit filter-route gate require focused follow-up. Main
  Production data routes are guarded. No live anonymous probe or code/data
  change; deployment approval remains pending.

- Scratch records reviewed proxy probe e23050c27 and19passing isolated tests.
  Production upload was rejected before process creation pending explicit
  approval following the user's analysis-only request. No new deployment or
  data change. The isolated test compiler lacks Bun types; no pass claimed.

- User-requested performance analysis is documented in Scratch's
  production-performance-plan.md. It separates measured phases from suspected
  proxy/startup causes and proposes auth/query optimization with explicit
  security/parity gates. No further deployment during this planning response.

- Timing-probe release HvW5u66kjXWE32nBnDC4HnWddDm6 is independently
  confirmed Ready on both live aliases. Scratch records the release and
  unchanged5% rollout. Flagged request measurement is next; no timeout fix,
  database mutation, or acceptance advancement is claimed.

- Reviewed opt-in route timing probe committed as615a47105. Scratch records
  the isolated hash-verified release, hydration checks, aborted broad compiler
  (not a pass), unchanged5% settings, and verified7PW rollback. Vercel accepted
  deployment HvW5u66kjXWE32nBnDC4HnWddDm6 and is building; no database mutation.

- Latest user-requested inspection and a fresh local navigation both render
  analytics, all seven tabs, and rows after the loading shell. Scratch records
  unchanged counts and the two historical September 4 sale26929 stale-revision
  failures. No replay, dismissal, or data mutation. The separate live timeout
  and 9/13 acceptance gate remain open; temporary timing probe review continues.

- Quantity prefilter is deployed and verified on both live aliases. Scratch
  records rendered analytics/tabs/rows and the still-confirmed first-request
  timeout, plus the next privacy-safe request-phase diagnostic scope. No
  acceptance gate advanced and no data or rollout change occurred.

- Scratch records the exact isolated c101d05b7 release, verified rollback,
  and passing installation, generation, tests, and typechecks. Direct
  Production upload at unchanged 5% settings is next; no database mutation.

- Scratch records exact-evidence ABBA summary-query measurements and the
  reviewed single-query quantity prefilter. Final package/API tests and both
  typechecks pass; actual-query timing verifies reduced rows but not live
  latency acceptance. Committed as c101d05b7 on master; isolated release and
  live measurement remain. No production write or rollout change.

- Current user-tab recheck: local Production analytics, seven tabs, and rows
  are visible. The background monitor still shows the two historical sale
  26929 STALE_REVISION failures from September 4, not a new analytics error.
  Scratch records the exact expanded run and counts. No jobs replayed or
  dismissed, no source/data change, and acceptance remains 9/13.

- Latest reviewed release is Ready on both live aliases. Scratch records
  successful Active/Completed rendering and the remaining first-request
  timeout/server-action warnings, so cutover acceptance is still open.

- Scratch records the missing material dependency closure, reviewed unknown-
  applicability correction b19823a53, and passing final isolated release
  validation. Direct Production upload at unchanged5% settings is next.

- Order-page slice committed as48145c7de on existing master. Scratch records
  local rendered verification and the pending isolated release containing the
  three reviewed performance slices; no rollout gate advanced.

- Scratch records the reviewed order-page optimization, final validation, and
  read-only timing evidence. The current work stays on master; release and
  live-page acceptance remain next, without changing any cutover gate.

- Latest requested local inspection and a separate fresh navigation both show
  analytics/tabs/rows loaded with unchanged visible counts. The reported panel
  failure did not reproduce; historical26929 STALE_REVISION jobs were neither
  replayed nor dismissed. Scratch also retains the two exact-parity order-read
  experiments; no application change or acceptance advancement in this check.

- Material-query slice committed as68502f805 on existing master. Scratch
  records final passing tests/typechecks/reviews and the next full-order
  detail measurement. Not deployed; no database mutation; gate unchanged.

- Scratch records exact material evidence parity, the local four-branch
  loader, its15.2-second full-list sample, and the review-found retarget guard.
  Final review/validation/commit remain; no data change or deployment.

- Page-bound follow-up committed as326fdd582 on existing master, not deployed.
  Final API matrix passes; Scratch retains both read-only timing samples and
  the next full-detail/material query focus. Acceptance remains unchanged.

- Scratch records live Completed count/rendering parity for the5% cohort and
  the still-open default-route timeout. The page-bound follow-up passes both
  reviews, Sales typecheck, and234 package tests, but its23.4-second operator
  sample does not meet runtime acceptance. Broader status parity remains open.

- New deployment is Ready but first live navigation still times out. Scratch
  now records a separate 27-second list bottleneck and the red/green local
  page-sized candidate correction; repeat timing and review remain.

- Isolated release validation is green; Scratch owns exact test counts, hashes,
  preparation corrections, rollback, target, and rollout settings. Approved
  direct Production upload is next; no database mutation occurred.

- Reviewed query correction committed as `229794265` on existing master;
  Scratch records the exact scope and pending isolated release validation.
  No database change or background job replay occurred.

- Scratch records the latest original-tab inspection (analytics/tabs/rows
  visible; historical stale jobs untouched) and final bounded-query validation:
  both reviews, Sales/API typechecks, and the Sales/API test matrices pass.
  Commit and isolated release validation remain; acceptance is unchanged.

- Scratch records the implemented missing-projection fallback, red/green source
  absence and assignment-scope regressions, and the first1295-count result
  matching independent evidence. No cache/domain write or deployment; final
  review, broad API validation, and commit remain.

- Scratch records uncommitted Completed query/row cohort correction and the
  independent audit that caught20 missing-projection false negatives. Proposed
  ADR085 documents shared query rollout and bounded fresh-evidence fallback.
  The faster first count is not accepted; fallback/review/commit remain.

- Scratch records the follow-up cohort-aware evidence-loading optimization,
  red/green public-query coverage, broad tests, and unchanged-count read-only
  timing evidence. Both review axes are clear; committed as `deba460f4` on
  existing master, not deployed. Completed query cost and live validation
  remain open.

- Latest release is READY on both live aliases, but its Production tabs/table
  still fail with confirmed 15-second runtime timeouts. A fresh reload of the
  original local tab passes analytics/tabs/rows. Its two historical 26929
  STALE_REVISION jobs remain untouched. Scratch and release manifest record
  these separate outcomes without advancing acceptance. Fresh cohort evidence
  corrects the earlier 09471LM label: canonical configuration conflict, not
  proven non-production; all four sampled rows are outside the 5% cohort.

- Scratch records the validated isolated parallel-evidence release and its
  building Production deployment. Existing live release remains the rollback
  target; no schema/data or rollout-percentage change accompanies this upload.

- Scratch records parallel full-evidence loading, the review-discovered
  missing-header regression and fix, exact 250-order revision parity, and
  successful broad API/lifecycle/operator checks. Runtime latency, deployment,
  and Active membership consistency remain separate open gates.

- Scratch records root operator dependency declarations and successful
  isolated frozen installation, Prisma generation, and actual script suites.
  This closes the demonstrated module-resolution failure without changing
  production data or the separate performance/status acceptance gates.

- Scratch records the reviewed schedule-candidate prefilter correction and
  unchanged live-data counts. Query tests/typecheck pass; the measurements do
  not establish a latency improvement. Full evidence loading and live status
  parity remain open, with no acceptance or rollout change.

- Actual live Production browser now loads analytics, tabs, and 20 rows after
  the two backed cache repairs. Scratch records matching counts and remaining
  Active membership/status contradictions, including completed 09498DB and
  non-production 09471LM. Recovery is observed, but latency and full parity
  remain open; no acceptance checkbox or rollout percentage changed.

- Both20780 and26689 independently verify clean after backed scoped repairs.
  The full direct Production summary now succeeds (Completed1224/Review97)
  at29.8seconds operator-side. Scratch preserves all counts and phase timings;
  live serving health and performance are not yet verified.

- Independent post-check verifies20780 clean and quantities unchanged.
  The broad summary now reaches a second stale projection26689; Scratch
  records the29.1-second result. Classify before repair; live gate remains open.

- Approved Production cache repair for20780 /07915PC completed: one persisted,
  zero skipped, with a verified one-record v2 backup. Scratch holds run/report
  evidence and guarded undo. Operational facts and failed jobs were unchanged;
  independent post-check and summary remeasurement remain.

- Scratch records the single-order reconciliation CLI scope and the scoped
  undo guard discovered in review. This prepares a bounded cache repair
  without changing classification, permissions, backup, or revision guards.
  Tests and scripts typecheck pass; production repair has not started.

- Scratch also records the independent list probe: 20 returned orders,
  three model reads, 21.2 seconds operator-side. This narrows remaining
  performance work without claiming serving-runtime latency or acceptance.

- Reviewed successor batching committed as 94bf597ee on existing master.
  Scratch records 189 passing regressions and a targeted audit classifying
  projection 20780 as deterministic repair, with no lifecycle conflicts.
  No repair has run; live acceptance remains open.

- Scratch now holds phase-level live summary evidence (stale projection 20780
  after 36.1 seconds) and the reviewed Review successor-batching correction.
  Exact count remains 97 with 103 -> 3 model reads; snapshot cost remains.
  Correction is local, with live acceptance still open.

- Post-deploy live health remains red: exact-deployment logs confirm
  15-second runtime timeouts for the Production page and batched summary/list
  requests. Scratch preserves browser references and next diagnostic scope.
  Local page remains healthy; historical jobs remain untouched.

- Calendar/summary release dpl_9C6K8vVfuwq1qDqpUDjJyB4RU2bE is READY and
  aliased to www.gndprodesk.com. Scratch holds the immutable bundle manifest.
  Application validation remains open; no schema push or data mutation.

- Original local browser tab rechecked: analytics/tabs/rows load; the two
  visible errors remain historical STALE_REVISION jobs, untouched. Scratch
  also records the newly discovered clean-install root operational-script
  dependency gap, separately from passing application tests and the building
  Production release. Acceptance remains 9/13.

- Scratch records the new isolated release bundle, test-dependency packaging
  correction, final validation, and verified GND deployment/rollback target.

- Scratch records the Calendar aggregate-conflict correction and shared
  finalized-submission membership fix, including read-only Production evidence,
  red/green regressions, validation, and both reviews. Deployment remains pending.

- Scratch records the Completed-summary filter correction, red/green contract
  tests, local Paid/Pending list/count evidence, and both review clearances.
  Cohort status parity and the live rollout gate remain open.

- Scratch records the exact review-count optimization, focused validation,
  both reviews, and historical assignment proof for the unsafe audit stop.
  The user's local page remains healthy; the live cutover gate is still open.

- The local analytics/tab outage is recovered after audited, backed-up cache
  repair and independent browser verification. Scratch holds the evidence.
  Live health/parity and the material audit's ambiguity stop remain open.

- Scratch records the local Calendar prefetch-key fix, contract regressions,
  browser evidence, review results, and remaining independent summary/parity
  failures. This does not close the live cutover gate.

- Scratch records the bounded Completed-query validation slice, focused tests,
  both reviews, and separate connection/sample diagnostics. The live health
  gate remains open; no cache repair or job replay was performed.

- Exact-deployment logs show a Calendar server-prefetch 401 and a 15-second
  runtime timeout, not a matched summary-panel exception. Scratch preserves
  this distinction; no auth configuration or production data was changed.

- Reviewed operational tooling committed as 0ac153778 on existing master,
  limited to 14 scoped files. Scratch remains authoritative at 9/13; next is
  live summary exception evidence. No DB write or new deployment in this slice.

- Operational hardening passes both final reviews, 58 runner/executor tests,
  134 package regressions, and scripts typecheck. Empty audits fail closed;
  subprocess proof covers terminal cleanup and retired clients without timing
  out writes. Scratch retains exact evidence. Live summary health remains open;
  no DB mutation or new rollout change in this slice.

- Live calendar color checks pass, but live summary panels also fail; exact
  live server cause remains uninspected. Operational review found four audit /
  cleanup gaps. Three audit gaps were reproduced and corrected at the report
  collection boundary; 16 shadow tests pass. Terminal cleanup and re-review
  remain open. Scratch records evidence; no DB command or gate completion.

- Authenticated live Fulfillment Backlog now verifies 09530DB as Production
  queued, filtered count 1. Local panel diagnostic independently reproduces
  a stale derived projection for 07241DB / 17567 rejecting the shared summary.
  The background failures concern 09556LM / 26929; its current local projection
  is fresh, and historical command intent remains uninspected. Scratch records
  exact evidence and safe follow-ups. No local repair, job retry, or code fix.

- Production deployment dpl_GozwXL67x4NtYPi6FzAuFkALnsJs independently verified
  READY with both live domains aliased despite local log-stream disconnection.
  No duplicate deploy or DB command. User additionally reports local summary /
  tabs failing: browser reproduces two panels, logs identify productionSummary;
  historical job monitor reports STALE_REVISION for sale 26929. Scratch records
  the exact evidence; application parity and ticket gates remain open.

- Supported temporary CLI 59.11.7 accepted the unchanged approved bundle.
  Production build is running at gndprodesk-ewdmw7niu-gndprodesk.vercel.app.
  No READY/live-alias verification yet; Scratch records the inspect link.

- Explicit source-upload and exact Production destination approval received.
  CLI 44.7.3 uploaded the reviewed 17 MB bundle, then Vercel rejected its
  outdated version; no deployment ID or live promotion returned. Resolving a
  temporary supported CLI without changing project dependencies, source,
  rollout percentage, or database. Scratch and release manifest updated;
  Ticket 14 remains 9/13 pending actual live verification.

- Operator restored Vercel login. Fresh project inspection confirms the exact
  dashboard project/root; validated direct Production release is resuming.
  No reconciliation or held-review mutation is part of this deployment.
  Execution safety review rejected the deploy before process creation, asking
  for explicit approval of the internal source upload to this exact Vercel
  destination and live promotion. No deployment started; Scratch records the
  target and approval gate. Do not work around the rejection.

- Isolated Production-baseline release preparation exposed a missing direct
  Sales dependency on `@gnd/errors`, masked by the working installation. The
  manifest/lock declaration and deployment-boundary regression now pass both
  reviews and 7/7 checks. The clean bundle passes 721 API tests, 129 package
  regressions, and API typecheck. Scratch records its exact source directory
  and dashboard project identity. No Production DB connection or deployment;
  the live cutover gate remains open at 9/13.
  Packaging fix committed as `415e8ad7f`; the 20-file hash manifest is saved in
  Scratch. Release is held for Vercel login: linked-project inspection fails
  with an invalid token both through Bun and the direct installed CLI. All
  checks are terminal; no deployment started.

- Fulfillment order headline follow-up reproduced the live legacy/canonical
  mismatch at the presenter and both actual Dispatch query variants. Backlog
  and Dispatch now use the shared rollout observer for headline and Production
  dimension together, with bounded/reused evidence batches. Both reviews are
  clear; API typecheck and scoped checks pass. Full API tests pass 721/721 with
  an explicit local test-only signing key; lifecycle/Dispatch tests pass
  100/100. Scratch retains evidence and unchanged 9/13 completion. No Production
  access or deployment; live parity remains unverified.
  Reviewed correction committed as `ac87d9a29` on the existing `master` branch.

- Current local follow-up: shared assignment-proof validation now aligns review
  list/count/detail and ready-reconciliation preflight with the transactional
  decision. Classification v2 keeps unsafe historical scope ambiguous and
  prevents automatic repair. Four end-to-end command/query seam fixtures and
  existing decision tests pass; the expanded suite passes 177 tests with 469
  assertions, and Sales typecheck passes. Both reviews are clear after limiting
  the richer internal select to the old public response shape. A fresh bounded
  Production read confirms all three held reviews remain PENDING and fail
  legacy assignment provenance. Scratch saves exact reasons. No Production
  write or deployment.
  Committed package correction and API contract: `765ccdc56` on `master`.

- Local follow-up reproduced a false assignment revision change caused by
  control rebuild detach/reattach writes. The fix leaves links and revisions
  intact and retains assignment-referenced historical controls. Review caught
  stale controls still influencing active applicability; they are now
  soft-deleted and current controls are reactivated. The 173-test command and
  canonical-snapshot matrix and Sales typecheck pass; both reviews are clear.
  The two-file correction is committed as `be381d72c` on `master`, not deployed.
  No historical timestamp is rewritten and no held review is approved. Scratch
  retains the evidence and unchanged 9/13 completion.

- Current checkpoint: resumed read-only scan covered 102 pending reviews;
  provider 20-second transaction limits rolled back both local ready attempts. The
  deployed exact-review recheck then cancelled 103 for stale legacy assignment
  scope, verified in DB; pending total 101, remaining 134/135/147 still PENDING.
  No ready approvals. Further candidates are held for assignment-history
  assessment. Live Fulfillment's Order status differs from Orders/Overview for
  cohort 09530DB. Scratch documents both open gates and atomic command reuse.

- Latest September 5 checkpoint: full read-only audit saved 54 successful
  reviews through 181 and stopped at 184; a 48-candidate tail audit is running.
  No mutations or ready approvals. Final local operational/DB tests pass 47/47
  (118 assertions); DB/Sales typechecks pass. The dedicated script diagnostic
  is blocked by 32 shared-UI React type-identity errors, with no script errors.
  Scratch records safety review corrections and live Orders/Overview parity.

- September 5: the final full material audit is still unverified. The first
  full run failed closed; the replacement was interrupted without mutations.
  Scratch records the slow-write timeout regression and correction, 27 passing
  operational tests, and the new observable read-only audit of 102 candidates.
  Production access is still needed. No ready approval or checklist completion
  is claimed.

- Window 11 preserved a clean prefix through review 389, then failed closed at
  390 on Prisma empty-engine/not-connected responses; the read-only run made no
  write. Those provider messages are now narrowly retryable, with 13/13 runner
  tests and 53 assertions green. The resumed 390–414 tail completed cleanly.
  Combined window 11 contains three eligibility conflicts, nine actionable
  unresolved, and five true setup-missing no-ops. Every one of the current 102
  pending review IDs is now covered; a fresh full audit must prove 98 no-ops
  plus four ready approvals before the separate ready gate executes.
- A read-only window-10 scan exposed that one never-settling Prisma promise
  could bypass the rejection-based retry bound. It was interrupted after more
  than 22 minutes with no mutation flag. Every read attempt now has a
  30-second timeout that resets/retries the connection; mutation calls remain
  outside retry. The runner suite passes 13/13 with 51 assertions and scoped
  checks are clean. The hardened rerun audited reviews 348–367 as seven
  eligibility conflicts and 13 true setup-missing no-ops, zero failure/unsafe
  state. No apply was appropriate; auditing continues after review 367.
- Material-review window 9 audited reviews 295–347: 12 empty/retracted, five
  eligibility conflicts, two actionable unresolved, and one true setup
  missing, with zero failure/unsafe state. Exact-range apply changed only the
  12 history rows; independent audit retains exactly eight no-ops with no
  proposed history mutation. Production has 102 pending reviews after 138
  verified history cancellations; the planned reason reclassification remains
  to be located.
- Material-review window 8 audited reviews 269–294, including tracked
  archetype `09178DB`, and found 20/20 safe empty/retracted history
  cancellations with zero failure/unsafe state. Exact-range apply changed all
  20; independent audit returns zero candidates/failures. Production has 114
  pending reviews after 126 verified history changes; auditing continues after
  review 294.
- Material-review window 7 audited reviews 242–268, finding 20/20 safe
  empty/retracted history cancellations with zero failure/unsafe state. Its
  fixed-range apply changed exactly 20; independent same-range audit returns
  zero candidates/failures. Production has 134 pending reviews after 106
  verified history changes; auditing continues after review 268.
- Provider connectivity recovered and material-review window 6 completed.
  Fixed-range apply
  `production-20260904-material-review-history-apply-part6-206-241.json`
  changed exactly 20/20 audited empty/retracted rows with zero failure and no
  ready approval. Independent exact-range audit
  `production-20260904-material-review-audit-after-part6-206-241.json` returns
  zero candidates/failures. Production has 154 pending reviews after 86
  verified history changes; auditing continues after review 241.
- Production deployment `dpl_9NQCM5H9aWEzjkmDo5ZK91tiGGqQ` is READY and
  aliased to `www.gndprodesk.com` from the isolated live-commit snapshot plus
  only the tested Sales Production correction and rollout allowlist.
  Authenticated verification proves outside-cohort `09502PC` is emerald/
  completed and cohort-included `09530DB` remains canonical assigned/purple;
  its detail headline/material/assignment evidence agree. The accidental
  Storefront-target build caused by the root link was removed before release.
  The specific Calendar color/parity defect is closed; broader cohort surface
  acceptance remains open.
- Production material-review window 6 is durably audited across review IDs
  206–241: 20/20 are `empty_retracted`, all 20 are safe history-cancellation
  candidates, and the audit reports zero failures/unsafe state. Two exact-range
  apply starts then exhausted Production connectivity during actor permission
  preflight. Neither reached candidate collection or mutation, and no apply
  artifact exists. Scratch remains authoritative; retry and independent audit
  are required after provider recovery.
- Production material-review window 5 covered reviews 174–203 with zero
  failure/unsafe state, ten empty/retracted repairs, and ten no-ops.
  Fixed-range apply
  `production-20260904-material-review-history-apply-part5-174-203.json`
  changed exactly those ten; independent same-range audit verified only the ten
  no-ops remain. Production has 174 pending reviews after 66 verified history
  changes; audit continues after 203.
- Production material-review window 4 covered reviews 141–173 with zero
  failure/unsafe state, eight empty/retracted repairs, one ready review, and
  eleven no-ops. Fixed-range apply
  `production-20260904-material-review-history-apply-part4-141-173.json`
  changed exactly those eight; independent same-range audit verified only the
  eleven no-ops and ready review 147 remain, including the expected `09086PC`
  eligibility-conflict archetype. Production has 184 pending reviews after 56
  verified history changes; audit continues after 173.
- Production material-review window 3 covered reviews 115–140 with 20/20
  processed, zero failure/unsafe state, 11 empty/retracted repairs, two ready
  reviews, and seven no-ops. Fixed-range apply
  `production-20260904-material-review-history-apply-part3-115-140.json`
  changed exactly the 11 history rows. The independent same-range audit found
  only seven no-ops plus the two unchanged ready reviews. Production now has
  192 pending reviews after 48 verified history changes; auditing continues
  after review 140.
- Production material-review window 1 proved reviews 1–42 clean with 20 no-op
  rows. Window 2 safely inspected reviews 43–114 before failing closed at 115.
  Fixed-range history apply
  `production-20260904-material-review-history-apply-part2-43-114.json`
  changed exactly its 13 empty/retracted rows with zero failures; ready review
  103 remained unchanged. Independent same-range audit then returned five
  no-ops plus that ready review, zero history repair, zero failure, and zero
  unsafe state. The pending population is now 203; audit continues at review
  115.
- Live 5% cohort verification found `09502PC` (stable bucket 69) served the
  legacy completed list label while Calendar incorrectly consulted its
  unselected raw canonical snapshot and rendered assigned/purple. Production
  list and Calendar now consume the selected cohort projection consistently:
  outside-cohort Calendar rows preserve only explicit legacy Production
  completion, while inside-cohort list completion/lifecycle/action fields and
  Calendar color use canonical state together. The terminal-order-string
  no-fabrication guard remains. Focused Production coverage passes 35/35 with
  70 assertions, Sales typecheck passes, and scoped formatting/diff checks are
  clean. Production deployment verification remains open.
- The replacement material-review audit failed closed after 32 of 216 pending
  reviews at review 105. The 216-row start proves the interrupted history apply
  changed exactly 24 of the original 240 reviews and did not approve ready
  reviews. The runner now supports durable review-id/max-candidate audit
  windows with first/last ids and continuation state. Its safety suite passes
  12/12 with 45 assertions; the first 20-review window is running.
- The first 25-row history-only material apply exhausted a candidate's read
  recovery after earlier candidates may have committed. It was interrupted
  under the stop rule before its pre-hardening runner could continue failing
  across later candidates; no final report exists and ready approval was never
  enabled. The exact result remains unknown until the independent read-only
  `production-20260904-material-review-audit-after-part1.json` completes.
  Read recovery now also resets/retries Prisma `P2024` connection-pool
  exhaustion. Mutations remain un-retried. The first independent audit was
  intentionally stopped without a write when an outage exposed that its
  pre-scan collection could multiply an exhausted read window across the rest
  of a 100-record batch. Detail collection now ends on the first rejected read,
  and any early-stop report exits non-zero. The combined runner suite passes
  12/12 with 42 assertions and Biome is clean. A replacement independent audit
  is running with the hardened code.
- Subsequent material-review batches now stop the whole scan on the first
  unsafe detail read, unsafe plan, or mutation failure and report processed
  count, early-stop state, and exact stop reason. Repair mutations remain
  outside automatic retry. Focused runner coverage passes 3/3 with 13
  assertions and Biome is clean. The already-running first 25-row process is
  accepted only if its final failure count is zero.
- Fresh Production material-review dry run
  `production-20260904-material-review-dry-run.json` completed across 240
  pending reviews with zero failures and zero mutations. It classified 42
  eligibility conflicts, 28 actionable unresolved, 24 true setup-missing, 138
  empty/retracted, 4 superseded, and 4 ready-to-converge. Proposed operations
  are 138 safe history cancellations, 1 reason reclassification, 4 separately
  flagged ready approvals, and 97 no-ops. The already-authorized clean-dry-run
  gate passes; the first repair is capped at 25 history-only mutations.
- The approved 5% production cohort is deployed as Vercel deployment
  `dpl_GgKtUtFqRnfNKXYirE3wC9P5mnxt` and promoted to
  `www.gndprodesk.com`. Both lifecycle read and command modes are canonical at
  an order-id-stable 5% cohort, while the Sales Orders materialized read model
  is enabled at a user-id-stable 5% cohort. All five Production variables are
  present and are now included in the root Turborepo build allowlist. Focused
  rollout/read-model coverage passes 36 tests with 95 assertions; Production
  login and Orders HTTP smoke pass, and the authenticated Orders page loads as
  Pablo Cruz. Ticket 14 remains 9/13 until the live cross-surface cohort check
  is complete.
- Approved production report
  `production-20260904-shadow-report-approved-revalidated.json` passes all
  hard gates across 6,898 projections: zero unexplained/review-required
  membership, unsafe, persistent stale, and concurrent freshness differences;
  353.71 ms p95 across 345 real 20-order serving pages; conflict review and
  operator approval recorded. The fail-closed checker passes at 500 ms with no
  failures and a fact-preserving legacy rollback. Ticket 14 is now 9/13 and the
  deployed bounded canonical cohort is under live validation.
- The first approval-bearing rerun remained parity-clean and passed latency at
  351.96 ms p95, but one projection/snapshot revision differed across the
  five-minute live scan. The reporter now uses two bounded revalidation
  observations only for initial mismatches and fails stale freshness only when
  the same mismatched pair persists; moving revisions are visible separately
  as concurrent activity. Focused coverage passes 21/21, and no threshold was
  weakened.
- Audit `d247f9fb-ba78-4846-b93d-f983c9d57dca` identified the single stale
  derived projection as order `09553LM` with no unsafe classification. Apply
  run `2d4d63cb-cec7-478d-8c21-4b6e2794e656` created a new v2 rollback backup,
  persisted exactly 1/1 projection, skipped none, and left zero deterministic
  remainder. An approval-bearing full-population shadow rerun must independently
  confirm zero stale rows before the rollout check advances.
- The production shadow comparison now covers all 6,898 eligible projections
  while measuring actual 20-order serving pages. It has zero unexplained,
  review-required membership, and unsafe differences, and passes the unchanged
  latency gate at 361.90 ms p95 across 345 pages. The separate fresh-resolver
  diagnostic is 4,235.99 ms p95. One source revision changed during the scan,
  leaving one stale derived projection, so no rollout flag is credited until a
  bounded backup/repair and independent approval-bearing rerun return zero.
- The merged material-status local release check is complete; Preview was
  explicitly waived. Automated and authenticated evidence covers exact badges,
  quantities, explanations, list/count/detail parity, collapsed multi-review
  behavior, deep links, permissions, keyboard operation, cache refresh, and
  all three named reconciliation archetypes. Ticket 14 is now 9/13; production
  shadow, cohort rollout, retirement, production material execution, and final
  closure remain open.
- Production projection reconciliation Part 6 run
  `6a428d71-20f6-41a3-b8e5-0485865a5944` created a separate 421 KB v2 rollback
  backup and completed all 103 cohorts: 2,566/2,566 projections persisted, zero
  stale skips, and zero deterministic repairs remaining from its starting
  population.
- The production shadow reporter now uses the same bounded P1001/P1017 read
  retry policy as reconciliation, disconnecting before retry so the provider
  endpoint can be re-resolved. Non-connection failures remain fail-fast.
- The material-review runner now applies that recovery policy only to
  permission, candidate, and detail reads and serializes detail reads. Its
  audited repair/approval mutations remain outside automatic retry. The shadow
  report also emits review-reason frequency counts beside its sample, making
  the conflict-sampling gate auditable. The combined operational-script suite
  passes 20/20 and scoped Biome is clean. The broader material-review matrix
  passes 116/116 across domain policy, permissions, queries, and presentation.
  The first independent post-run audit exhausted all 20 initial page-read
  attempts during a new provider outage before loading any order. It made no
  write and produced no report. The production shadow acceptance check remains
  open pending a completed independent zero-drift audit.
- Two more independent audits, followed by one audit during the operator's
  network change, reached the same fail-closed result before loading an order.
  DNS and raw TCP port 3306 are reachable and return a provider handshake, but
  Prisma still cannot establish a usable database session. No attempt wrote
  data or created its requested report.
- A final one-attempt production `salesOrders.findFirst` probe failed before
  reading a row. The same external condition has now persisted across three
  consecutive goal turns. All safe local-only acceptance evidence is complete;
  the remaining audit, shadow, cohort, material execution, retirement, and
  closure gates require a usable Prisma production session.
- After explicit resume, an externally authorized TLS probe succeeded and
  confirmed that earlier instant Prisma failures were sandbox-constrained. The
  first externally authorized audit recovered after one initial `P1001`, but
  was intentionally interrupted after more than three hours of idle/retry
  behavior without a report. It was read-only and changed no production row.
  Its replacement is running the same independent production audit at the
  runner's supported maximum batch size of 100, reducing snapshot round trips
  fourfold. No zero-drift claim is recorded until that replacement writes and
  passes inspection of its report.
- The optimized independent audit then completed as
  `18a2af67-eba8-442f-88cc-7bac868ae1af` across 8,165 production orders. It
  found 6,271 clean, 14 deterministic projection repairs, 610 known
  compatibility differences, 1,269 review-required rows, and 1 unsafe
  classification. The production gate remains fail-closed. Because the
  original source-ordered 25-row sample concealed the unsafe row, the report
  contract now also emits complete reason frequencies and category-specific
  samples. Focused operational tests pass 18/18 with 45 assertions and scoped
  Biome is clean; an improved read-only audit is running to identify the exact
  unsafe and repair candidates before any bounded cache repair or shadow
  promotion.
- Evidence rerun `f1486995-dbcc-4012-9bdc-a2d0b5c8fd33` covered the same 8,165
  production orders and reports 6,271 clean, 15 deterministic repairs, 610
  known compatibility differences, 1,269 review-required, and zero unsafe.
  The first run's lone missing-snapshot unsafe result did not persist and is
  consistent with concurrent production activity. All 15 cache candidates are
  now visible: 11 Sep 4 source/revision changes and 4 newly missing
  projections. A first 25-row launch was interrupted during its no-write,
  pre-backup scan because the setting unnecessarily multiplied read round
  trips. The replacement uses batch size 100 for the scan; with only 15 current
  candidates, its write is still one 15-row cohort behind a fresh v2 rollback
  backup. No source-domain fact is eligible for mutation.
- Part 7 completed as `21291320-dcd6-46b9-92c7-0e2996d5274a`. Its fresh scan
  found one additional new order, then persisted all 16/16 current derived
  projections with zero stale skips, zero unsafe, and zero starting-population
  remainder. The run created a 126 KB v2 rollback backup and apply report. The
  independent post-part-7 audit is running; recurring newly missing projections
  will be treated as a projection-refresh defect instead of repeatedly masked
  through reconciliation.
- Independent audit `d38074f2-d86c-4768-bafc-6655a9789a96` then completed
  across 8,166 current orders with zero deterministic repairs and zero unsafe.
  The reconciliation prerequisite is satisfied. The real production shadow
  reporter is running without review/approval flags so its complete reasons,
  representative samples, unexplained/unsafe/stale counts, and p95 latency can
  be reviewed before approval is recorded.
- The first unapproved shadow report compared 6,898 ready projections with
  zero unexplained membership, unsafe, stale, or review-required membership
  differences, but its 6,761.69 ms p95 failed the 500 ms gate. Review found the
  metric incorrectly combined served materialized-page reads with fresh
  canonical resolver audit batches. The runner now gates only the real served
  projection-page p95 and exposes resolver-audit p95 separately; the 500 ms
  threshold is unchanged. Focused validation passes 19/19 with 46 assertions,
  and a corrected unapproved production shadow run is in progress.
- The split-latency rerun remained parity-clean but measured the 250-row
  materialized scan at 2,059.82 ms p95. Production `EXPLAIN` proved the existing
  health index still required a filesort. One additive composite scan index was
  added without a column or row rewrite, then pushed to the expected production
  fingerprint in 6.97 seconds. Post-push `EXPLAIN` selects the new index with
  index condition and no filesort. An indexed unapproved shadow run is now
  measuring the unchanged 500 ms gate.
- Read-only Vercel inspection re-verified `gndprodesk/gndprodesk`
  (`prj_BbeTM6D2N5TkqWW9SzaZvdXBPnsr`, root `apps/dashboard`) and confirmed no
  lifecycle read, command, or cohort override exists in Production. Package
  fail-safe shadow defaults therefore remain in force; no cohort was enabled.
- Added the authoritative local retirement inventory at
  `.scratch/sales-pipeline-lifecycle-implementation/retirement-checklist.md`.
  It binds every deletion to independent zero-drift, production shadow,
  internal-cohort, general-cutover, monitoring, and focused-test gates. It also
  distinguishes lifecycle reconstruction from retained domain facts,
  `SalesStat` analytics quantities, inventory migration workflows, V1 surface
  coexistence, immutable audits, and rollback backups.

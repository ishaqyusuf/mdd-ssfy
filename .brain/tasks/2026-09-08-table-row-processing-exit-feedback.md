# Task: Table Row Processing And Exit Feedback

## Status
In Progress

## Priority
Medium

## Created Date
2026-09-08

## Last Updated
2026-09-14

## Global Ticket
- Ticket Position: 1/1

## Source Context
Implement the [reviewed plan](../plans/2026-08-06-ux-ui-table-row-processing-exit-feedback.md).
Shared opt-in row activity and table-local retention; Sales Orders pilot first.

## Implementation Progress
- Completion: 80%
- Current Checklist: 7/10 — Validate production/cancellation and remaining pilot action adapters
- Blockers: None external; remaining action adapters and final browser coverage are in progress

## Implementation Checklist
- [x] Establish activity lifecycle and outcome contract with behavioral tests
- [x] Implement synchronous capture and scoped retained-row composer/hook
- [x] Add opt-in VirtualRow presentation, interaction guards and focus handling
- [x] Bridge direct mutation lifecycle and single/batch payment review
- [x] Bridge monitored fulfillment with per-sale outcomes and fallback behavior
- [x] Integrate Sales Orders display rows, selection and request controls
- [ ] Validate production/cancellation and remaining pilot action adapters
- [x] Run focused/full relevant tests, typecheck and code review
- [ ] Complete authenticated browser acceptance and timing/rollout decision
- [x] Update feature/architecture documentation and commit scoped work

## Validation Evidence
- 2026-09-14: User approved disposable local fulfillment fixture preparation,
  UI QA and cleanup. Created INV-FIX-ALLOC (order28087) on local3307/gnd-prisma2.
  Normal updateSalesItemControlAction generated its shipping controls; canonical
  snapshot now reports ready_to_fulfill with requiredQty3 and markFulfilled allowed.
  No fulfillment mutation has been triggered yet. Completion remains80%.
- Worktree is master; unrelated existing changes will be preserved.
- Public test seams are the lifecycle, composer, outcome adapters, VirtualRow and
  query/task integration already specified in the reviewed plan. Implementation
  authorization includes the plan's checks and the invoked skill's typechecks.
- Five focused behavioral tests pass (12 assertions): lifecycle stale-operation and
  logout guards, mixed task results, final-row expiry, refreshed-row precedence
  and deterministic simultaneous departure.
- Shared hook/composer implementation started; hook integration and UI wiring
  remain unverified. Dashboard typecheck launched with output at
  `/tmp/gnd-row-activity-typecheck.log` failed from Node heap exhaustion (exit 134).
  Retrying with 8GB heap: `/tmp/gnd-row-activity-typecheck-8gb.log`, session 24569.
- Added opt-in VirtualRow tones, inert interaction, status text and opacity fade;
  wired Sales Orders display rows and payment actions. Basic SSR rendering test
  passes; live keyboard/portal and hook behavior still need verification.
- Shared mutation and monitored-task adapters are wired, with batch per-sale
  settlement before existing query events. Added start failure handling and
  running-task reconstruction; follow-up review must verify stale task restoration,
  logout cleanup, duplicate actions and cancellation/status-only contracts.
- Latest focused evidence: 7 lifecycle/composer/adapter tests (15 assertions),
  plus one VirtualRow SSR test (6 assertions). Existing Sales Orders/task-effect
  suite previously passed 32 tests / 92 assertions.
- Integrated 8GB typecheck completed with repository diagnostics and no matches
  for activity, VirtualRow, query-client, task-trigger or Sales Orders data-table
  paths at that checkpoint. Later focus/restoration additions need a fresh check.
- Next: finish hook behavioral validation, remaining guards/scope handling,
  task/cancellation contracts, focused/full checks, code review and browser QA.
- Current implementation files are uncommitted; no rollout or completion claimed.

- Review follow-up: genuine infinite-query refetch exhaustion now qualifies a
  shrinking page window; manual writes and unproven truncations remain excluded.
  A real `fetchInfiniteQuery` regression failed before the fix and passes after it.
- Successful selection cleanup now receives the captured row at settlement,
  independently of current display membership or refresh qualification.
- Observed task-run identities survive feedback expiry until owner cleanup,
  preventing ignored old SYNCING updates from replaying processing. Regression
  failed before the fix and passes after it.
- Current focused run: 14 tests / 32 assertions pass across eight files.
  Prior browser harness passed ten lifecycle checks at desktop and 390×844;
  new focus and absent-row callback checks are added but not yet browser-verified.
- Broad authenticated acceptance, remaining pilot adapters, fresh typecheck,
  final review and scoped commit remain outstanding.
- Browser follow-up passed all 12 lifecycle checks in light and dark fixture modes,
  including focused-control transfer and absent-success callback delivery. The
  measured dwell/exit was 1920ms and 1914ms. Viewport restored afterward.
- Broader relevant run: 107 passed, four failed (758 assertions). Three executor
  fixtures lack `sales.productions`; registry cardinality expects 101 but current
  registry has 102. Concurrent registry changes include `receiveProductionInbound`;
  these failures require final baseline attribution and are not counted as green.
- Fresh Dashboard typecheck found an activity integration cursor cast error;
  corrected it. Verification rerun at `/tmp/gnd-row-activity-typecheck-cursor.log`
  is running in session 62851. Existing broad repository diagnostics remain.
- Requested follow-up spec review of the three corrected findings.
- Follow-up spec review found no remaining blocking correctness issues in the
  three fixes and independently passed six refresh/task/selection tests.
- Cursor typing verification completed (exit 2 from repository diagnostics), with
  no diagnostics matching row activity, its hook, or Sales Orders data-table.
  No commit yet; full acceptance and remaining checklist work continue.

- Added real MutationCache lifecycle integration tests: synchronous capture before
  request, mixed per-sale settlement before one refetch, and global error feedback
  before a mutation-local error handler. Two tests / four assertions pass.
- Activity plus existing task-event/fallback suites pass 24 tests / 49 assertions.
  Added a subsequent cancellation/start-failure isolation test; task suite passes
  four tests / six assertions.
- Documented the reusable contract in `features/sales-orders-v2.md` and its
  presentation-only invalidation boundary in `features/query-invalidation-events.md`.
- Prepared `scripts/qa/table-row-activity-fixture.ts`: local-only target guard,
  default dry-run, marked zero-amount payment fixture, and scoped soft-delete
  cleanup. Read-only dry-run verified 127.0.0.1:3307/gnd-prisma2 and no collision.
  No business data changed. Explicit QA authorization was requested under the
  plan's Phase 0 gate; dependent authenticated mutation QA remains pending.
- Additional action types remain gated on payment-review/fulfillment acceptance;
  auditing them does not authorize rollout before that acceptance.

- Extended the synthetic browser harness with a React portal outside the row's
  DOM subtree. Verified normal action dispatch, blocked click/Enter/Space during
  processing, and restored action dispatch on failure. All 15 checks pass on
  desktop and 390×844 dark-mode fixture; viewport restored. This does not replace
  authenticated business-action or actual OS reduced-motion acceptance.
- Current pilot/core/activity/task suites: 68 passed, zero failed, 606 assertions
  across 22 files. Scoped tracked-file whitespace checks pass. Query-event suite's
  previously recorded baseline failures remain outside this green result.
- Checklist items 3, 5 and 6 now complete for implementation: component portal/focus
  behavior verified; monitored settlement/outcomes/fallback preservation tested
  and reviewed; server/display row separation, selection and request-control
  integration verified. Authenticated end-to-end acceptance remains item 9.

## Remaining Action Audit

| Action | Current row-feedback integration | Acceptance dependency |
| --- | --- | --- |
| Single/batch payment review | Invocation-scoped metadata; batch reviewed ids only; skipped ids neutral | Authenticated local fixture approval pending |
| Full-workflow fulfillment | Existing monitored intent; per-sale succeeded/review/failed outcomes | Authenticated job and filtered-row acceptance pending |
| Full-workflow production | Existing monitored intent is understood by shared outcome adapter | Additional pilot acceptance required before claiming rollout |
| Legacy production cancellation intent | Persisted intent recognized; missing per-sale output remains neutral; no current trigger call site found in apps/packages/jobs | Audit does not imply a new cancellation workflow |
| Current status-only production/fulfillment and cancellation | Direct mutations currently lack row descriptors | Add only after first two pilot actions pass acceptance |
| Delete, payment recording and inbound actions | No new descriptors enabled | Same explicit pilot expansion gate |

Production-cancellation task transport cancellation is independently tested as a
neutral terminal phase. Current direct business cancellation endpoints must not
be mislabeled as that transport cancellation or inferred successful from row
absence. No API changes are needed to preserve this distinction.
- Full-scope revalidation found `sales-menu.tsx` missing its `isRowActivityBusy`
  import; fixed it. Earlier diagnostic scans omitted that integration file and
  must not be read as proof that every changed runtime file was clean.
- New 8GB Dashboard check completed with exit 2 from repository diagnostics.
  The complete row-feedback runtime/test path scan (including sales-menu,
  task-notification/trigger/effects, query-client, Sales Orders and core rows)
  reports no matching diagnostics. Log: `/tmp/gnd-row-feedback-full-scope-typecheck.log`.
- Scoped formatting completed across 30 files; tracked changed-file whitespace
  checks pass. Requested full implementation Standards and Spec reviews rather
  than limiting review to the three previously corrected findings.
- Full review found two further integration defects despite the earlier adapter
  tests: monitor cancellation paths did not settle activity, and local task
  completion could invalidate before the monitor settled activity. Fixed all
  three monitor cancellation callbacks and local completion/error/cancellation
  paths. Local completion now settles the exact run before its success callback;
  later monitor settlement is idempotent. Added local-first mixed-outcome
  regression; ten task/effect tests pass (20 assertions).
- Standards review reports no documented violations. Optional duplicate expiry
  calculation cleanup is deferred; generated public QA bundle/index were removed
  as requested by review. Source harness/builder remain reproducible.
- Follow-up spec review and fresh typecheck for terminal wiring are underway.
  Typecheck log: `/tmp/gnd-row-feedback-task-wiring-typecheck.log`, session 63084.
- Reviewer confirmed terminal settlement wiring and found one caller consequence:
  cancellation also must release SalesMenu's local status-action latch. Added an
  explicit `onCanceled` callback to useTaskTrigger and wired both monitored Sales
  task consumers to release it without reporting cancellation as failure.
- Latest pilot/core/task test run: 69 passed / 608 assertions. Subsequent callback
  typing and final review remain to verify before a commit.
- Follow-up reviewer confirms all cancellation callbacks, caller latch release,
  exact-run settlement ordering and idempotence; no further focused findings.
- Terminal-wiring typecheck completed (exit 2). It now reports an unrelated
  `columns.tsx:623` Invoice cell contract mismatch: optional latestPaymentReview
  is passed to a presentation type requiring that property. The row-feedback diff
  in columns only adds an import and payment mutation metadata at the ActionCell;
  invoice presentation is outside this change. Other repository diagnostics remain.
  The subsequently added optional onCanceled callback still needs final typecheck.
- No authenticated fixture authorization has arrived. No database apply/cleanup
  command was run, no new action types were enabled, and no commit is claimed.

- Final relevant suite executed after all runtime fixes:113 passed,3 failed,
  775 assertions across25 files. Remaining failures are query-event executor
  mocks missing sales.productions; registry test cardinality has been corrected
  by concurrent work. None of those files is included in this row-feedback commit.
- Added architecture decision `decisions/2026-09-08-table-row-activity.md`.
  Database/API impact check: no schema, permission or API behavior change; only
  presentation metadata and callbacks. API/database documentation needs no update.
- Preparing a scoped implementation checkpoint commit. This is not completed
  authenticated acceptance or authorization to expand pilot actions.

- Final callback typecheck completed: exit2 from repository diagnostics; full
  activity integration scan finds only the unchanged Invoice presentation
  mismatch in columns.tsx. No new activity or cancellation callback diagnostics.
- Blocked audit: fixture authorization has remained unanswered across more than
  three consecutive goal continuations. Independent implementation, targeted
  browser tests, review fixes and documentation are complete for this checkpoint.
  Remaining scope: authenticated payment/fulfillment acceptance, operator timing
  approval, gated additional pilot actions, and final acceptance/closure commit.

- Implementation checkpoint committed on master as `8e181b3a8` (38 scoped files).
  Generated browser bundles and unrelated concurrent application/Brain changes
  were excluded. Feature/architecture docs and task pointers are committed.
- Completion:8/10 checklist items (80%). Items7 and9 remain: gated additional
  pilot action adapters and authenticated browser/operator acceptance. This
  checkpoint is not a completed rollout or deployment.

- User approved the prepared local zero-amount payment fixture QA. Created marked
  synthetic order27347 (QA-ROW-FEEDBACK-20260908) on127.0.0.1:3307/gnd-prisma2.
  UI review and scoped cleanup are now in progress.

## Approved Local Payment QA — 2026-09-08

- User explicitly authorized the prepared zero-amount payment fixture, UI review
  and cleanup. Local target revalidated; created order27347/payment9350 with the
  QA-ROW-FEEDBACK-20260908 marker. No existing business records changed.
- Authenticated `/sales-book/orders?q=QA-ROW-FEEDBACK&paymentReview=needs_review`
  displayed only the fixture. Selected that row and used Mark as → Reviewed.
- Immediate DOM inspection after the UI mutation observed success phase,
  `inert=true`, and Payment reviewed text. A later snapshot showed No results,
  no batch selection bar, and Payment Review saved-tab count104→103.
- Did not directly observe the brief processing phase or measure the success
  dwell in this real mutation. Prior synthetic timing checks remain separate.
- Single-row Reviewed was disabled despite the fixture matching the review queue;
  batch review succeeded. This needs investigation before claiming single-row
  authenticated acceptance. No UI bypass or API call substituted for the action.
- Scoped cleanup completed. Explicit read-only SQL including deleted rows verified
  order27347 and payment9350 both soft-deleted at2026-09-08T19:56:02Z; amount0,
  reviewStatus=reviewed, reviewMethod=manual. Normal app reads exclude the fixture.
- This completes the approved batch-review fixture exercise, not the full pilot:
  single-row behavior, authenticated fulfillment/mobile/failure/reduced-motion
  coverage and operator acceptance remain. Completion remains80%.

- Fixed the single-row QA defect: SalesListInclude omitted payments, so review
  metadata was null despite queue membership. Added a bounded loaded-order review
  lookup without passing partial payment history into invoice totals.
- API typecheck passes;27 API metadata/list tests pass (74 assertions).
- Reset the same approved marked fixture (repeatable script now explicitly reads
  deleted fixtures and supports guarded --reset). Single-row Reviewed became
  actionable; authenticated UI observed inert success/Payment reviewed then No
  results. Both order27347/payment9350 were verified soft-deleted again at
  2026-09-08T20:00:36Z, payment reviewStatus=reviewed.
- Updated API contract and Sales Orders feature docs; schema/permissions unchanged.
  Final focused review pending; full fulfillment/operator acceptance still open.
- Focused reviewer found no blocking lookup/reset issues and independently passed
  both new tests. Broader mixed-payment query ordering remains a validation gap;
  only the approved zero-amount fixture was used for live data proof.
- Authenticated mobile payment QA at390×844 passed: restored the same approved
  fixture, clicked the single-row Reviewed action, observed inert success and
  Payment reviewed text, then No results. Document overflow was false before and
  after. Viewport restored. SQL verified order/payment soft-deleted at
  2026-09-08T20:03:30Z with payment reviewStatus=reviewed.
- Requested a disposable local fulfillment order number: the approved payment
  fixture has no operational setup and cannot prove successful fulfillment.
- Prepared a local visual preview in the browser panel and requested operator
  approval for1600ms success dwell/225ms fade and colors. The temporary
  `public/_qa-row-feedback` bundle is intentionally uncommitted while the user
  reviews it; remove it again before delivery. No new rollout approval assumed.

- Acceptance blocker revalidated across three consecutive continuations after
  mobile QA. No approval or disposable fulfillment order was supplied. Prior
  turn was no progress (read-only acceptance audit); no new test run was needed.
  Marked Blocked at80%; resume the same scope when those inputs arrive.

- User approved the visual preview:1600ms success dwell,225ms fade and current
  colors are accepted. This removes the timing/color decision gate.
- Read-only local lookup found no active known INV-FIX-ALLOC, INV-FIX-PARTIAL,
  INV-FIX-RECEIVED or QA-ROW-FEEDBACK-20260908 order. The payment fixture remains
  cleaned up. A disposable fulfillment order identity/setup is still needed.
- Removed temporary generated public preview artifacts after visual acceptance;
  source harness and builder remain committed. No business data changed this turn.

- 2026-09-09 resumed acceptance audit: current checkout contains subsequent
  project commits; no changes since visual approval were found in the checked
  row-activity, task-trigger/notification, Sales Orders table or bulk-fulfillment
  paths. Focused current-checkout regression passes27 tests/60 assertions across
  ten files. No new business-data mutation or generated public artifact remains.
- Timing/colors remain approved. Successful full-workflow fulfillment QA still
  requires a disposable local order with suitable operational data. No such
  order identity or authorization to fulfill an existing real order was supplied.

## Fulfillment QA And Lifecycle Fix — 2026-09-14

- Approved local fixture28087 was prepared through normal item controls, aggregate
  stats and canonical list projection. The pending fulfillment filter displayed
  only INV-FIX-ALLOC. Local Trigger development worker used127.0.0.1:3307/gnd-prisma2.
- Live full-workflow action showed Fulfilling and disabled row controls. The worker
  rejected completion because no approved items were available to pack. This exposed
  a presentation defect: replacing the Status cell unmounted its task hook before
  start registration, leaving feedback busy even after the job finished.
- Fixed VirtualRow to preserve the original cell subtree under hidden presentation.
  Moved trigger result/error handling into the captured invocation promise, preserving
  monitor registration across unmount and preventing a late error from failing a
  retry. Callback errors after registration no longer masquerade as failed starts.
- Fresh-page retry registered the monitor and delivered the existing full-workflow
  failure/fallback dialog. A later normal fixture assignment produced the canonical
  review-required conflict PRODUCTION_NOT_REQUIRED_WITH_OPERATIONAL_EVIDENCE;
  selection stayed checked and no green departure was claimed. Declined status-only
  fallback; successful full-workflow fulfillment remains unproven.
- Synthetic browser suite passed16 checks, including original status-control DOM
  identity during processing, portal guards, scope changes, retry, expiry and
  selection cleanup. Observed synthetic dwell/exit1915ms. Focused runtime suite:
  20 tests48 assertions passed; invocation lifecycle suite3 tests10 assertions passed.
  The latter models absent component callbacks through SSR and deferred transport;
  it does not claim a mounted/unmounted React-effects test.
- Spec review found and resolved the late-callback retry race; standards review
  found and resolved callback-error misclassification. No unrelated files changed.
- Scoped cleanup soft-deleted order28087 at2026-09-14T19:54:44Z; read-only verification
  found zero active controls, assignments and dispatches for it. Fixture rollback
  cleaned its seeded inventory records. Removed generated public harness files.
- Completion remains80%. Remaining work includes a coherent successful fulfillment
  fixture, remaining action adapters after acceptance, and final browser coverage.
  Existing approval to prepare/run/clean disposable local QA fixtures remains valid.
- Final Dashboard typecheck exits2 with repository diagnostics, but no diagnostics
  in VirtualRow, task-trigger lifecycle, its new test or browser harness. Corrected
  the new test's incompatible promise-matcher typing before this final verification.
  Scoped staged diff check passes. No schema/API/permission changes in this fix.

## Successful Fulfillment Pilot And Direct Adapters — 2026-09-14

- Previous turn classified as progress: committed lifecycle fixes16f0bc638.
- Added scripts/qa/table-row-fulfillment-fixture.ts. Dry-run by default, strict
  local3307/gnd-prisma2 guard, collision marker, isolated desktop/mobile/timing
  fixture names, and scoped soft-delete cleanup. Normal control/assignment/submission
  helpers prepare a zero-value legacy-production order with genuine persisted
  completed-production evidence; canonical snapshots/projections are not fabricated.
- Desktop order28180 and mobile390×844 order28181 completed through the real
  Fulfilled → Continue full workflow UI. Pending filter became No results and the
  selected-row bar disappeared. Database evidence for28180 showed operationally
  fulfilled deliveredQty1 and ACTIVE FULL_WORKFLOW fulfillment provenance.
- Continuous desktop timing capture on order28182 observed processing/inert at14ms,
  success/inert at11298ms, fade opacity0 at12935ms, and no row at13153ms. Observed
  success dwell1637ms and fade-to-removal218ms match approved1600+225ms defaults
  within100ms observation sampling. This closes the successful live fulfillment
  gap; cancellation was disabled by existing completed-order policy and not bypassed.
- Added opt-in single deletion and archive/restore descriptors. Single deletion
  succeeds only on literal true. Archive/restore maps unique changed ids per row;
  skipped, missing, duplicate or contradictory outcomes remain neutral.
- Live archive27347 showed Archived/inert then departed; archive-filter restore
  showed Restored/inert then No results. Single-row Delete → Sure? showed
  Deleted/inert, then No results with selection cleared. No extra invalidation
  ownership was added. Existing callbacks remain unchanged.
- Focused suite22 tests54 assertions passed before the additional contradictory
  archive case; final adapter test2 tests7 assertions passed. Dashboard typecheck
  exited2 on repository diagnostics with no diagnostics in changed adapter/menu
  files. Spec review found no blocking issues; standards review requested.
- Read-only cleanup verification:27347,28180,28181,28182 all soft-deleted; no active
  assignments, submissions, dispatches or packing rows remain for fulfillment
  fixtures.27347 archivedAt is null and its zero-value payment cleanup also ran.
  Mobile viewport restored; no generated browser bundle created this turn.
- Remaining checklist7 scope: batch deletion result contract, payment recording,
  inline inventory/status actions and production/cancellation acceptance. Remaining
  checklist9 scope includes reduced-motion and remaining visual/accessibility
  matrix. Completion remains80%; no further fixture approval is needed.
- Brain impact: feature contract and canonical task updated; no database schema,
  API response, permission or query-invalidation contract changes in this checkpoint.
- Final standards review found no blocking issues and confirmed the existing
  invalidation ownership and local fixture guards. Scoped diff check passes.

## Batch deletion — 2026-09-14

- Added a bounded batch soft-delete helper and additive confirmed-ID API result.
  Wired the Sales Orders bottom bar; removed blanket selection clearing.
- Five focused tests / 17 assertions pass, covering full/partial/no-match API writes,
  frozen invocation IDs, missing/duplicate confirmations and per-row outcomes.
  Spec and standards reviews report no code blockers.
- Live batch endpoint QA with one selected marked local order27347 showed Deleted
  and inert at82ms, opacity0 at1601ms, and removal at1818ms. No results and no
  selection bar followed. This is a single-selection batch endpoint check; mixed
  outcomes are covered by tests. Fixture/payment cleanup completed.
- API typecheck exits2 solely on existing packages/sales/src/copy-sales.ts:521
  nullable-string mismatch; no batch deletion diagnostics.
- API contract and feature docs updated. No schema or permission changes.
  Completion remains80%; payment recording, inline/status-only adapters and final
  production/cancellation/accessibility acceptance remain.

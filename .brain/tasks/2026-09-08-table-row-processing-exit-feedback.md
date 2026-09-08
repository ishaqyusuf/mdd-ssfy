# Task: Table Row Processing And Exit Feedback

## Status
Blocked

## Priority
Medium

## Created Date
2026-09-08

## Last Updated
2026-09-08

## Global Ticket
- Ticket Position: 1/1

## Source Context
Implement the [reviewed plan](../plans/2026-08-06-ux-ui-table-row-processing-exit-feedback.md).
Shared opt-in row activity and table-local retention; Sales Orders pilot first.

## Implementation Progress
- Completion: 80%
- Current Checklist: 7/10 — Validate production/cancellation and remaining pilot action adapters
- Blockers: Authenticated fixture QA awaits explicit authorization; additional action rollout awaits pilot acceptance

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

# Task: Production missing-inbound alert and quick availability

## Status
Done

## Priority
Medium

## Created Date
2026-09-09

## Last Updated
2026-09-09

## Plan Status
Done

## Plan File
[Plan](../plans/2026-09-09-feature-production-missing-inbound-and-quick-availability.md)

## Global Ticket
- Ticket Position: 1/1

## Source Context
User requested inspection of order 09602PC and a detailed checklist plan; then added a grouped Mark as available control with supplier submenu and received-date double-click save. Brain owns this task. Browser review found zero inbounds and four uncovered needs totaling 58 units.

## Implementation Progress
- Completion: 100%
- Current Checklist: 14/14 — Complete
- Blockers: None.

## Implementation Checklist
- [x] Define scoped alert summary and state precedence.
- [x] Implement scoped availability command, date, supplier, and replay contract.
- [x] Integrate canonical receipt/allocation/projection behavior.
- [x] Add missing-inbound alert and sheet action wiring.
- [x] Reuse partial-selection form and origin-aware success handling.
- [x] Add grouped action, supplier submenu, and received-date quick save.
- [x] Complete cross-surface invalidation and async completion handling.
- [x] Verify role/transaction/UI behavior and update Brain implementation docs.

- [x] Complete final relevant suite and code review.
- [x] Commit scoped work on the current branch and complete the requirement audit.
- [x] Extend the shared Production material panel with covered-review eligibility for reuse in calendar details.
- [x] Add the calendar's full-width View material actions expansion with lazy loading and persistent nested actions.
- [x] Add Sync materials to assignments for safe, idempotent reconciliation of already covered submissions and refresh all affected Production surfaces.
- [x] Validate the calendar/reconciliation extension and update Brain evidence.


## Validation Evidence
### Completion — 2026-09-09
- All14 implementation items are complete. Verification, the two-second hover change and Brain acceptance audit committed on master as b2ebd9377. Main runtime implementation is present in existing commit6f9831d09; unrelated concurrent work was not staged.
- Final compatibility run:54 pass,0 fail,494 assertions. Attention checks:6 pass,19 assertions. Full relevant suite, corrected affected-file reruns, actual worker/admin responsive browser evidence and two-axis no-findings review are recorded below. Existing repository typecheck failures remain a documented limitation, not a passing typecheck claim.
- No reviewed customer order was changed; disposable fixtures were cleaned and the original admin account restored. No database schema migration was required. Task pointer moved to done.md. Historical incomplete-status notes below describe earlier milestones only.


### Compatibility and requirement audit — 2026-09-09
- Final local database regression passes54 tests /494 assertions across ordinary receipt, receipt/cancellation concurrency, availability and covered-material synchronization. This validates existing cancellation compensation, provenance, later dispatch/payment preservation, scoped worker authority, stock coherence and replay. Command completed successfully; log: /tmp/gnd-final-receipt-compatibility.log.
- Audited all nine original acceptance criteria plus calendar/Sync/footer/hover additions against current code, test output and recorded browser checks. Plan acceptance and extension verification are now checked. Both final review agents remain complete with no actionable findings. The final two-second timing edit changes only the opening timer; cleanup and immediate explicit activation remain intact.
- Brain impact: feature, plan, task and ADR updated; existing API contracts/permissions already describe the implemented authority. No schema or migration change. Scoped verification commit is the sole remaining checklist item.


### Final worker check and hover adjustment — 2026-09-09
- User approved Izri Production Quick Login. Verified actual worker calendar and Production: 09602PC shows only three assigned items / 48 units; disabled receiving policy hides Inventory, Mark as available and Sync actions and shows supervisor guidance. 09439PC preserves inconsistent-quantity information. Desktop, phone and tablet fit without horizontal overflow. Neither customer order was changed. Logged out and restored Pablo Cruz through Quick Login.
- User requested a two-second hover delay. Calendar mouse hover now opens after 2,000ms; leaving cancels the timer, and explicit click/keyboard access remains immediate. Six existing attention tests pass /19 assertions. This narrow timing change was source-verified; the rendered tests do not measure elapsed browser time.
- Items8 and14 are complete. Scoped commit and final requirement audit remain open (13/14,93%). Earlier pending-account and verification statements below are historical.


### Final regression and review — 2026-09-09
- Executed77 relevant test files independently to avoid cross-file mock contamination:462 passed,9 failed,125 opt-in tests skipped. The failures were stale expectations in5 files: missing query mocks, the replaced review panel, propagated form callback props, a voided submit promise, and the receipt replay DTO. Updated those checks; rerun passed35 tests /112 assertions. Remaining unsupported matcher types in touched tests were replaced with equivalent supported assertions; focused rerun passed.
- Both Spec and Standards final reviews report no actionable findings. Previous residual-message and clipping findings are resolved. Midday conformance: existing shared primitives, active-only detail mounting, shared domain commands, fixed form footer with separate scrolling body, nested focus/Escape, selected-order navigation, and origin-preserving refresh were verified. Role-limited browser execution remains the last UI conformance check.
- Root typecheck still fails on existing Square/Errors NodeNext import-extension errors. Sales retains copy-sales.ts:521 nullability. Dashboard retains repository-wide cache API, permission-shape and other errors; no changed runtime diagnostics were reported. Touched test matcher diagnostics were corrected.
- The main implementation was incorporated into concurrent commit6f9831d09 while verification continued. Preserve that history and unrelated ongoing changes; final verification updates will be committed separately on master.
- User authorized logout/Quick Fill for worker verification. Logged out of Pablo Cruz through the UI. Automatic approval review rejected selecting Izri Production because that specific account was not named. Explicit Izri account confirmation is pending; no workaround was attempted. The worker-view fixture was removed before logout. No disposable business fixture remains.

### Worker synchronization authority — 2026-09-09
- Added local transactional cases for worker synchronization with current receiving policy, removed assignment, and disabled policy. The enabled worker applies only the scoped pending allocation and replays once; revoked authority leaves the pending allocation untouched. All cases preserve physical stock and create no stock movement.
- Combined receiving/synchronization run passes20 tests /164 assertions (29 unrelated opt-in tests skipped). The initial new test imported another test module dynamically during a test; changed it to a static helper import and the completed rerun passes.
- Remaining: worker workspace browser interaction, final relevant suite/review, scoped commit and requirement audit. No active process or fixture remains.

### Disposable calendar saves and synchronization — 2026-09-09
- Created local fixture QAAV-72b95e (sale27951), scheduled it on the calendar, and expanded its compact details. Main form saved4/10, closed automatically, retained calendar origin and displayed6 pending. More → Mark all → BHI → September8: a single click selected the date without saving; double-click saved the remaining6 and removed the availability alert.
- Prepared a valid historical pending submission on that fixture after receipt coverage. The calendar showed the single Sync action; clicking it removed the resolved panel and showed successful synchronization. No review screen or second approval step appeared.
- Seven database assertions confirmed exactly two receipts (4+6), the selected date/supplier, one synchronization, no remaining pending reviews, one payroll and ten stock units. Cleanup removed the complete fixture and its receipts/reviews/payroll; two cleanup assertions passed. Temporary fixture code and metadata were removed, and the browser search was cleared. Customer orders were not written.
- The top summary count did not visibly change in the long-lived development tab. A new real TanStack QueryClient/QueryObserver + tRPC key + event transport test passes for both availability and Sync commands (2 tests / 10 assertions), proving active calendar, worker calendar, summary and material queries refetch through the production registry. Fresh-page browser verification subsequently passed: a second disposable covered order showed Awaiting review87 before Sync and86 immediately after, with the action panel removed. Local database confirmed zero pending reviews. The earlier observation was confined to the long-lived hot-reloaded tab; no production invalidation defect was reproduced. The second fixture was also fully cleaned up.
- Calendar implementation item12 is complete. Remaining verification items8/14, final review9 and scoped commit10 stay open; completion is10/14 (71%).

### Fixed standalone footer and compact Sync label — 2026-09-09
- Updated the shared action label to **Sync**, retaining its explanation above the button.
- Moved scrolling into the inline form body and kept its footer outside that area. At the live 755 × 863 viewport the dialog spans y16–847, the footer y781–830, and the independently scrolling body is 560px tall with 749px content. No horizontal overflow (510px client and scroll width). The real order was opened for inspection only; no save was submitted.
- Phone 390 × 844: footer y762–811, body 541px with 922px content, no horizontal overflow. Tablet 768 × 1024: footer y466–515 before and after scrolling the body to 492px. Quick date picker stays inside viewport after adding collision padding and a height constraint; Escape dismisses only the picker.
- Both review axes found the normal material-action panel also needed scrolling after the fixed-footer change. Added its own scroll area and verified at 390 × 300: 118px viewport / 182px content, keyboard Tab brings Sync into view. Restored the browser viewport override.
- Eleven focused UI tests pass / 29 assertions. Dashboard and Sales typechecks completed with preexisting repository errors; neither reported diagnostics in the changed runtime files. Existing checklist progress is unchanged while broader role and disposable browser-save validation continues.

### Final user wording clarification — 2026-09-09
- The shared panel now says **Received materials need to be synced to assignments**, with **Sync materials to assignments** as its single primary action. The plan explicitly removes any separate review screen or second approval step and requires applying coverage plus eligible submission approval in the same operation.
- This is a clarification of item 13, not a new review task. Existing progress and outstanding validation remain unchanged.

### Completed shipment synchronization — 2026-09-09
- Implemented scoped completed-shipment demand application using only good received quantities, subtracting amounts already applied to all other demands on each shipment item. Cancelled components and out-of-scope demand rows are excluded. Guarded demand updates and canonical recomputation run inside the synchronization transaction before reservation and submission finalization.
- Availability summaries account for received-but-unapplied shipment quantities so they cannot be offered for receipt again. Public API responses omit the internal shipment/demand evidence and execution plan. Synchronization audits record demand applications alongside allocation and review outcomes.
- Five synchronization database cases pass / 79 assertions, including all four coverage states and shared-shipment/issue quantity scope. Combined with original availability tests: 18 local transaction tests pass / 152 assertions. Focused domain/API/query-event regression: 58 tests pass / 193 assertions. Sales typecheck retains only preexisting copy-sales.ts:521; dashboard follow-up completed with existing repository errors and no diagnostics in the changed synchronization runtime files.
- Shared summary/panel integration (item11) and synchronization implementation (item13) are complete. The checklist is now 9/14 (64%). Items8,9,10,12,14 remain open for responsive/worker and calendar interaction verification, final review, commit and requirement audit. No real order was synchronized during validation.

### Single synchronization action clarification — 2026-09-09
- User clarified that already-received inventory needs synchronization to assignments, not another material-review step. Replaced the review-state availability banner and separate application panel with one **Sync materials to assignments** panel. The action applies eligible materials and finalizes eligible submitted work through the existing transaction.
- Missing-inbound and unfinished-inbound flows remain supported; material synchronization for eligible covered portions is retained. The shared component updates both Production and calendar.
- Browser verified the open 09439PC Production view has the new message and one synchronization button, with truthful residual quantity-inconsistency information. No synchronization was submitted on that order. Three UI tests pass / eight assertions. Existing checklist state and remaining implementation work are preserved.

### Received stock reservation — 2026-09-09
- Added a canonical stock-budget planner and reservation adapter for scoped received quantities without allocations. The summary caps application by outstanding needs and receipt quantities not already attributed to committed allocations, then budgets physical stock across components/variants, including pending allocations that the same command will approve.
- The command approves valid proposals, replans remaining received quantities, reserves through existing stock primitives, recomputes Needs and rechecks reviews in one transaction. The durable audit stores receipt/allocation pairs; availability reads now recognize those pairs after allocation splits or changed notes. No physical receipt or stock movement is created.
- Public covered-material summary exposes applicableReceivedQty but strips internal reservation plans, stock evidence and component-plan IDs. UI displays received units eligible for application.
- Three disposable cases pass / 54 assertions: already reserved, pending approval, and received-but-unallocated. The latter also proves an old receipt cannot allocate again when both need and free stock later increase. Eight focused allocation/UI tests pass. Sales typecheck retains only preexisting copy-sales.ts:521.
- Remaining: shipment marked completed while demand receipt quantities were never applied, wider concurrency/worker checks, responsive/browser save verification, final review and scoped commit. Item13 remains open; completion stays 7/14.

### Existing allocation application — 2026-09-09
- Extended the read-only coverage planner and Apply covered materials transaction to validate existing pending allocations against matching physical stock, cross-order committed capacity and component need. It applies valid components, preserves inconsistent components, then re-evaluates reviews using the established finalization rules. Ordinary receipt allocation confirmation retains its all-or-nothing validation default.
- Admin allocation application requires existing editInboundOrder or editOrders authority in addition to the reconciliation action's editProduction authority. Workers retain policy/assignment scope. Preview includes applicableAllocationCount, allocationBlocked and canApplyAllocations; results/audit include applied allocation counts/IDs.
- Partial planning accounts for physical capacity consumed by earlier accepted components and never treats a skipped component as consuming stock. Five allocation tests plus three UI tests pass (eight tests / 16 assertions). Two disposable database cases pass / 36 assertions, including reserved and pending allocations, insufficient-stock rejection, missing allocation authority, review/payroll coherence and replay. Sales typecheck retains only preexisting copy-sales.ts:521.
- Read-only 09439PC evidence: component34574 has eight pending units against six required; component34581 has seven reserved plus one pending against seven required. These remain blocked. The calendar preview now offers two valid allocations from other components; no action was submitted on the real order.
- Remaining scope includes physically received quantities without a valid allocation proposal, additional worker/concurrency cases and end-to-end responsive/calendar save checks. Checklist item13 stays open; completion remains 7/14.

### Calendar integration milestone — 2026-09-09
- Calendar schedule cards now open persistent accessible material-detail popovers through hover or the explicit details button, including worker cards. View material actions lazily imports/mounts the shared panel; collapsed details do not mount material queries. Expansion replaces duplicate material-review prose while preserving independent conflict/lock information.
- The main action opens the existing selection form inline. Grouped supplier/date actions and covered-review reconciliation use the shared controls. Inventory/inbound callbacks carry the selected calendar order rather than whichever order was previously open.
- Browser checked 09602PC: expansion shows four items / 58 pending; main action shows quantities 10/20/16/12 inside the calendar popover; Cancel returns to actions; More → Mark all → N/A opens Received date; Escape closes only the date picker. Open inventory navigates to 09602PC Needs (4, Inbounds 0), then returned to calendar. No business data saved.
- Six attention tests pass / 19 assertions, covering retained legacy details, worker fallback, independent blockers, material-prose replacement and closed calendar rendering. Completed dashboard checks retain unrelated repository failures and show no changed runtime diagnostics. The follow-up found an unsupported test matcher; replaced it with the repository-supported length/toBe assertion.
- Remaining: exact hover/focus behavior across responsive widths, disposable calendar save/reconciliation browser checks, lazy-request observation, worker interaction coverage and received-but-unapplied Needs application. Completion remains 7/14 (50%); item 12 is not closed before those checks.

### Shared material UI extension — 2026-09-09
- Production now mounts `ProductionMaterialActions`, composing existing pending-inbound and availability panels with the new explicit covered-review action. The action handles server capability, stable revision/request retries, synchronous repeated-click protection, recoverable errors and committed-save refresh feedback.
- The existing inbound selection form now supports an inline presentation, reusing its quantities, supplier/date, scoped command and close-on-success callback. Unique per-instance form IDs prevent duplicate IDs when a calendar form and order sheet coexist.
- Three focused rendered-component tests pass / seven assertions: explicit action for eligible reviews, scoped read-only worker guidance, no write on render and no action for zero eligible reviews. These do not replace interactive browser QA.
- Both dashboard typechecks completed with repository-wide preexisting errors; neither reported diagnostics in the covered action/shared panel/Production integration. The final check also reports no diagnostics in the inline form adapter (`/tmp/gnd-covered-inline-typecheck.log`).
- Shared calendar navigation, lazy expansion, nested interaction QA and received-but-unapplied Needs repair remain open. Completion stays 7/14; no item marked complete on component-only evidence.

### Covered-review server extension — 2026-09-09
- Added read-only `sales.coveredProductionMaterials` and transactional `sales.applyCoveredProductionMaterials` API paths. The current command finalizes eligible already-covered pending reviews using the established reconciliation/payroll rules, durable actor/request replay and refreshed canonical projections.
- Administrator authority requires editProduction; worker authority uses the existing receiving policy and active assignment scope. Reads never approve reviews. No new receipt, stock movement or submission is created.
- Local disposable database test passes with 16 assertions: eligible preview, denied authority, stale revision with no payroll/review side effects, one successful reconciliation, duplicate replay, conflicting replay, exactly one payroll and no receipt/stock movement.
- API access and query-event tests pass: 44 tests / 164 assertions. Shared material summaries, calendar/list and open Production are registered for refresh.
- Sales typecheck caught a nullable evidence revision in the new module; corrected. Completed rerun retains only preexisting copy-sales.ts:521 nullability failure.
- Item 13 remains incomplete: safe application of received-but-unapplied Needs, additional scope/concurrency cases and user-facing action integration remain. Calendar expansion and shared UI are still open. Original item 8 verification is also still open; no existing checked item was reset. Completion remains 7/14 (50%).

Read-only in-app browser inspection and source tracing completed 2026-09-09. Existing form opened and cancelled; no business data saved. Detailed evidence, defaults, risks and acceptance checklist are in the linked plan.

Implementation authorized through implement-with-progress. Test seams are the saved plan’s domain/API commands and summary DTO, observable UI interactions, and query-event registry. Baseline saved under /tmp/gnd-availability-baseline to preserve unrelated dirty work when committing.

### Server milestone — 2026-09-09
- Added scoped summary, supplier read, availability request/date contract, and transactional partial/all command with identity replay, lifecycle/policy checks, canonical receiving/allocation and projection refresh.
- Summary tests: 4 pass / 8 assertions. Contract tests: 3 pass / 10 assertions. Actual API access tests: 7 pass / 12 assertions.
- Rollback-only local MySQL test passes (8 assertions): receive 4/10, preserve remaining 6, replay once, persist business received date, receive remaining 6, then covered state.
- The local test exposed overlapping received/allocated counters. The availability summary uses committed allocations for readiness and excludes already-received quantities from new receipt capacity. The extracted shared demand-selection helper subtracts their maximum instead of counting the same receipt twice. Inventory table parity still needs verification during UI integration.
- Regular Sales typecheck initially found a new select-field mismatch, now corrected; remaining unrelated copy-sales.ts:521 nullability issue recorded. Final validation remains open.

### UI and transactional milestone
- Browser confirms 09602PC banner: four needs / 58 units; main form has scoped quantity controls. Supplier submenu contains N/A then seven suppliers; selecting N/A opens the received-date calendar. A single click stays in the calendar. Fixed submenu-close focus handoff.
- Eight independent local transaction tests pass (44 assertions), covering same/different concurrent keys, rollback, stale snapshot/supplier, enabled/removed/disabled worker authority, and unlinked ordered demand with pending stock proposals.
- Dashboard typecheck completes with increased memory but reports existing repository-wide errors; two new errors (Needs segment key and optional input type) corrected. Final rerun pending.

### Scope addition — calendar and covered-review actions
User requested an additive update to this ticket while current availability work continues. Original checklist items and evidence are preserved; four implementation items are appended (14 total). The current work remains item 8. Overall completion recalculated from 7 checked items / 14; this is scope growth, not a rollback. The linked plan addendum specifies lazy **View material actions**, shared inline actions, and **Apply covered materials**. Existing automatic review reconciliation runs after receipt writes; historical covered-but-pending records need the newly planned reconciliation action. No read-triggered mutations are planned.

Read-only 09439PC browser recheck confirms the allocation/review example: three linked inbounds, top attention for 3 material items / 12 units pending, and completed items awaiting review (expanded assignment 1/1 submitted). The plan now includes explicit extension acceptance checks and a calendar interaction diagram. Inventory coverage must be revalidated before repair; the visible completion label is not coverage evidence. Existing checklist state and ongoing implementation are preserved.

### Current validation snapshot
- 199 focused tests pass / 550 assertions. 13 local transaction tests pass / 73 assertions.
- Two-axis review found and resolved historical allocation replay, merged component caps, and receipt provenance after splitting allocations. No remaining findings in the focused re-review.
- Browser verified partial4 → remainder6 → quick supplier/date save6 → no availability banner, staying on Production. Stale-data refresh preserved form quantity. The selected received date and exactly two writes were confirmed. Real order09602PC unchanged.
- Sales typecheck retains preexisting copy-sales.ts:521 error; dashboard retains unrelated matcher/form errors; root check fails in existing Settings NodeNext imports. New availability files had no completed-check diagnostics.
- Current implementation remains uncommitted in the shared checkout. Broader responsive/worker browser checks, original final audit/commit and the four newly planned extensions remain open; do not mark the ticket complete.
- Brain impact documented in features/production-material-availability.md, API contracts/permissions, and decisions/2026-09-09-production-availability-command.md. No database migration required.

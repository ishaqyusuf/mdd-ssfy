# Brain Intake: Inventory Correctness Pending Gates

## Status
Approved

## Created Date
2026-07-01

## Last Updated
2026-07-01

## Raw Input
User asked to list all pending tasks for the current inventory correctness goal, then asked to put all of those pending tasks into an intake. The live goal is the Inventory System Correctness Cutover. Repairs were explicitly stopped by user request and must not resume unless the user explicitly says to resume repair dry-runs or applies.

## Generated Plans
- [x] Existing: Inventory System Correctness Cutover - `brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md` - Status: In Progress

## Pending Gate Inventory
1. Phase 8 clean reconciliation:
   - Keep repair dry-runs and applies stopped until explicit user instruction resumes them.
   - Decide non-active missing-sales scope: quote, terminal/history, completed-production, manual inventory-status, statusless quote, and unknown-status rows.
   - Review `1380` mapping-blocked active/order candidates and decide mapping/product scope.
   - Review `9` shipment/allocation drift rows and `1` skipped comparison.
   - If repairs are explicitly resumed, the next reviewed materializable active/order batch is `2792` through `2884`, with `244` materializable candidates remaining before that batch.
   - Clean evidence requires monitor/reconciliation alignment, `0` drift, `0` skipped comparisons, `hasMore=false`, and exhausted cursor.
2. Phase 1 Sales Overview Inventory tab operator proof:
   - Validate setup modes, fulfilled/no-inventory informational UI, terminal read-only rows, and locked linked-inbound controls.
3. Phase 2 sales inventory sync and projection proof:
   - Verify save/copy/manual/repair sync sources, mixed line projections, stale-demand handling, and monitor status behavior.
4. Phase 3 inbound duplicate and concurrency proof:
   - Validate duplicate create/assign retries, already-linked demand handling, concurrent receive-before-link, partial selected quantity split, and terminal parent rejection.
5. Phase 4 receiving, cancellation, and inbound issues proof:
   - Decide replacement behavior for issue receipts.
   - Validate receive, cancel, and issue flows from operator surfaces.
6. Phase 5 allocation, backorder, and partial-shipment proof:
   - Record allocation review, received-backorder retry, partial shipment, and hold-until-complete evidence.
7. Phase 6 production and fulfillment operator proof:
   - Validate configured-order Mark As blockers, safe continue behavior, and production lifecycle behavior in the live workflow.
8. Phase 7 inventory dispatch operator proof:
   - Validate assign, pack, fulfill, release, and delivery quantity reconciliation against consumed allocation state.
9. Phase 9 UI polish:
   - Complete the shadcn/Midday pass for dense operational states, locked operations, routing, and responsive behavior.
10. Phase 10 proof matrix:
   - Record the full fixture-backed before/action/after browser evidence set in Brain.
11. Phase 11 release gates:
   - Decide cutover defaults/toggles only after the earlier gates.
   - Record final release acceptance.
   - Move the cutover plan and roadmap task to Done only after Phase 11 acceptance is recorded.

## Recommended Execution Order
1. Phase 8 clean reconciliation decisions - this is the current gate and determines whether any further repair work is allowed.
2. Phase 1-7 operator proof gaps - these validate the already-implemented correctness surfaces across Sales Overview, sync, inbound, receiving, allocation, production, and dispatch.
3. Phase 9 UI polish - once behavior is proven, tighten the operator surfaces with shadcn/Midday patterns.
4. Phase 10 browser proof matrix - capture fixture-backed before/action/after evidence in Brain.
5. Phase 11 release gates - decide cutover defaults/toggles and record final acceptance.

## Agent Recommendations
- Inventory System Correctness Cutover: open-code - correctness, reconciliation, API, package tests, and guarded repair decisions should stay close to the existing domain packages and scripts.
- Phase 9 UI Polish and Phase 10 Browser Proof Matrix: antigravity - useful for dense operator UI review, visual proof, and fixture-backed browser evidence after the behavior gates are ready.

## Merged Items
- Phase 8 reconciliation, repair-stop state, missing-sales scope, mapping-blocked scope, and shipment/allocation drift review were merged into the existing Inventory System Correctness Cutover plan because they are the current reconciliation gate.
- Phase 1 through Phase 7 operator proof tasks were merged into the existing cutover plan because they validate already-implemented inventory correctness behavior rather than creating independent feature scope.
- Phase 9 through Phase 11 polish, proof, and release gates were merged into the existing cutover plan because the full cutover cannot close until those gates are recorded together.

## Duplicate Or Existing Items
- The full pending gate list already exists in `brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md`.
- The active work item already exists in `brain/tasks/in-progress.md` under Inventory System Correctness Cutover.
- The roadmap task already exists in `brain/tasks/roadmap.md` under Inventory System Correctness Cutover.
- Latest Phase 8 evidence already exists in `brain/reports/2026-07-01-inventory-reconciliation-evidence.md`.
- Source intake remains `brain/intake/2026-06-15-inventory-cutover-pending-scope.md`, with related Sales Overview Inventory workflow intake at `brain/intake/2026-06-22-sales-overview-inventory-workflows.md`.

## Needs Clarification
- When, if ever, should repair dry-runs or applies resume?
- Which non-active missing-sales buckets should be included, excluded, archived, or handled by separate product-scope decisions?
- What product/mapping decision should resolve the `1380` mapping-blocked active/order candidates?
- For the `9` shipment/allocation drift rows and `1` skipped comparison, should legacy delivery rows, consumed inventory allocations, or missing legacy sales-item links be treated as the repair source of truth?

## Skipped Items
- No new plan files were created because all pending work is already represented by the active cutover plan.
- No new roadmap task was created because the Inventory System Correctness Cutover task is already In Progress.
- No handoffs or queue items were created because the user asked for an intake only.
- No repair dry-runs, repair applies, browser checks, dev servers, builds, or typechecks were run.

## Approval Notes
- This intake was created by user request on 2026-07-01 as a consolidation of pending gates for the already-active Inventory System Correctness Cutover. It does not expand scope, resume repairs, or mark the cutover complete.

## Handoff Notes
- Use `brain-batch-handoff` only if this intake later needs to be converted into implementation handoffs.
- Lower agents must read this intake, the active cutover plan, the latest reconciliation evidence, and the active task ledgers before continuing the cutover.
- The repair-stop instruction is binding until explicitly changed by the user.

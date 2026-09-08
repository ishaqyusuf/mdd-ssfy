# Task: Sales Mark as eligibility, labels and archive

## Status
Done

## Priority
Medium

## Created Date
2026-09-08

## Last Updated
2026-09-08

## Global Ticket
- Ticket Position: 1/1

## Source Context
[Approved plan](../plans/2026-09-08-sales-mark-as-eligibility-and-archive.md).
User approved implementation. Latest clarification: saved sale requirements establish
Ready (no production) or Not Assigned (production without assignment). Generate
controls and the saved order summary after creation/update through the existing
background workflow; do not add saved-item joins to the orders-list query.
Inventory problems stay separate alerts. Initial background processing shows Updating….

## Implementation Progress
- Completion: 100%
- Current Checklist: 8/8 — Commit scoped changes and audit completion
- Blockers: None

## Implementation Checklist
- [x] Trace current requirements and status evidence, including 09631PC.
- [x] Generate initial scope and short status labels after save, with regression coverage.
- [x] Implement shared production menu and batch eligibility rules.
- [x] Consolidate archive/restore in Mark as and remove separate batch action.
- [x] Verify permissions, confirmation, refresh, selection and error behavior.
- [x] Complete focused tests, typechecks and in-app browser acceptance.
- [x] Complete code review and resolve findings; update Brain behavior docs.
- [x] Commit scoped changes on the current branch and audit completion.

## Validation Evidence
- Current checkout: gnd, master. Pre-existing changes recorded in /tmp/gnd-mark-as-baseline/preexisting.patch; preserve them.
- Approved validation seams: pipeline/menu presentation and batch selection interfaces, archive API behavior, rendered single/batch/overview browser actions. These are the test boundaries in the accepted plan.
- Prior browser inspection: 09631PC has No production items, Unknown production and enabled Production completed. Confirmation cancelled without submitting.

- Local read confirmed 09631PC / 27201 has zero item controls, failed inventory projection, unknown production and both completion capabilities denied. No source facts changed.
- Initial status presentation regression: 3 tests / 10 assertions pass. Inventory sync completion is not physical stock readiness; real readiness integration remains pending.

- Follow-up trace: new-form, old-form, checkout and copy paths already queue sync-sales-inventory-line-items. Its runner currently updates inventory only; update-sales-control refreshes the canonical list projection after operational actions. Reuse existing control reconstruction and projection refresh in a post-save calibration phase, independently of inventory success.

- Implemented post-save coordinator and wired existing sync job: locked derived-control rebuild and persisted list summary precede inventory sync. Fixed simple-item controls hardcoding produceable=true; legacy swing is normalized to boolean. Eight focused tests pass (initial scope, assignment identity, historical retention, coordinator failure ordering). Sales typecheck exposed a transaction-client annotation, corrected; an unrelated copy-sales.ts nullable-string error is also present. Remaining: save-path exceptions, job completion refresh, overrides/unknown configuration, existing-row repair, pending UI, and full acceptance.

- Save-path coverage: new-form and both old-form entry points now queue calibration even when ordinary inventory sync must be skipped. Added optional skipInventory job input; copy/checkout already queue the same job. Eleven coordinator/queue/save-path tests pass, in addition to five scope/history tests. Repeat sales typecheck reports only the concurrent copy-sales.ts:521 nullable-string error. Checklist 2 remains open pending full initial-status/browser verification.

- Latest user clarification: status labels must use the normal shared status-color channel. Presentation tones now resolve through lifecycle metadata; the Orders badge routes Ready/Not Assigned/Updating through existing lifecycle badge classes. Four status-presentation tests pass, including color mapping.
- Local calibration verified against 09631PC and 09632AD: each now has one generated control, production not_required and Ready. Compared assignments, deliveries and completion records before/after: unchanged. Browser confirmed 09634PC Ready, with Fulfilled and Archived and no Production completed menu option.
- Pending generated requirements now display Updating… without granting production permission. Added per-door production-override regression tests. Batch production confirmation now reports eligible and excluded counts. Summary refresh checks persistence and includes completion revisions; a second refresh publishes inventory results without rebuilding controls.

- Browser follow-up: the first three Ready badges render with the existing bg-violet-100/text-violet-700 lifecycle classes. Selecting 09634PC shows only Mark as in the batch toolbar; its menu contains Fulfilled and Archived, with no standalone archive button and no production action. Archive/restore consolidation checklist item complete; mutation/permission acceptance remains in checklist 5. Ten focused presentation/menu/selection tests pass.

- User requested analysis of Not synced after production-to-local sync. Read-only local sample: 24 nondeleted orders created since 2026-09-08 00:00 UTC; 18 inventory projections ready, five failed, one missing. Orders 09632AD, 09630DB, 09629AD and 09628AD have ready projections with positive needCount but their local LineItem records have empty components. resolveSalesInventoryApplicability explicitly returns not_synced for that mismatch. This proves missing local requirement detail, not that no job ever ran; exact source-side/import cause remains unverified. 09631PC has a distinct failed mapping error. Browser monitor currently shows one create-sales-history run (run_06g85h1ai5cc3b6r18sdsnfn01), not the inventory job. Starting a worker does not automatically enqueue imported rows.
- Review results received: distinguish missing route configuration from configured non-production; preserve archive access without pipeline evidence; preserve permitted audited production cancellation before not_required filtering; show mixed archive-direction counts. Fixes pending.

- Resolved code review findings: missing configuration throws before writes; direct archivedAt added to lean DTO/materialized summary (version6) and overview; mixed archive directions display counts; only an actual recorded completion preserves cancellation on not_required production.
- Local rollback fixture calibrated a saved sale through no production → production required → no production and asserted Ready → Not Assigned → Ready, with zero assignments/deliveries/completion records throughout. Rollback verified no fixture remaining. Archive+orders API tests: 28 pass, 75 assertions. Initial status and eligibility checklist items complete.

- Final review follow-up closed all reported findings in the reviewed scope. Browser archive confirmation opened successfully and was cancelled without mutation; standard menu and independent archive state remained present. Verified changed-only selection cleanup and sales.order.changed query-event mapping; archive API tests prove permissions and restoration/audit.
- Validation: dashboard typecheck completes with existing repository-wide errors but no diagnostics in sales-menu.tsx, sales-archive-menu.tsx, order-finance-status-cells.tsx, or general-action-bar.tsx. Sales typecheck retains the concurrent copy-sales.ts:521 error. Read-model tests pass. One existing source-string feedback test expects setFulfillmentEffectiveDate(toSalesCompletionDateValue()) while HEAD already uses server-provided today; confirmed pre-existing via git show HEAD, unrelated to this task. Final scoped test set and commit preparation remain.

## Completion audit before commit
- Requirements/status: saved-line controls rebuilt in the existing job, independent inventory processing, no added list relation queries; local rollback fixture proves Ready/Not Assigned/edit transitions without operational writes. Missing settings reject reconstruction; door overrides and historical assignment identity have regressions.
- Menus: ordinary production completion/cancellation hidden for no-production, missing evidence disabled, recorded cancellation preserved; batch selection/counts and zero-eligible guard covered.
- Archive: single, row, overview and batch callers wired; standalone row/batch actions removed. Direct archivedAt, permission, audit, restore, idempotency, confirmation cancellation, query invalidation and changed-only selection verified.
- Color: existing lifecycle metadata and badge classes used; browser verified Ready class.
- Final focused suite: 76 pass / 0 fail / 209 assertions across 15 files. Broader typechecks were run; baseline errors and an unrelated stale source-string test are documented above. Review agents confirmed their findings closed after fixes.
- Committed implementation: 2c24408bb. Verified committed archive-state transport, production caller pipeline evidence, shared labels, background job entry point, and clean staging area. All checklist requirements audited; no implementation work remains.

Final commit audit: 2c24408bb contains 49 scoped files. Unrelated worktree changes were preserved. Final suite: 76 passing focused tests; broader baseline validation limitations remain documented.

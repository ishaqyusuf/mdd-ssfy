# Production Sync repair of covered-material dead ends

Status: Implemented and locally verified. Production unchanged.

## Evidence and objective

See [09602PC investigation](../bugs/2026-09-09-09602pc-material-sync-analysis.md). Keep one existing Sync action, which applies received materials, repairs deterministic stale allocation/classification state, and finalizes eligible submissions. No extra review screen for automatically verifiable repairs.

Current preview excludes blocked components from received-stock reservation planning. It offers no repair candidates, so stale suggestions make their own component ineligible for fresh reservation. Classification conflicts independently block review finalization. The panel is forced visible for review state but hides Sync when canApply is false and incorrectly labels every false value as a supervisor issue.

## Implementation sequence

1. Extend the package-owned preview with typed actionable repairs, exact unresolved reasons, counts, and revision evidence. Distinguish authority from actionable work. Include deterministic repair candidates in canApply. Do not expose internal unrelated-order records to the client.
2. Plan stale suggestion repairs per component. Preserve committed allocations; reconcile only pending proposals shown to be obsolete or backed by exhausted/mismatched stock. Use established cancellation/supersession semantics, retaining audit history. Reassign uncovered needs only to compatible, verified received-stock capacity, accounting for reservations across all orders and receipt provenance. Never manufacture stock, double-count receiving plus allocation, or appropriate another order's reservation. 09602PC should use verified remaining receipt stock to cover 3 on 48006 and 5 on 48007 instead of approving exhausted-stock suggestions.
3. Reconcile derived inventory production classification against authoritative sales configuration and active production scope. Investigate the copy-sales writer and current resolver to prevent recurrence. Do not blanket-set produceable=true or alter product catalog classification merely because an assignment exists. Repair clear stale projections; preserve a specific blocker for contradictory authoritative configuration. Apply the same rule on subsequent inventory projection rebuilds.
4. Extend the existing serializable Sync command: lock/revalidate scope, authority, source revisions and affected stock evidence; repair eligible classification/proposals; recompute the material plan; apply coverage; recompute review eligibility; use existing review/payroll finalization; recompute final residual state; audit and refresh projections. Preserve actor/request idempotency and rollback on races. Existing worker policy must not silently grant new production-configuration authority.
5. Keep the existing Sync panel and button. Actionable state: explain that received materials and assignment records need synchronization. Include safe repair availability even when ordinary allocations/reviews are not yet eligible. Truly blocked state: name the item, reason and concrete authorized next action; never show an empty sync promise or conflate no work with insufficient permission. Hide only material-sync attention after all material blockers resolve; unfinished production remains accurately visible elsewhere.
6. Add focused domain and local transactional regressions for fully received stock with stale pending suggestions, exhausted shared stock, classification repair versus genuine conflict, partial component success, replay/concurrent click, scope/permission checks, and exactly-once review/payroll finalization. Verify 09602PC locally through the existing action with before/after database evidence and Production/Inventory/calendar refresh.

## Expected local acceptance

- 48006: committed coverage reaches 20/20; 48007 reaches 16/16 if verified receipt capacity remains available.
- 48008 remains 12/12 and 48021 remains 10/10 without duplicate reservation.
- Copy-sales classification conflict is resolved only where canonical evidence supports it.
- Interior review 461 finalizes once all its scope and material checks pass; exterior assignment remains unfinished because Sync creates no submission.
- A second invocation creates no stock, receipt, allocation, approval or payroll duplication.
- No physical inbound/receipt or unrelated order reservation is altered.

## Documentation impact

On implementation update production-material-availability feature docs, API contracts/endpoints if preview/result DTOs change, a durable classification-reconciliation ADR, and task/progress state. No schema change is presumed; assess after selecting the existing pending-allocation history semantics.

Completion: includes the subsequently requested review-only notice and editor timestamp-only snapshot recheck. See task verification and accepted decision.

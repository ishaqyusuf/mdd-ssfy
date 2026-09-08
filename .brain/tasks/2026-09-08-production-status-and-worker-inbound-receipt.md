# Production status clarity and worker inbound receipt

## Status
In Progress

## Priority
High

## Created Date
2026-09-08

## Last Updated
2026-09-08

## Global Ticket
- Ticket Position: 1/1

## Source Context
[Implementation plan](../plans/2026-09-08-production-status-and-worker-inbound-receipt.md).
Latest inbound-only direction supersedes the earlier embedded review checklist.
Current scope: compact pending inbound list and receipt action in Production,
default-off scoped worker policy, physical receipt plus Needs allocation and
transactional refresh, truthful production badges, and note-free material review.
Retained receipt cancellation, automatic reconciliation of existing reviews and
the new primary/secondary attention presentation are explicitly queued in the
[follow-up](2026-09-08-production-receipt-follow-up-and-cancel-review.md).

## Implementation Progress
- Completion: 92%
- Current Checklist: 12/12 — Scoped commit and task closure
- Blockers: None

## Implementation Checklist

- [x] Replace embedded review/checklists/alerts with the compact inbound-only Production section (latest direction).
- [x] Remove Decision note fields while retaining generated server audit and standalone queue behavior.
- [x] Show progressive reported/review/completed badges; suppress Assigned and Material Ready as superseded, preserving real partial gaps.
- [x] Trace reported 09504PC unavailable status and verify canonical calendar/detail semantics.
- [x] Verify default-off worker policy, exact assignment scope and alternative endpoint bypass prevention.
- [x] Complete bounded pending-inbound query and exact restricted Inventory navigation with capability/empty/error states.
- [x] Verify atomic retry-safe receipt, scoped Needs application, allocation and audit including races/rollback.
- [x] Verify refreshed Production, Inventory, calendar and stored projections after receipt.
- [x] Run downstream submission/review/payroll/packing/dispatch/payment regression coverage.
- [x] Complete authenticated UI checks, relevant typechecks and Brain documentation/ADR.
- [x] Complete final code review and migration conformance audit; resolve findings.
- [ ] Commit only this task's changes on the current branch and complete the task ledger.


Completion is 11/12 = 92%. Scoped commit and task closure are still required.

## Migration Contract and Conformance
Existing order-sheet/controller, active tabs, URL state, Inventory destination,
settings owner and shared UI components are reused. Production mounts the compact
inbound component, not the embedded administrative review queue. Worker Inventory
is restricted to the assigned scope. Domain/API owns authorization, receipt,
allocation and audit; browser code consumes typed server capabilities. No new
workspace, schema, migration, backfill, bulk approval or hosted data change.

## Validation Evidence
- Nine real transaction tests /99 assertions: same/different-key concurrent
  receipts; command-owned rollback after allocation rejection; worker-first and
  simultaneous worker/admin receipt; assignment/policy/cancellation revalidation;
  unrelated shipment-item preservation; distinct-order shared-stock capacity;
  unchanged pre-existing pending/approved reviews, submissions, payroll and
  assignment; persisted audit contents and canonical projection revision.
  Log: /tmp/gnd-receipt-races-final3.log.
- Worker fixtures route only policy reads and the policy lock to a private Settings
  row. All other DB operations and transaction boundaries are real. Interactive
  Sales policy is never enabled by these tests. Revalidation tests do not claim
  an observed lock-wait interval.
- Five additional local rollback-only scenarios /62 assertions cover normal,
  split-demand, partial, invalid pending allocation and large shared shipment.
  Log: /tmp/gnd-receipt-local-projection-final.log.
- Four actual tRPC caller tests /8 assertions verify worker endpoint bypass
  prevention, default-off receipt denial, scoped reads and Inventory-only denial
  of the general Production dashboard. Four rendered component tests /14 assertions
  cover compact rows, policy-off controls, restricted Inventory URL selection and
  loading/error/empty states. Query-event tests pass36/138 assertions.
- 26 selected regression files previously passed independently (Bun module mocks
  require process isolation). The final30-file relevant matrix passes; see
  /tmp/gnd-receipt-final-regression-results.json for individual outcomes.
- Sales/API types passed after projection fixes. Final Sales/API checks pass after
  test fixture additions. Dashboard completes with an8 GB heap but has554 existing
  diagnostics; no matched diagnostic in changed receipt/settings/UI runtime files.
  Root check fails on existing Settings/Errors NodeNext extension diagnostics;
  do not treat broad types as passing. Logs: /tmp/gnd-receipt-close-dashboard-final2.log
  and /tmp/gnd-receipt-final-sales.log.
- Authenticated browser fixture27346: compact section appeared immediately;
  Mark as received showed Receiving and automatically removed the pending section.
  A DB assertion verified qtyGood10 and identical existing production records;
  fixture cleanup verified order/stock movement absence (1 test /4 assertions).
  Log: /tmp/gnd-receipt-browser-fixture2.log. No existing order mutated.
- Open inbound selected exact Inventory URL for fixture27345. Its minimal fixture
  lacks order-form synchronization lineage, so the existing Inventory auto-sync
  reported repair needed and changed its evidence. Production correctly rejected
  the stale revision. This is not claimed as full Inventory synchronization QA.
  All fixture and derived QtyControl/inventory projection records were removed.
- Read-only original-order trace:09455PC/09488AD had known pending Production
  reviews but blank commercial status, which incorrectly suppressed their display.
  Removed only that presentation guard.09504PC has since changed to Assigned with
  no submissions and cannot be claimed reproduced in its original state.

## Defects found during review and fixed
- Pending allocation confirmation now validates exact variant, Need and physical
  stock capacity; retains Serializable isolation and scoped shipment-item limits.
- Final remaining coverage is computed once per Need after all allocations.
- Public conflicts reach the API; settings refreshes revisions after save failure.
- Receipt uses a dedicated permission helper rather than broadening general
  Production viewer access; alternative Inventory mutation/read bypasses guarded.
- Real transaction tests exposed skipped order projection persistence when using
  only sale.updatedAt. Receipt now uses current canonical evidence revision and
  rolls back if projection persistence does not succeed.

## Review and Documentation
Standards and spec agents reviewed separately. Prior implementation findings are
resolved. Latest spec recheck confirmed command rollback, worker receiving,
production-record invariance, audit and projection proof; its remaining test-label
and shared-stock coverage comments were addressed. Both final staged review axes report no actionable findings.
ADR: [Scoped receipt](../decisions/2026-09-08-scoped-production-inbound-receipt.md).
Brain impact: Production feature, API contracts/permissions, plan, task/progress and
follow-up backlog updated. Database schema unchanged; audit uses existing Event.

## Remaining delivery work
Final regression and review passed; commit only this scope
on master, and move the task pointer to Done. Unrelated concurrent edits must remain.
The worker operational trial and queued follow-up are not silently enabled.

Final Inventory and Jobs typechecks ran and retain pre-existing Errors NodeNext,
pricing test input and shared React type-version diagnostics. No receipt-specific
diagnostics appeared. Logs: /tmp/gnd-receipt-final-inventory-types.log and
/tmp/gnd-receipt-final-jobs-types.log. Local receipt scenario durations were under
one second including fixture operations; no production load-performance claim.

# Production Sync repairs

Status: Complete
Plan: [One-click repair](../plans/2026-09-09-production-sync-repair-dead-end.md)

- [x] Confirm local evidence and canonical eligibility rule.
- [x] Implement transactional allocation/classification repairs, revision revalidation and audit.
- [x] Extend Sync to eligible timestamp-only review scope refresh and established finalization.
- [x] Keep a single actionable review-only notice/button and specific blockers.
- [x] Verify focused regressions and local09602PC UI including fresh page.
- [x] Update feature, contracts, permissions, decision and progress documentation.

Validation: focused local transaction suite21 passed/181 assertions;29 separate receipt/cancellation tests disabled by their opt-in flag. Latest UI/planner tests12 passed/29 assertions. Existing inventory/allocation tests35 passed/77 assertions. Concurrency/replay regression confirms exactly-once repair and review finalization.

Local UI: first Sync repaired3 suggestions,2 classifications and allocated8 units. Review-only Sync then cleared pending review and showed all3 interior items as PRODUCTION COMPLETED; exterior remains MATERIAL READY / ASSIGNED. Fresh local preview: canApply=false, eligibleReviewCount=0, no repair candidates or blockers. Production unchanged.

Validation limitations: API and Sales typechecks report existing copy-sales.ts:521 nullable-string error. Root typecheck reports existing settings/errors ESM extension diagnostics. These unrelated failures were not changed. No schema migration required.

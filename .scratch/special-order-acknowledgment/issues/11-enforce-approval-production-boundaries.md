# 11 — Enforce Approval At Production Boundaries

**What to build:** Extend the shared enforcement contract through every authoritative production-progression path so unapproved Special Orders warn or stop consistently regardless of whether the action comes from staff, automation, a batch, or a background job.

**Blocked by:** 10 — Enforce Approval At Purchasing Boundaries.

**Status:** complete

- [x] Warning Only permits governed production progression with consistent warning metadata and deduplicated would-block observability.
- [x] Block Purchasing & Production and Block All Operations reject new production progression without Current Approval.
- [x] Current Approval, Not Required, and legacy/unmanaged orders continue when other production rules and permissions allow.
- [x] Viewing, cancellation, release, rollback, reconciliation, error recovery, and correction of existing evidence remain available.
- [x] The gate does not reverse completed production evidence or unrelated payment state when approval becomes stale.
- [x] Every authoritative manual, automated, batch, task, and background production entry point uses the shared server decision.
- [x] Production UI renders the stable warning/block result and recommended Sales action without becoming the integrity boundary.
- [x] State and settings changes take effect on the next production operation without stale caller-controlled flags.
- [x] Repeated blocked attempts do not flood Sales Activity while operational telemetry remains attributable and useful.
- [x] Matrix tests cover all production entry points, modes, approval states, exceptions, stale revisions, permissions, and direct bypass attempts.

## Implementation progress (2026-08-13)

- Manual, batch, jobs, inventory, and dispatch-adjacent production gates use the shared server decision; focused matrix and entry-point source-contract tests pass.
- Final acceptance completed the production UI/direct-bypass matrix.

# 07 — Resolve Production Readiness Assistance Requests

**Source:** [Fulfillment Admin And Responsive Driver Workflow](../../dispatch-admin-responsive-driver-workflow/spec.md)

**What to build:** Let a driver request help when packing is blocked by missing
production assignment, completed-but-unsubmitted production, or pending
material review. The protected admin review invokes the responsible production
workflow and returns Ready to resume only after fresh readiness validation.

**Blocked by:** 06 — Handle Physical Shortages And Partial-Dispatch Back Orders.

**Status:** ready-for-agent

- [ ] The three production blocker classes produce durable, revision-bound, idempotent assistance requests from the packing context.
- [ ] Requests identify the responsible production capability and expose sufficient bounded evidence to authorized administrators.
- [ ] Missing assignment uses production assignment, unsubmitted work uses canonical review/submission, and material review uses its existing resolution command.
- [ ] Resolving the Dispatch Exception alone cannot rewrite production evidence or mark the dispatch ready.
- [ ] Denial, expiry, changed revision, absent capability, and repeated remediation attempts are explicit and audited.
- [ ] The driver sees Waiting for admin and receives Ready to resume only after the server projects the blocker as cleared.
- [ ] Production, permission, stale-revision, admin/driver UI, and end-to-end assistance tests pass.


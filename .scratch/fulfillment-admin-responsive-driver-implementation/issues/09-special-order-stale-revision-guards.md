# 09 — Enforce Special Order And Stale-Revision Blockers

**Source:** [Fulfillment Admin And Responsive Driver Workflow](../../dispatch-admin-responsive-driver-workflow/spec.md)

**What to build:** Integrate Special Order enforcement and stale-manifest
handling into driver assistance. Special Order progression uses its existing
permissioned revision-bound decision, while stale work refreshes and revalidates
instead of accepting an administrative readiness override.

**Blocked by:** 06 — Handle Physical Shortages And Partial-Dispatch Back Orders.

**Status:** ready-for-agent

- [ ] Special Order and stale-revision blockers appear with clear driver copy and durable assistance evidence.
- [ ] Special Order progression requires both ordinary operational authority and the existing eligible revision-bound approval override.
- [ ] Customer Declined and actors missing either permission remain blocked.
- [ ] Stale order, dispatch, allocation, packing, or assignment revisions cannot be approved and require a refreshed manifest.
- [ ] Allowed exception, denial, expiry, refresh, and resulting readiness are attributable in Activity.
- [ ] No browser or API payload can claim an override flag or replace server-resolved capability.
- [ ] Special Order matrix, stale concurrency, permission, admin/driver UI, and direct-command tests pass.


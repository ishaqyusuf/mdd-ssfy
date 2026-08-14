# 04 — Add The Role-Configured Special Order Approval Override

**What to build:** Add an auditable Role capability that lets an employee who
already has the relevant operational authority progress a Signature Pending or
Reapproval Required Special Order, while keeping Customer Declined protected and
making every server-side override explicit and attributable.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Role configuration exposes Override Special Order Approval through normalized scope `overrideSpecialOrderApproval`, and Super Admin receives it through existing generated-permission behavior.
- [ ] The server resolves override authority only from the authenticated session; public inputs, protected mutation inputs, jobs, batches, and automation payloads cannot claim it.
- [ ] The capability never grants purchasing, production, packing, or dispatch authority by itself; the actor must also pass the existing permission boundary for the attempted operation.
- [ ] Signature Pending and Reapproval Required can produce an explicit `OVERRIDDEN` result across all four forward-progression categories when both permissions are present.
- [ ] Customer Declined remains blocked in blocking modes even for a Role with the override capability.
- [ ] Current Approval, Not Required, legacy unmanaged orders, Warning Only behavior, and cancellation/release/rollback/reconciliation paths preserve their existing semantics.
- [ ] API, direct command, batch, automation, and background-job entry points all use the same session-derived permission-aware enforcement decision.
- [ ] Successful override feedback identifies safe order, state, enforcement-mode, and operation context without representing the order as customer approved.
- [ ] Durable evidence records actor, effective Role, order, revision, operation, enforcement mode, source, result, and timestamp; command idempotency prevents duplicate evidence while bounded Sales Activity prevents timeline spam.
- [ ] Permission and enforcement matrices cover Role assignment/removal, session refresh, Super Admin, missing underlying permission, every state/mode/operation, direct bypass attempts, audit attribution, idempotency, and recovery paths.

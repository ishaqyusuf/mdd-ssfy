# 07 — Approve or deny applications and activate dealers

**What to build:** Give Super Admin an application queue and idempotent decision
flow. Approval creates or reuses the linked dealer account and password-only
onboarding invite; denial and approval notify the customer, and an explicit
reset can make a prior applicant eligible again.

**Blocked by:** 05 — Run the standard sales-email recruitment funnel end to end.

**Status:** implemented

- [ ] Queue supports pending/approved/denied filters and customer/campaign detail.
- [ ] Only Super Admin can approve, deny, or reset eligibility.
- [ ] Approval transaction creates one dealer account and one live onboarding
      invite even under repeat/concurrent requests.
- [ ] Existing password-only setup activates the approved dealer without asking
      for customer data again.
- [ ] Denial supports an optional customer-facing note.
- [ ] Eligibility reset is audited, rotates invitation state, and permits a new
      application without deleting history.
- [ ] Received/approved/denied notifications and status history are covered.
- [ ] Brain API, database, feature, decision, and progress docs are updated.

# 10 — Notify Admins And Drivers Without Duplicate Alerts

**Source:** [Fulfillment Admin And Responsive Driver Workflow](../../dispatch-admin-responsive-driver-workflow/spec.md)

**What to build:** Deliver each preparation assistance request to the correct
office administrators through in-app notification and email, with durable
deduplication, protected review links, acknowledgement and escalation, and
decision feedback to the assigned driver.

**Blocked by:** 07 — Resolve Production Readiness Assistance Requests; 08 — Resolve Inventory And Inbound Assistance Requests; 09 — Enforce Special Order And Stale-Revision Blockers.

**Status:** ready-for-agent

- [ ] Recipient selection is scoped to the order's office and the capability responsible for the blocker class.
- [ ] One request/revision/channel identity checkpoints delivery and prevents notification or email storms under retry.
- [ ] In-app and email payloads contain bounded order, dispatch, driver, item, quantity, reason, evidence, urgency, and age context.
- [ ] Email and in-app actions deep-link to the same authenticated review surface and never approve without authorization.
- [ ] Acknowledgement, escalation, expiry, denial, resolution, delivery attempts, and actor feedback appear in Activity.
- [ ] The assigned driver receives Waiting for admin, denied/expired feedback, and Ready to resume after server revalidation.
- [ ] Office isolation, permission routing, redaction, deduplication, retry, escalation, deep-link, and notification tests pass.


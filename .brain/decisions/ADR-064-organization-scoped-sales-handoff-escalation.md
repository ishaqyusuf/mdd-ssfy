# ADR-064: Organization-scoped Sales Handoff escalation

**Status:** Accepted
**Date:** 2026-08-23

## Decision

An unresolved Material or Production action owns a persisted organization,
deep-link target, New York business-day due time, and per-recipient escalation
ledger. Organization resolution prefers `SalesOrders.orgId`; legacy rows may
infer only one organization from the responsible representative's active role
assignments. Missing or ambiguous organization scope fails closed and is logged.

The bounded scheduler claims an eligible epoch inside a serializable transaction
before creating one activity-only NotePad notification for every active Super
Admin in that organization. Each epoch/admin ledger identity is unique and
acknowledgement is recorded independently from action resolution. The mandatory
in-app channel is included in notification-center reads regardless of ordinary
preferences and has no email, SMS, push, or WhatsApp delivery handler.

Notifications use the project-designated system notification user ID `1`, held
as a code constant by the scheduler. The worker still verifies that user is
active and has a notification contact before sending; an arbitrary
administrator is never selected as sender.

Representative transfer updates ownership on the same epoch without changing
its open or escalation clock. Resolution cancels unsent escalation. A genuine
reopen creates a new epoch and clock; a policy change timestamps only work newly
exposed by that policy.

First-epoch backdating is explicit rather than inferred from any historical
payment timestamp. A qualifying payment writer may mark the qualification
milestone, and the policy fan-out marks the policy-change milestone. A first
action caused or discovered by later material or production evidence loss opens
at reconciliation time. This prevents a newly missing handoff from inheriting
an older payment or settings clock and escalating immediately.

Escalation activities persist the canonical notification `type` tag as well as
the channel tag, so the notification-center parser can produce the protected
Material or Production deep-link action from the exact stored payload.

## Consequences

- Super Admin reads are organization-wide; ordinary representatives remain
  restricted to their own open epochs.
- Sales Orders can filter/count exact distinct affected orders through the
  required `SalesOrders.handoffActionEpochs` relation and one actor-derived
  open-epoch where fragment.
- Deployment requires the combined schema migration and active notification
  contact data for the designated system notification user ID `1` before
  enabling the schedule; no notification-actor environment variable is used.

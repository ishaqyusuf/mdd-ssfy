# 04 — Escalate Overdue Actions to Super Admins

**What to build:** Give active Super Admins an organization-wide view of unresolved Sales Handoff Actions and one in-app escalation when a representative-owned action remains open for a New York business day, without turning acknowledgement into resolution or generating notification storms.

**Blocked by:** 03 — Surface Production Handoff Actions.

**Status:** completed

- [x] Active Super Admins receive all unresolved Material and Production actions, while non-admin representatives remain restricted to their own orders.
- [x] Results sort by oldest opening time, then order number, with Material before Production for the same order.
- [x] The initial alert remains bounded, and expanded Super-Admin results group actions by responsible representative.
- [x] Super-Admin pill labels and supporting text identify the responsible representative accessibly without exposing unnecessary customer or payment data.
- [x] One business day means the same local time on the next weekday in America/New_York; weekends are skipped and no holiday calendar is introduced.
- [x] Each still-open action epoch produces at most one direct-recipient in-app notification to every active Super Admin.
- [x] Notification identity deduplicates by order, action type, and epoch under retry and concurrent scans.
- [x] Resolving an action cancels unsent escalation, acknowledgement remains separate from resolution, and a genuine later reopening can escalate under its new epoch.
- [x] A responsible-representative transfer changes ownership without resetting the open epoch clock; a policy change starts newly exposed epochs at the policy-change time.
- [x] Notification and alert deep links open the same protected Material or Production workflow and repeat ordinary authorization checks.
- [x] The first release sends no email, push, or WhatsApp escalation.
- [x] Protected scope, grouping, timing, Friday-to-Monday behavior, recipients, deduplication, resolution cancellation, acknowledgement, transfer, reopening, deep-link, and authenticated browser tests pass.

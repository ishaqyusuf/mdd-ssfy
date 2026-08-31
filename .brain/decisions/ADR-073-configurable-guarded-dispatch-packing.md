# ADR-073: Configurable Guarded Dispatch Packing

## Status

Accepted — 2026-08-28. Refines ADR-063.

## Context

ADR-063 allowed packing to preserve a worker's physical quantity report when
upstream production evidence was stale or under review, but it required every
pending report to block loading and delivery. Operations also needs to record
items that are physically present before a production submission exists. The
acceptable risk and review timing vary by organization, so eligibility,
notification, evidence creation, and delivery blocking cannot remain hardcoded.

## Decision

Store one revisioned guarded-packing policy inside the existing organization
Sales settings metadata. Super Admins configure whether guarded packing is
enabled, which upstream conditions are selectable, whether a pending review
blocks delivery, whether the order's sales representative is notified, and
whether approval creates missing production evidence.

Each submitted `SalesPackingReport` snapshots the complete policy in its
evidence payload. Later settings changes never rewrite that immutable audit
evidence or automatically decide a pending report. The current organization
policy is nevertheless the effective delivery gate for every still-pending
report: relaxing from strict approval to nonblocking delivery reconciles fully
verified dispatches to packed readiness while retaining their pending review.
Awaiting-production reports bind the exact dispatch allocation plus
`SalesItemControl.uid`; their production-submission relation is nullable until
approval creates or adopts canonical evidence.

Pending reports always lock further packing edits for their exact scope. In
blocking mode they also prevent load, trip start, readiness, fulfillment, and
completion. In nonblocking mode physical quantity enters the dispatch packing
state immediately and delivery may continue while review remains pending.
Approval or rejection is still auditable, but becomes read-only after the
dispatch reaches a terminal completed, delivered, or cancelled state. An
in-progress dispatch remains reviewable whenever the current effective policy
allows delivery while approval is pending, even if that report's immutable
snapshot recorded the older strict policy.

Notifications target the order's assigned sales representative only when that
person differs from the authenticated actor and the snapshot enables
notification. The existing Sales Overview packing-review route and sheet own
the notification destination and decision UI; no separate approval page is
introduced.

When a Super Admin relaxes an active strict policy to nonblocking delivery, the
system also creates a dedicated in-app notification for each assigned driver
whose pending guarded quantities fully cover the dispatch. The notification
opens that dispatch and explains that packing approval no longer blocks the
trip. Unassigned or only partially verified dispatches are not told they can
continue. Persisting the policy, reconciling dispatch readiness, and creating
these direct in-app notifications share one serializable transaction, so a
failed reconciliation or assigned-driver notification leaves the strict policy
in place and the administrator can retry safely. The interactive transition is
bounded to 100 pending dispatches with an explicit 60-second timeout; larger
sets fail before persistence and require pending reviews to be reduced first.

Packing remains an ordinary, nonblocking selection form. A guarded selection is
not approved item by item: final Pack opens one dispatch-level confirmation, and
the resulting report rows share one batch decision. Ready quantities and guarded
quantities are submitted together, with the normal portion preserved while the
guarded portion is isolated for review.

Assignment, unassignment, and dispatch-date changes are operational lifecycle
events. They are delivered directly to the affected driver's in-app inbox and
remain mandatory notification-center channels; channel subscription preferences
must not silently hide them. Their action reopens the exact dispatch.

## Consequences

- Select All can include permitted awaiting-production and material-review
  quantities on both admin and driver packing surfaces.
- Operations can choose a strict approval hold or a nonblocking audit workflow
  without deploying code.
- Self-actions do not generate redundant notification-center entries.
- Existing report evidence remains deterministic and immutable, while the
  current policy owns the operational delivery gate for pending reports.
- Missing production evidence is created only when the report snapshot allows
  it; otherwise approval confirms packing without fabricating production work.
- The driver stop continues to use ADR-066's canonical intercepted route,
  standalone fallback, shared packing sheet, and suspense skeleton.
- A packed dispatch can start its trip; a nonblocking pending review does not
  disable delivery progression. Terminal dispatches remain immutable.
- Packing summary coverage uses the greater of ready and already-listed
  quantities per quantity dimension, rather than adding overlapping coverage,
  so pending counts cannot become negative.

## Related Records

- `.brain/decisions/ADR-063-guarded-worker-production-reporting-and-separate-packing-review.md`
- `.brain/decisions/ADR-066-intercepted-driver-stop-workspace.md`
- `.brain/features/sales-dispatch-table.md`
- `.brain/database/schema.md`
- `.brain/database/migrations.md`

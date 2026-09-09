# Sales Productions V2

## Purpose
Tracks the promoted sales production board used by admins for production queue oversight.

## Current Behavior
- `/sales-book/productions` is the canonical admin production workspace.
- `/sales-book/productions/v2` is a query-preserving compatibility redirect to
  the canonical route.
- Sidebar and Sales Book navigation link directly to the canonical route.
- The old dedicated v2 board is no longer mounted by either admin route.
- The canonical page uses the Sales Finance workspace system with PageTabs
  ordered Due Today, Calendar, Active, Past Due, Review, and Completed. Calendar
  replaces the former Table/Calendar toolbar control and Active returns to the
  table queue. The calendar matches the Fulfillment workflow with URL-backed
  Week/Month navigation, a centered clickable period picker, inline
  status-colored order cards, overflow popovers, and an Unscheduled section.
  Week selection offers ten periods before and after the current anchor; Month
  selection offers four periods before and after. Same-order/day assignments
  collapse into one card with an assignment count, and every card opens Sales
  Overview on the Production tab.

## Implementation Notes
- The canonical list uses `sales.productions`, bounded production calendar
  scheduled/unscheduled rows, and
  `components/tables-2/sales-production`.
- The old `packages/sales/src/production-v2` read-model contracts remain only
  for unremoved legacy consumers and production-detail/action reference.
- Do not restore the global redirect-engine rule from productions to v2.

## Presentation simplification (2026-09-08)

- Normal and administrative completion use Completed with the same green
  presentation. Calendar cards no longer add a Status only badge; provenance
  remains in canonical evidence and audit records.
- Order-level material attention uses the compact inbound section described below.
  Other material operations remain in Inventory or the standalone review workspace.
- Legacy worker/admin board explanatory introductions are removed. Canonical
  workspace routing, assignment and review permissions are unchanged.

## Production receipt and status behavior (2026-09-08)

The Production tab now shows pending inbound references and suppliers with Open
inbound / Mark as received. This supersedes the embedded review/checklist above.
Completed receipts remain in admin receipt history even when no pending receipts
remain. Other material
operations stay in Inventory or the standalone review workspace. Decision note
is removed from material-review forms; the server generates action/actor audit.

Workers use a default-off Sales setting and a dedicated assigned-material query
and receipt command. Their Inventory tab is restricted to that scope. Receiving
atomically applies physical stock to Needs, validates allocation capacity, records
an audit and persists the refreshed order projection. Both Inventory and pipeline
queries refresh before successful UI feedback. Eligible linked production reviews
now reconcile within that transaction through canonical approval/payroll commands;
unrelated conflicts and changed assignments retain their review workflow.

Item badges show reported quantities and review pending explicitly. Submission
supersedes plain Assigned except a real partial staffing gap. Any submitted or
finalized quantity hides Material Ready; actual blockers remain. Missing commercial
metadata does not erase a known current canonical Production stage.

Validated with domain/API/component tests, real concurrent local transactions,
and an authenticated disposable-order receipt. See the
[task](../tasks/2026-09-08-production-status-and-worker-inbound-receipt.md) for exact
coverage and baseline typecheck limitations. The current cancellation/reconciliation
and primary/secondary presentation implementation is tracked in the
[follow-up task](../tasks/2026-09-08-production-receipt-follow-up-and-cancel-review.md).

### Primary progress and secondary attention (2026-09-08 follow-up)

Calendar cards and table Status cells consume shared Production order presentation.
They show actual submitted/assigned progress and expose material/review blockers
in one separate red alert beside the order identity. Calendar whole-card and table
Status hover/focus expose details; the dedicated alert popover supports tapping
without navigating away. Normal priority badges remain independent. This does
not finalize pending work or change eligibility for packing, payroll or dispatch.
Authenticated local 09495PC shows Production completed, 2 of 2 submitted, and
allocation approval attention while Completed-list membership remains zero.
Receipt cancellation and review reconciliation are still in progress; see the
receipt follow-up task and its decision contract. Full accessibility and action
refresh acceptance remain open.

Calendar tooltip details now include the same canonical reason as a visible
rescheduling padlock, displayed as a lock icon followed by the reason. Each
attention reason has its alert icon alongside the text in calendar and table
details. Worker calendars continue to suppress secondary attention and scheduling
controls. Keyboard details and phone-width lock popovers are verified; remaining
pointer-hover and worker-session acceptance is tracked in the follow-up task.

Admin Production detail now reads saved receipt events independently of pending
inbounds. A completed receipt remains as “Inbound #X marked as received” with
Open inbound, including after reload; older receipts are paginated. Workers do not
receive this admin history. Eligible linked
reviews now reconcile within the receipt transaction, including canonical payroll;
unresolved evidence or changed assignment scope stays pending.

Admin receipt history now offers Cancel review for receipts with complete reversal
evidence. Successful cancellation restores pending receipt/Needs and eligible pending
reviews, reverses physical quantity with an audit movement, and removes receipt-created
pending payroll from active payroll. A later receipt can approve the same submissions
again without duplicates. Workers are denied by the command as well as having no
button. Changed receipt evidence requires Inventory review. Cancelled history remains
visible, and the pending inbound returns. Disposable local receipt/cancel/reload
and Inventory refresh checks pass, together with the real transaction race suite.
Full role and interaction acceptance remains open.

Worker supervisor guidance persists after inbounds disappear when scoped material
shortages or pending reviews remain. Refreshed server evidence clears it after
resolution. Switching orders/inbounds resets panel-local pagination and messages.
Cancellation now validates before-state ownership and quantity relationships and
restores null prices exactly; malformed-audit and downstream-change transaction
tests passed. Full worker browser acceptance remains open.

### Production cancellation feedback — 2026-09-08
Admin cancellation failures remain visible inline in the material section with an
accessible alert and the server's explanation, alongside the unchanged receipt.
A toast alone is insufficient for a refused compensation. Worker UI remains free
of this admin-only cancellation detail. Browser re-verification remains pending.

### Inventory synchronization after Production receipt — 2026-09-08
Synchronizing an unchanged material requirement preserves an existing reserved
allocation's status and notes, just as it preserves approved allocations. It must
not recreate Allocation Approval solely because received stock uses reserved
status. Stock identity/quantity changes retain the existing review path. This does
not automatically repair already-stale reviews when opening Production.

### Calendar padlock details on touch — 2026-09-08
Admin calendar padlocks are actionable buttons opening the same lock explanation
used by whole-card details. Lock-only cards do not gain red alert icons. The
popover fits phone-width viewports; worker views retain no padlock/secondary
controls. Keyboard Escape dismisses the focused popover.

### Worker reported progress — 2026-09-08
Worker item and summary displays count active submitted work, including submissions
awaiting review. Rejected and cancelled submissions are excluded. Reported quantity
is capped per assignment so excess on one assignment cannot fulfill another.
These presentation counters do not authorize approval, payroll or further submissions.

Worker Sales Overview uses the same primary progress in its header. Worker item
badges omit review suffixes and material badges; actionable material information
stays in the compact inbound/supervisor section. Admin details retain review context.

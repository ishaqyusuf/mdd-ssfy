# Production receipt confirmation, cancellation and pending-review reconciliation

## Status
Backlog

## Priority
High — next after the active Production status/worker receipt task, as requested.

## Created Date
2026-09-08

## Last Updated
2026-09-08

## Source Context
User observation on order `09495PC`, Production tab, after successfully marking an
inbound received from the top material section. Inventory Needs show Covered,
but an already completed/reported production item still shows Review pending and
Allocation Approval. User named item `2668-100` and also said “H6”; verify exact
control, component, inbound and review identities before attributing the defect.
No automatic approval, reversal or live repair is authorized by this ticket yet.
The user explicitly asked to preserve the current flow and queue this next.

Related: [current implementation](2026-09-08-production-status-and-worker-inbound-receipt.md).

## Requested behavior
- After a receipt initiated from Production succeeds, retain one compact line:
  “Inbound X marked as received” (or the exact availability action performed).
- Keep Open inbound; replace the completed primary action with Cancel review.
- Cancellation should reverse the specific action performed from Production.
  Trace whether that action was physical stock receipt, status-only Received,
  Needs application, allocation confirmation or a review decision; they require
  different compensating operations and must not be conflated.
- Recheck existing production reviews when linked Needs become covered. If exact
  scope is valid and all material conditions are satisfied, finalize through the
  canonical review command; never fabricate a second submission or approve unrelated
  material/assignment conflicts. Preserve downstream payroll and packing gates.

## Primary progress and secondary attention status — user update

Production order queries must expose two distinct presentation dimensions:

- **Primary status:** the actual order/work progress, shown by default in the
  calendar and table. A review requirement must not replace it with Awaiting review.
- **Secondary attention:** actionable conditions such as review required, missing
  materials, allocation approval or another critical blocker. Keep these available
  without filling the card or row with additional status badges.

Calendar behavior:
- Show a red alert icon beside the order ID when attention is required.
- Hovering anywhere on the order card, not only the icon, shows a tooltip explaining
  the specific issues and what needs attention. Support keyboard focus and touch
  access to the same information.
- Clicking the card retains the normal order-opening flow, where users can see and
  perform the relevant actions. Preserve calendar drag/reschedule behavior.

Table behavior:
- The Status column shows actual primary progress, not Awaiting review as a substitute.
- Hover/focus on the Status cell shows secondary conditions and relevant order context.
- Place the alert icon beside the order ID/customer in the order/customer column
  whenever an actionable secondary condition exists.
- Schedule information remains scheduling information; do not replace it with review
  status. Review the current column layout when implementing the icon placement.

Use one shared primary/attention presentation contract across calendar and table.
Return all relevant actionable reasons in a deterministic priority order. Normal
informational states such as Material Ready should not create a red alert. Do not
confuse the attention icon with the order's independently configured priority.
Keep unknown evidence truthful; this display change must not fabricate completion
or change finalized quantities, filter membership, payroll, packing or dispatch
eligibility. Reported completion awaiting approval still retains its pending review
in secondary information even when the primary work stage is shown separately.

### Acceptance examples for the two-status presentation

| Order evidence | Primary display | Secondary attention |
| --- | --- | --- |
| Assigned, with missing materials | Assigned | Red alert; tooltip explains which materials are missing. |
| All production quantity reported, review pending | Production completed (reported work) | Red alert; tooltip explains the pending review or allocation approval. Finalized completion remains unchanged until canonical approval. |
| Some production quantity reported, review pending | Partial production progress with quantities | Red alert; tooltip includes the outstanding review and any material blockers. |
| Production completed and approved, no blockers | Production completed | No alert icon or redundant Material Ready badge. |

These examples describe Production work progress, not commercial order completion.
Derive the primary label from the current order's actual evidence; do not translate
every Awaiting review value to Completed. Distinguish reported from finalized
quantity in accessible details and the opened order.

- Render a single alert icon per card/row even when several reasons exist. List
  each distinct actionable reason in the tooltip, with the most urgent first.
- The entire calendar card is the tooltip trigger; the icon alone is insufficient.
  In the table, the Status cell is the tooltip trigger and the order/customer cell
  carries the alert icon. Keep the primary label readable without hovering.
- Opening an order must reveal the relevant material/review actions immediately
  within its Production context, without requiring selection from another order list.
- After an action resolves a reason, refresh both primary progress and attention
  from current evidence. Remove only resolved reasons; remove the icon once none
  remain. Verify this across the calendar, table and already-open order.

## Implementation Progress
- Completion: 0%
- Blockers: None; queued behind current task.

## Implementation Checklist
- [ ] Reproduce 09495PC and identify receipt event, inbound, component 2668-100, item control and pending review using read-only evidence.
- [ ] Distinguish stale projections from legitimate pending allocation/review state; compare current Needs coverage, approved allocation, review reason and source revisions.
- [ ] Define a durable compact confirmation based on actual action audit, including navigation/reload and actor scope.
- [ ] Implement guarded, idempotent cancellation of that exact action, preserving unrelated receipts/allocations and refusing reversal after incompatible consumption/packing/downstream evidence.
- [ ] Implement explicit eligible review reconciliation after receipt/application, with whole-review material and assignment validation and canonical payroll finalization exactly once.
- [ ] Verify receipt/cancel/retry/race behavior and complete affected query/projection refresh; test the reported order with fixtures before any authorized live correction.
- [ ] Define and test shared primary progress plus secondary attention fields for Production orders, keeping lifecycle authority and filter membership unchanged.
- [ ] Render calendar primary status and order-ID alert icon with whole-card hover/focus explanation and existing click/drag behavior.
- [ ] Render table primary Status, Status-cell hover/focus details, and the alert icon in the order/customer column; verify no duplicate review badges.
- [ ] Verify no-alert, one/multiple issues, pending review, missing materials, mixed progress, unknown evidence, keyboard and touch layouts across calendar/table/detail.
- [ ] Review, document and commit separately after the current task.

## Validation Evidence
User report only. Not yet independently reproduced. Current receipt intentionally
does not finalize existing production submissions; this ticket changes that
boundary only after defining a truthful explicit action and cancellation semantics.

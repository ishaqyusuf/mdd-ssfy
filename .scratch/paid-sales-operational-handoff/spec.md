# Paid Sales Operational Handoff

Status: implemented

Source: [`map.md`](./map.md), the approved proposed-answer comments on all seven
Wayfinder tickets, and the 2026-08-21 Pablo Cruz discussion summarized in the
map.

## Problem Statement

Payment-qualified Sales Orders can become operationally stranded because the
responsible sales representative forgets either to record the supplier
order/inbound covering required material or to assign production-capable
quantity to a production worker. The omission is currently discovered through
manual follow-up, delayed production, or a downstream blocker rather than at
the Sales surface where the responsible representative works.

GND already maintains separate payment, inventory, production, packing,
dispatch, payroll, and fulfillment truth. Those boundaries must remain
truthful: an alert cannot fabricate a supplier order, an approval cannot simply
flip material to available, and reported production or packing cannot become
finalized work while its evidence remains unresolved.

The current production-only worker rule also rejects certain submissions when
configured material is unavailable, even though the business has confirmed
that physically completed work should be recordable under review. Packing has a
similar problem when physically verified work is blocked by stale upstream
administration. Losing the report hides real work; finalizing it prematurely
would corrupt payroll and fulfillment.

## Solution

Add a global Sales Handoff Trigger to Sales Settings. A Super Admin chooses
whether operational handoff monitoring begins when an order is fully paid,
when any successful payment is received, or when a configured whole-number
payment percentage is reached. Fully paid is the default.

Derive server-owned Material and Production Sales Handoff Actions for active,
payment-qualified orders. A Material Handoff Action means applicable tracked
demand lacks active linked inbound coverage. A Production Handoff Action means
production-capable required quantity lacks active owned assignment or
attributable completed production evidence. Material readiness never determines
whether production has been assigned.

Render a standard shadcn alert immediately before the Sales Orders table with
the title `Paid sales need action`. Its description contains clickable,
button-semantic pills such as `#09388PC — Material` and
`#09388PC — Production`. Sales representatives see only their own orders;
active Super Admins see all unresolved actions and the responsible
representative. Material pills open Sales Overview Inventory Needs with Create
inbound expanded. Production pills open the affected Production assignment
surface. The alert reveals actions six at a time through a repeatable `+N more`
control. A permanent `Needs Action` Sales page tab shows the unique-order count
and filters the existing Sales Orders table to orders with either unresolved
action type.

Persist action epochs so unresolved work can be deduplicated, audited, and
escalated. After one New York business day, notify active Super Admins once
through the in-app notification system. Resolution removes the alert and
cancels pending escalation. A genuine reopening starts a new epoch.

Restore nonblocking production reporting for production-only workers by routing
unresolved submissions through the established production material-review
authority instead of rejecting them. Add a packing-specific pending report for
physically verified quantities blocked by stale upstream evidence. Pending
production or packing remains reported—not finalized—and cannot authorize
payroll, canonical packing, loading, dispatch, fulfillment, or payment review.
Approval must re-read fresh evidence and invoke the appropriate canonical
inventory, production-review, or packing command.

## User Stories

1. As a Super Admin, I want to configure when payment makes operational handoff work actionable, so that the policy matches how the business releases orders.
2. As a Super Admin, I want Fully paid to be the default trigger, so that installing the feature does not unexpectedly release partially paid orders.
3. As a Super Admin, I want to select Any payment received, so that a deposit can begin the handoff workflow when that is business policy.
4. As a Super Admin, I want to select Payment percentage reached, so that handoff can begin at a consistent deposit threshold.
5. As a Super Admin, I want the percentage constrained to 1–100, so that invalid settings cannot create undefined qualification behavior.
6. As a Super Admin, I want a setting change to re-evaluate active orders immediately, so that the Sales page reflects the current policy.
7. As a Super Admin, I want newly exposed historical orders to start escalation at the policy-change time, so that changing settings does not create an instant notification flood.
8. As a sales representative, I want `Paid sales need action` immediately before the Sales Orders table, so that missing handoffs are visible where I work.
9. As a sales representative, I want to see only Sales Handoff Actions for orders assigned to me, so that the alert remains relevant and private.
10. As a sales representative, I want each action to show the order number and action type, so that I can identify the missing handoff at a glance.
11. As a sales representative, I want Material and Production represented as separate pills, so that I can resolve each missing responsibility independently.
12. As a sales representative, I want Material pills to open Inventory Needs with Create inbound expanded, so that I can record a real supplier order without searching for the workflow.
13. As a sales representative, I want Production pills to open the affected Production assignment surface, so that I can assign the missing quantity directly.
14. As a sales representative, I want resolved pills to disappear after the authoritative write succeeds, so that the alert always reflects current work.
15. As a sales representative, I want the alert to remain visible while actions exist, so that required work cannot be permanently dismissed.
16. As a sales representative, I want a retry state when action loading fails, so that a read failure is not mistaken for an empty queue.
17. As a sales representative, I want the pills to wrap without horizontal scrolling on a narrow screen, so that the alert remains usable on a phone.
18. As a keyboard user, I want every pill reachable with visible focus, so that I can open its workflow without a pointer.
19. As a screen-reader user, I want each pill to announce the order, action, and responsible representative when applicable, so that its purpose is unambiguous.
20. As a sales representative serving a customer, I want to continue creating another order even when older handoffs remain unresolved, so that an internal omission does not block a customer-facing sale.
20a. As a sales representative, I want the alert to reveal six actions at a time through a repeatable `+N more` control, so that a large queue does not overwhelm the Sales page.
20b. As a sales representative, I want a permanent `Needs Action` tab with the number of affected sales orders, so that I can switch the existing table to the complete unresolved-order working set.
21. As a Super Admin, I want to see all unresolved Sales Handoff Actions, so that I can oversee the office rather than only my own orders.
22. As a Super Admin, I want to identify the responsible sales representative for each action, so that follow-up has a clear owner.
23. As a Super Admin, I want the oldest unresolved actions presented first, so that delayed handoffs receive attention before recent ones.
24. As a Super Admin, I want the initial alert bounded with `Show N more`, so that a large queue does not overwhelm the Sales page.
25. As a Super Admin, I want expanded actions grouped by representative, so that I can scan accountability across the team.
26. As a Super Admin, I want one in-app escalation after one business day, so that neglected actions reach management without notification storms.
27. As a Super Admin, I want the escalation to open the same protected workflow as the alert, so that I can inspect and resolve the exact action.
28. As a Super Admin, I want acknowledgement recorded separately from resolution, so that reading a notification cannot falsely close operational work.
29. As a Super Admin, I want a resolved action to cancel its pending escalation, so that completed work does not generate stale notifications.
30. As a Super Admin, I want a genuine reopened action to begin a new epoch, so that recurring omissions can be escalated again without duplicating the original event.
31. As an accountant, I want qualification to use successful net receipts in integer cents, so that handoff policy agrees with canonical payment truth.
32. As an accountant, I want completed refunds to reduce qualifying receipts, so that a refunded order does not remain qualified on gross-payment evidence.
33. As an accountant, I want pending, failed, deleted, and reversed payments excluded, so that unverified provider activity cannot release operations.
34. As an accountant, I want applied wallet funds counted only through completed order receipt evidence, so that wallet liability and order payment remain distinct.
35. As an operator, I want zero-total and COD orders excluded from payment qualification, so that they do not silently acquire invented payment milestones.
36. As an inventory operator, I want a Material Handoff Action only for positive applicable tracked demand lacking coverage, so that non-stock and not-applicable rows do not create noise.
37. As an inventory operator, I want partial inbound coverage to leave the uncovered quantity actionable, so that partially ordered material is not treated as complete.
38. As an inventory operator, I want an active linked inbound to resolve the Material action even before receipt, so that the pill means purchasing is missing rather than material is still traveling.
39. As an inventory operator, I want prompt-only `ORDERED` status to remain insufficient, so that an unrepresented supplier order cannot disappear from attention.
40. As an inventory operator, I want terminal, cancelled, deleted, and unrelated inbounds excluded from coverage, so that stale records cannot hide missing purchasing work.
41. As an inventory operator, I want a linked supplier-less legacy inbound to remain valid coverage, so that compatible historical records do not create false actions.
42. As a production manager, I want production-capable required quantity evaluated at quantity grain, so that partial assignment remains visible.
43. As a production manager, I want active unowned assignments to remain actionable, so that work is not considered handed off until someone owns it.
44. As a production manager, I want multiple worker assignments aggregated without double counting, so that split work is measured correctly.
45. As a production manager, I want completed attributable work to continue satisfying its quantity, so that closed assignments do not reopen false actions.
46. As a production manager, I want order revisions to open actions only for new or changed uncovered quantity, so that unchanged completed work remains valid.
47. As a production manager, I want material readiness excluded from the Production Handoff Action, so that production planning can occur before material arrival.
48. As a production-only worker, I want to report physically completed work against my own assignment when material administration is unresolved, so that real work is not lost.
49. As a production-only worker, I want unresolved quantity clearly marked pending review, so that I do not mistake reported work for finalized production.
50. As a production administrator, I want repeated submissions with the same identity to return the existing review, so that retries cannot duplicate quantity.
51. As a production administrator, I want pending quantity excluded from payroll and downstream completion, so that review does not corrupt operational or financial truth.
52. As a production administrator, I want fresh evidence rechecked before approval, so that stale snapshots cannot authorize finalization.
53. As a production administrator, I want rejection to release pending reported quantity without changing inventory, so that incorrect reports can be corrected safely.
54. As a packing actor, I want to report physically verified packed quantity when stale upstream administration blocks packing, so that warehouse work is not discarded.
55. As a packing actor, I want a genuine physical shortage routed to the shortage/exception workflow, so that missing items cannot be falsely reported packed.
56. As a dispatch operator, I want pending packing reports excluded from loading and dispatch readiness, so that unreviewed evidence cannot put a truck on the road.
57. As an approving administrator, I want production and packing reviews to retain their own domain commands, so that one generic override cannot bypass unrelated safeguards.
58. As an auditor, I want every action epoch, escalation, report, recheck, approval, and rejection attributable to its actor and evidence revision, so that the operational history is reproducible.
59. As a security owner, I want server-derived representative scope and session-bound worker identity, so that callers cannot request another person's actions or submit another worker's quantity.
60. As a security owner, I want deep links to repeat ordinary authorization checks, so that knowing a URL grants no operational capability.
61. As a support operator, I want missed mutation events recoverable through bounded reconciliation, so that the alert and escalation state can repair itself without manual database edits.
62. As a system owner, I want Sales Orders list performance isolated from action evaluation, so that the required alert does not make the primary table slower.

## Implementation Decisions

- Add one global Sales Handoff Trigger under a new Sales Settings Operations
  section. The setting has a mode of Fully paid, Any payment received, or
  Payment percentage reached; percentage mode requires a whole number from
  1–100. Fully paid is the default. Only active Super Admins may read the
  administrative detail and mutate the setting.
- Centralize qualification in one pure Sales-domain projection over canonical
  cents-based settlement facts. Fully paid requires a positive invoice total
  and net amount due at or below zero. Any payment requires successful net
  receipts above zero. Percentage mode compares integer cents without floating
  point arithmetic. Completed refunds reduce net receipts; pending, failed,
  deleted, and reversed activity is excluded.
- Applied Wallet Credit counts only when represented by completed order receipt
  evidence. Zero-total and COD orders are excluded until a separate
  operational-release policy is specified. Quotes, cancelled orders, and other
  terminal non-operational records are excluded.
- Changing the global setting re-evaluates active orders immediately. Actions
  newly exposed by the policy change use the policy-change time as their epoch
  start, preventing retroactive escalation floods.
- Centralize Material and Production detection in one pure Sales Handoff Action
  projection. It consumes payment qualification, inventory-demand coverage,
  production quantity/assignment facts, order lifecycle, and actor scope; it
  returns typed Material and Production actions plus explicit unavailable
  evidence where a source projection cannot be trusted.
- A Material Handoff Action exists for positive applicable tracked demand whose
  outstanding quantity is neither fulfilled nor covered by an active linked
  inbound. Active pending, ordered/in-progress, and partially received
  shipments cover only their linked outstanding quantities. Partial coverage
  leaves the remaining quantity actionable.
- Prompt-only `ORDERED` order status is not inbound coverage. Terminal,
  cancelled, deleted, or unrelated inbounds do not count. A canonical active
  supplier-less legacy inbound counts only when it is linked through inventory
  demand ownership. Non-stock, untracked, not-applicable, zero-required,
  cancelled, and fulfilled demand is excluded.
- A Production Handoff Action exists when production-capable required quantity
  is not covered by active owned assignments or attributable completed
  production evidence. Aggregate multiple workers without double counting;
  partial and active unowned quantity remains actionable. Cancelled, deleted,
  superseded, and stale-revision assignments are excluded.
- Completed owned assignment or finalized submission evidence continues to
  cover its attributable quantity. An order revision opens a new action only
  for new or changed uncovered quantity. Material readiness is never an input
  to the Production Handoff Action.
- Persist durable Sales Handoff Action epochs rather than treating the alert as
  ephemeral UI state. Each epoch records order, action type, responsible
  representative, policy revision, opening time, resolution time, escalation
  time, current lifecycle state, and the evidence/revision needed for
  deduplication and audit. One order may have independent Material and
  Production epochs.
- The epoch service reconciles current projection truth after every relevant
  payment, refund, setting, demand, inbound, assignment, order-revision,
  cancellation, production-review, and packing-review mutation. A bounded
  recurring reconciliation repairs missed events and closes or reopens epochs
  idempotently.
- Expose a dedicated protected, bounded Sales Handoff Action read instead of
  extending the Sales Orders table row query. A sales representative's scope is
  injected from the authenticated session and returns only orders currently
  assigned to them. Active Super Admins receive all unresolved actions. Other
  callers receive no broader scope from request input.
- The read returns stable action identity, order identity and number, action
  type, current responsible representative, qualification time, opening time,
  canonical deep-link intent, total count, and per-type counts. Sort oldest
  action first, then order number, with Material before Production. Return at
  most 50 actions; the UI initially shows six and each `+N more` activation
  reveals the next six until the bounded response is exhausted.
- Add a permanent `Needs Action` Sales page tab beside the existing fixed/saved
  tabs. Its badge counts unique Sales Orders with at least one unresolved
  Material or Production epoch in the authenticated actor's ordinary scope.
  Selecting it filters the existing table and count/pagination contract to that
  unresolved-order set; it is not editable or removable as a saved tab.
- Render one standard shadcn Alert immediately before the Sales Orders table.
  Use title `Paid sales need action`. The description owns wrapping,
  button-semantic pills. Material uses a restrained amber treatment and
  Production a restrained blue treatment. The alert has no permanent dismiss
  control.
- Sales-representative presentation is a flat oldest-first list. Super-Admin
  presentation includes representative identity in accessible labels and
  tooltips; expanded results group by representative. Narrow layouts wrap
  without horizontal scrolling. Loading reserves compact space; failure shows
  `Unable to load paid sales actions` with Retry.
- Material deep links use the canonical Sales Overview URL/query-state builder
  to open Inventory Needs with Create inbound expanded. Production deep links
  open Production at the affected item/assignment surface. Closing Sales
  Overview returns focus to the opening pill. Every destination rechecks normal
  permissions.
- Query invalidation uses the central mutation-event registry for the same
  events that reconcile action epochs. Resolving the last returned action
  removes the alert without a full page reload.
- Measure one business day as the same local time on the next weekday in
  America/New_York. Weekends are skipped; a holiday calendar is not introduced.
  A policy change starts newly exposed epochs at the policy-change time. A
  responsible-representative transfer changes ownership but preserves the
  ongoing epoch clock.
- Escalate each open epoch once through a new direct-recipient in-app
  notification to all active Super Admins. Deduplicate by order, action type,
  and epoch. Resolution cancels unsent escalation; a later genuine reopening
  creates a new epoch. Acknowledgement is recorded but never resolves the
  action. Email and push are excluded.
- Supersede ADR-062's production-only hard rejection. Production-only workers
  may submit positive remaining quantity only against their authenticated active
  assignment. The existing production submission material-review service owns
  evidence snapshots, idempotency, duplicate prevention, pending/finalized
  quantity separation, recheck, approval, and rejection.
- Pending production quantity counts as reported for progress and duplicate
  prevention but remains excluded from finalized production, payroll, packing,
  dispatch, fulfillment, and completion-dependent payment review. Ready
  evidence may auto-approve through the existing review policy; unresolved or
  unavailable evidence creates pending review.
- Add packing-specific reported-quantity and review persistence rather than
  storing packing facts in production rows or immediately changing canonical
  packed quantity. Bind the report to authenticated packing actor, dispatch
  allocation/item, exact quantity, manifest/evidence revision, and idempotency
  identity.
- A packing actor may create a pending report only for physically verified
  quantity blocked by stale or unresolved upstream evidence. A genuine physical
  shortage uses the existing Dispatch Exception/shortage path. Pending packing
  never authorizes canonical Packed Quantity, loading, trip start, dispatch, or
  fulfillment.
- Production and packing share review-envelope invariants but retain separate
  commands and downstream effects. Approval re-reads current evidence and uses
  canonical inbound receipt, manual inventory fulfillment, production review,
  or packing authority. Rejection voids pending reported quantity without
  changing inventory. Relevant scope revisions make a review stale and require
  re-evaluation; time alone does not approve or expire it.
- Preserve existing capability boundaries. Action reads do not grant order,
  inbound, production, packing, or dispatch mutation rights. Production review
  continues to require production authority; inventory resolution requires its
  existing order/inbound capabilities; packing review requires assignment- or
  role-scoped packing authority. Session identity replaces caller-supplied
  representative and worker scope.
- Add an ADR during implementation that explicitly supersedes ADR-062 and
  records the accepted production-only nonblocking rule plus the distinct
  packing pending-report boundary. ADR-035, ADR-039, and ADR-048 remain
  authoritative except where the new ADR expressly narrows or extends them.
- Database work is additive: durable Sales Handoff Action epochs and
  packing-specific pending reports/reviews require migrations, unique
  idempotency constraints, revision evidence, actor attribution, lifecycle
  timestamps, and indexes supporting representative, action state, opening
  time, and escalation scans. No existing payment, inventory, production,
  packing, or Sales Order truth is replaced.

## Testing Decisions

- Prefer one highest-level pure Sales Handoff Action projection seam for the
  largest behavior matrix. Tests pass canonical payment, inventory, production,
  lifecycle, policy, and actor facts and assert only returned action types,
  quantities, ownership, qualification, and unavailable states. They must not
  assert query construction or helper call order.
- At the projection seam, cover all three trigger modes, percentage bounds and
  cents rounding, grouped receipts, completed refunds, Wallet Credit
  application, pending/failed/deleted/reversed activity, zero-total/COD
  exclusion, cancellation, policy changes, and representative transfer.
- At the same seam, cover full, partial, terminal, supplier-less legacy, and
  prompt-only inbound evidence; non-stock and unavailable inventory
  projections; partial/multi-worker/unowned/superseded/completed assignments;
  order revisions; and the explicit independence between Production actions
  and material readiness.
- Use the existing order-payment projection and refund-domain tests as prior art
  for canonical settlement fixtures. Use existing Sales inventory
  applicability, inbound compatibility, and production assignment tests as
  prior art for operational evidence fixtures.
- Add persistence/service tests around the externally visible action-epoch
  lifecycle: open, idempotent reconcile, resolve, policy-change open,
  representative transfer, genuine reopen, bounded repair, and concurrent
  reconciliation. Assert durable outcomes and unique identities rather than
  transaction implementation details.
- Add protected API contract tests proving sales-representative session scope,
  active Super-Admin all-order scope, ignored forged representative input,
  bounded ordering/counts, unavailable behavior, and permission-safe payloads.
  Existing Sales payment-query scope and production permission-boundary tests
  are the prior art.
- Test Sales Settings through its protected read/write boundary: Super-Admin
  success, non-admin rejection, default policy, percentage validation,
  unrelated metadata preservation, policy revision, and immediate action
  reconciliation. Existing Sales settings partial-update tests are the prior
  art.
- Extend existing production submission material-review policy, service,
  submission, decision, and permission tests. Replace the worker-hard-block
  expectation with pending-review behavior while retaining authenticated
  assignment scope, positive remaining quantity, idempotency, evidence
  snapshot, downstream exclusion, fresh recheck, canonical approval, and safe
  rejection.
- Test packing pending reports at the packing command boundary. Cover physical
  verified quantity, genuine-shortage rejection/routing, allocation and actor
  scope, over-report prevention, idempotent retry, stale manifest revision,
  downstream hold, canonical approval, rejection, and concurrent packing
  changes. Existing pack-dispatch idempotency and pending-production-review
  tests are the prior art.
- Test in-app escalation at the notification service boundary: next-weekday New
  York timing, Friday-to-Monday behavior, policy-change epoch start,
  deduplication, resolution cancellation, acknowledgement, representative
  transfer, reopening, active-Super-Admin recipients, deep link, and absence of
  email work.
- Test the alert as an integration contract rather than snapshotting markup.
  Verify title, semantic buttons, representative versus Super-Admin content,
  six-item incremental reveal behavior, keyboard labels, loading, retry, narrow
  wrapping, invalidation-driven removal, and focus restoration. Verify the
  permanent `Needs Action` tab's unique-order count, non-removability, actor
  scope, URL state, table filtering, pagination, and live invalidation. Existing
  Sales Orders component contracts and canonical Sales Overview URL-builder
  tests are the prior art.
- Authenticated browser acceptance must cover a sales representative with both
  action types, a Super Admin with multiple representatives and overflow, every
  settings mode, Material and Production deep links, live removal after a
  successful handoff, retry behavior, one narrow viewport, keyboard navigation,
  and zero unexpected console errors.
- Authenticated operational acceptance must also prove a production-only worker
  creates pending review instead of being blocked, pending quantity does not
  reach payroll or packing, an authorized administrator resolves evidence and
  approves it, a packing actor records pending physically verified quantity,
  and dispatch remains blocked until canonical approval.
- Run focused package, API, Dashboard, notification, permission, migration, and
  browser checks first. Because the feature crosses payment, inventory,
  production, packing, and notification authority, final validation also
  requires the broad project typecheck and the narrowest relevant production
  builds/tests defined by repository commands.

## Out of Scope

- Automatically creating an inbound before a real supplier order exists.
- Calling suppliers, placing purchase orders, or replacing external procurement
  decisions.
- Automatically assigning production workers or designing assignment rules by
  product, department, location, capacity, or due date.
- Blocking a sales representative from creating a new customer order because
  older Sales Handoff Actions remain unresolved.
- Treating prompt-only `ORDERED` status as canonical inbound coverage.
- Treating alerts, notifications, acknowledgement, deep links, or review
  records as permission to fabricate inventory, production, packing, payroll,
  dispatch, payment-review, or fulfillment evidence.
- Email or push escalation in the first release.
- Holiday-calendar support beyond weekday New York business-day calculation.
- Per-product, per-location, per-customer, per-representative, or Sales Profile
  trigger overrides.
- Operational SLA dashboards and analytics beyond the alert, counts, durable
  epoch history, and one-business-day escalation.
- Zero-total and COD operational-release policy.
- Unrelated payment-date visibility, a general Sales Orders table redesign, a
  general notification-center redesign, or broad production/inventory cutover
  work.

## Further Notes

- Domain vocabulary is defined in the project glossary: Sales Handoff Trigger,
  Sales Handoff Action, Material Handoff Action, and Production Handoff Action.
- The alert text intentionally says `Paid sales need action`, while canonical
  policy may qualify an order after any payment or a configured percentage.
  The domain term remains Sales Handoff Action to avoid equating qualification
  with fully paid status.
- The inbound itself remains the representation of a real supplier commitment.
  Material receipt and availability remain separate later lifecycle facts.
- Packing means physical verification for a Dispatch. A pending packing report
  is evidence awaiting review, not Packed Quantity.
- The visible prototype remains a specification acceptance artifact. Its
  12-pill threshold and semantic colors may be adjusted through representative
  and Super-Admin review without changing the server contract or domain policy.
- Implementation must perform the required Brain documentation impact check:
  update Sales settings/API contracts, permissions, database schema and
  migrations, the paid-sales handoff feature record, production/packing feature
  behavior, task ledgers, progress, and the ADR superseding ADR-062.

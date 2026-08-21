# Fulfillment Admin And Responsive Driver Workflow

Status: ready-for-agent

Source: [`map.md`](./map.md) and its eleven approved proposed-answer comments.
This specification continues the Driver Platform Revival and preserves the
accepted dispatch, packing, inventory, proof, and exception authorities until
the responsive-web cutover gate is explicitly approved.

## Problem Statement

Fulfillment currently presents dispatch records where office administrators
need to understand whole Sales Orders. A single order may have multiple
dispatches, which can duplicate rows, split assignment information, and expose
a trip status that does not explain whether production, packing, delivery, or
the whole order is complete. Progress competes with Status, Queue is confused
with assignment, and clicking a row opens Packing directly instead of giving an
administrator the order-level dispatch history and available actions.

Drivers also need a simpler operational journey. They should see only their
assigned work, understand what must be delivered today, verify and pack the
current load, report an unavailable item without making a phone call, resume as
soon as an authorized administrator resolves the blocker, execute the trip,
capture proof, and complete delivery safely under weak network conditions.

The system already has important authorities that cannot be duplicated or
bypassed: `OrderDelivery` is the canonical trip header, Packing List and
dispatch-bound inventory commands own packing, durable Dispatch Exceptions own
operational problems, and proof completion owns retry-safe finalization and
inventory consumption. The redesigned admin and responsive driver experiences
must compose these authorities into one understandable workflow while
preserving Expo and compatibility routes until parity and rollout evidence
support a deliberate cutover.

## Solution

Make Fulfillment an order-grain operating view that uses the same canonical
Sales Order lifecycle as the Sales Orders page. Each order receives one Status
derived from aggregate production, packing, dispatch, proof, and remaining-
quantity evidence. Assignment remains in Assigned To, and blockers such as
Packing blocked, Approval requested, Back order, Overdue, Failed, or Returned
appear as exception overlays rather than competing statuses. Remove the list-
level Progress column.

Open a Fulfillment row in Sales Overview on its Dispatch tab. The tab summarizes
ordered, allocated, packed, delivered, and remaining quantities; lists every
dispatch chronologically; permits creation of an eligible remaining dispatch;
and opens individual dispatch detail for Overview, Items & Packing, Route,
Proof, and Activity. Packing is an explicit dispatch action instead of the
default row destination.

Build a phone-first responsive driver experience with Today, Assigned, Active
delivery, and Completed destinations. Drivers receive one prominent next
action per card and move through load review, packing, blocker reporting, load
confirmation, trip start, arrival, proof, and completion. The web presentation
reuses the existing server-owned manifest, packing, inventory, exception, and
proof commands; it does not create another execution model.

Extend the existing Dispatch Exception authority to represent item/allocation-
specific preparation blockers and revision-bound assistance requests. Notify
the correct office-scoped administrators in-app and by deduplicated email. The
protected admin review resolves the actual production, inbound, inventory,
Special Order, or dispatch problem. When fresh server validation confirms
readiness, the driver receives a Ready to resume update. Genuine physical
shortage is never overridden: it reduces the current dispatch, preserves the
commercial order, and creates or retains remaining fulfillment demand.

Reuse the resumable dispatch-proof completion contract for the website. A
client success screen never marks work delivered or fulfilled. Delivered means
the server accepted valid proof for one dispatch; Fulfilled means canonical
inventory effects completed and the aggregate order has no remaining
fulfillment demand.

Treat responsive web as the intended long-term canonical driver surface, but
keep Expo canonical during implementation and pilot. Validate the connected
admin/driver experience with a realistic prototype, release through bounded
office/driver cohorts, measure parity and reliability, and require a new ADR
before changing canonical ownership or retiring any existing surface.

## User Stories

1. As an office administrator, I want one Fulfillment row per Sales Order, so that multiple dispatches do not make the same order look like separate demand.
2. As an office administrator, I want Fulfillment to show the same lifecycle language as Sales Orders, so that Status has one meaning across both pages.
3. As an office administrator, I want production completion shown as Ready to fulfill, so that the status communicates the next operational step.
4. As an office administrator, I want assignment shown separately from Status, so that a driver assignment does not replace the order lifecycle.
5. As an office administrator, I want Needs assignment and Assigned to be truthful operational cohorts, so that Queue is not used for two meanings.
6. As an office administrator, I want a multiple-dispatch order to show an aggregate assignment summary, so that the list does not imply one driver owns every trip.
7. As an office administrator, I want Progress removed from the primary table, so that Status and exceptions remain the dominant operational signals.
8. As an office administrator, I want Packing blocked, Approval requested, Back order, Overdue, Failed, and Returned displayed as badges, so that exceptional conditions do not corrupt lifecycle status.
9. As an office administrator, I want Back order used only after a partial dispatch is committed with quantity remaining, so that an ordinary packing delay is not mislabeled.
10. As an office administrator, I want Calendar to remain a focused calendar view without list-only analytics and actions, so that each tab owns relevant controls.
11. As an office administrator, I want clicking an order to open its Dispatch tab, so that I first see the order-level delivery story rather than a packing document.
12. As an office administrator, I want the Dispatch tab to summarize ordered, allocated, packed, delivered, and remaining quantities, so that I can understand fulfillment without a separate progress column.
13. As an office administrator, I want to see every dispatch for the order chronologically, so that split and repeated deliveries remain understandable.
14. As an office administrator, I want Create dispatch offered only for eligible remaining quantity, so that active allocations cannot be duplicated.
15. As an office administrator, I want to click a dispatch and see Overview, Items & Packing, Route, Proof, and Activity, so that trip-level information stays organized.
16. As an office administrator, I want Packing to be an explicit dispatch action, so that reviewing an order does not accidentally enter an execution workflow.
17. As an office administrator, I want lifecycle-appropriate next actions, so that awaiting production, ready work, active packing, in-transit work, and completed work do not share unsafe generic status controls.
18. As a dispatcher, I want to assign or reassign eligible work with an audit trail, so that driver ownership is attributable.
19. As a dispatcher, I want a driver change after packing begins to require handoff and quantity revalidation, so that loaded material is not silently transferred.
20. As a driver, I want to authenticate with my normal employee account, so that the responsive workflow uses my real roles and permissions.
21. As a driver, I want to see only dispatches assigned to me, so that another driver's customer and operational information is not exposed.
22. As a driver, I want Today as my default dashboard, so that my immediate work is clear when I open the site.
23. As a driver, I want separate Assigned, Active delivery, and Completed destinations, so that unfinished warehouse work, current trips, and history do not compete.
24. As a driver, I want work ranked by overdue state, schedule, packing readiness, and route start, so that the next task is obvious.
25. As a driver, I want every work card to show the order, customer, destination, due window, item count, readiness, and one primary action, so that I can act without opening unnecessary screens.
26. As a driver, I want a phone-first interface with large touch targets and no horizontal table scrolling, so that warehouse and field work is practical on a phone.
27. As a driver, I want the same workflow to adapt to tablet and desktop, so that a larger screen improves layout without exposing admin controls.
28. As a driver, I want to review customer-meaningful items before packing, so that the physical load matches the order presentation I understand.
29. As a driver, I want each item to show ordered, previously delivered, allocated now, packed now, short, and remaining quantities, so that partial fulfillment is explicit.
30. As a driver, I want my entries persisted against the current dispatch allocation, so that one trip cannot consume another trip's stock.
31. As a driver, I want to record zero packed only with a blocker reason, so that an empty load cannot appear successfully verified.
32. As a driver, I want to reduce the current dispatch quantity without changing the commercial Sales Order, so that a shortage does not erase customer demand.
33. As a driver, I want to report an unavailable item from the packing screen, so that I do not need to telephone the office.
34. As a driver, I want the blocker form prefilled with dispatch and item context, so that I enter only blocker type, available quantity, note, and optional photo.
35. As a driver, I want to see Waiting for admin after submitting a blocker, so that I know the request was recorded.
36. As a driver, I want to continue other assigned work while one order is blocked, so that waiting does not stop my entire day.
37. As a driver, I want a Ready to resume alert after server revalidation, so that I can restart immediately when the problem is actually resolved.
38. As an administrator, I want blocker requests routed to people with the responsible production, inbound, inventory, Special Order, or dispatch capability, so that the correct owner can act.
39. As an administrator, I want one in-app alert and one deduplicated email for a blocker revision, so that urgency does not create notification storms.
40. As an administrator, I want the alert and email to open the same authenticated review surface, so that email never becomes an approval capability.
41. As an administrator, I want the request to include order, dispatch, driver, item, quantities, reason, evidence, revision, and age, so that I can decide without a phone call.
42. As an administrator, I want missing production assignment resolved through production assignment, so that approval does not fabricate work.
43. As an administrator, I want completed-but-unsubmitted production resolved through canonical production review/submission, so that packing follows production evidence.
44. As an administrator, I want pending material review resolved before packing, so that reviewed production controls remain effective.
45. As an administrator, I want open inbound work resolved through canonical receive or reconciliation commands, so that unavailable stock is not invented.
46. As an administrator, I want missing inventory configuration corrected by authorized inventory staff, so that configuration gaps cannot masquerade as availability.
47. As an administrator, I want genuine physical shortages handled through partial dispatch, back order, or rescheduling, so that no approval can create physical material.
48. As an administrator, I want Special Order blockers to use their existing permissioned revision-bound override, so that dispatch does not bypass customer approval policy.
49. As an administrator, I want stale manifests refreshed and revalidated rather than approved, so that work never executes against obsolete order state.
50. As an auditor, I want each assistance request and resolution to record request identity, revision, actor, capability, evidence, reason, decision, time, and resulting command, so that every exception is attributable.
51. As a system operator, I want duplicate assistance submissions to return the existing request, so that weak networks cannot create duplicate work or email.
52. As a driver, I want Start trip disabled until the current dispatch is ready to load, so that the truck does not leave on stale or incomplete evidence.
53. As a driver, I want to mark arrival and capture recipient, completion type, signature, photos, notes, and failed-delivery reasons, so that delivery evidence is complete.
54. As a driver, I want weak-network proof failures to preserve my form and request identity, so that retry does not duplicate documents or completion.
55. As a driver, I want the completion screen to close only after server confirmation, so that local optimism cannot misrepresent a failed delivery.
56. As a fulfillment manager, I want Delivered to describe accepted proof for one dispatch and Fulfilled to describe the completed whole order, so that partial delivery is not mistaken for final fulfillment.
57. As a fulfillment manager, I want final completion to consume only picked allocations bound to the current dispatch, so that inventory remains reconcilable.
58. As a fulfillment manager, I want cancellations of picked work to require physical-return confirmation, so that loaded stock is not silently returned to availability.
59. As a product owner, I want a connected admin/driver prototype covering success, denial, shortage, partial, stale, retry, reassignment, and back-order states, so that terminology and next actions are validated before production UI is locked.
60. As a product owner, I want responsive web released to a small office and driver cohort first, so that reliability is proven without an irreversible cutover.
61. As a product owner, I want Expo and compatibility routes retained during the pilot, so that operators can fall back without rewriting completed operational history.
62. As a product owner, I want telemetry for loading, packing, blocker response, proof retry, completion, fallback usage, and reconciliation, so that cutover decisions use evidence.
63. As an architecture owner, I want a new ADR before responsive web becomes canonical or an old surface is removed, so that ADR-054 is changed deliberately.
64. As an operator, I want rollback to switch the active interface or cohort without reversing completed dispatch, proof, inventory, or audit records, so that recovery preserves operational truth.

## Implementation Decisions

- Preserve `OrderDelivery` as the canonical trip header and preserve existing
  shipment compatibility records until a later explicit architecture decision.
- Preserve dispatch-bound Stock Allocation as inventory execution authority.
  Exact quantities remain bound to one dispatch through reserve, pick, consume,
  release, and physical-return rules.
- Preserve Packing List and the existing packing/inventory commands as packing
  authority. The responsive driver experience is a new presentation over those
  commands, not another packing implementation.
- Preserve the existing resumable proof-completion command as the only web and
  Expo finalization authority. The responsive client does not orchestrate
  independent document upload, inventory consumption, and status writes.
- Build one order-level Fulfillment projection that aggregates production,
  dispatches, packing quantities, accepted proof, inventory effects, remaining
  demand, assignments, and open exceptions. Both Sales Orders and Fulfillment
  consume the same canonical lifecycle vocabulary.
- The canonical order lifecycle remains Awaiting production, Production queued,
  In production, Ready to fulfill, Fulfillment queued, Packing, Packed, In
  transit, Fulfilled, and Cancelled. Unknown remains a defensive compatibility
  result, not an ordinary operational destination.
- Terminal or advanced evidence takes precedence over earlier production
  evidence, but one completed partial dispatch cannot mark the whole order
  Fulfilled while commercial quantity remains.
- Assignment, arrival, approval state, packing blockers, back orders, overdue
  work, failed delivery, return, and rescheduling are projections, events, or
  exception overlays. They do not replace the order lifecycle.
- A Back order overlay exists only after a dispatch is committed with remaining
  commercial quantity. Before commitment, unavailable work is Packing blocked
  or Missing items.
- Change the canonical Fulfillment list grain from dispatch to Sales Order or
  fulfillment demand. Default columns are Date, Order, Ship To, Assigned To,
  Status, Exceptions, and Actions. Progress is removed.
- Needs assignment counts eligible demand with no active assignee. Assigned
  counts active demand with an assigned driver. The product does not relabel an
  unrelated Queue count as Assigned.
- Multiple active dispatches display aggregate assignment copy instead of
  choosing an arbitrary driver.
- Keep Pending, All, Completed, and Calendar as primary PageTabs. List-only
  summaries, alerts, search, columns, refresh, and bulk actions remain absent
  from Calendar. Operational summary cards may activate focused list filters.
- Fulfillment row selection opens Sales Overview on Dispatch without choosing a
  dispatch or opening Packing. URL state remains the source of the selected
  order, tab, dispatch, and nested detail state.
- The Dispatch tab owns an order fulfillment summary and chronological dispatch
  list. Create dispatch is available only when eligible unallocated quantity
  remains and no conflicting active allocation prevents creation.
- Dispatch detail owns Overview, Items & Packing, Route, Proof, and Activity.
  Open packing workspace is a permissioned contextual action.
- Remove unrestricted lifecycle/status rewriting from the redesigned admin and
  driver paths. Each next action calls its guarded assignment, production,
  packing, scheduling, exception, trip, proof, fulfillment, or cancellation
  command.
- The responsive driver website is the intended long-term canonical surface,
  but Expo remains canonical until the pilot and ADR gate completes.
- Responsive web uses ordinary employee authentication. Every manifest read and
  mutation resolves the authenticated user server-side and enforces assigned-
  driver or explicit manager/warehouse authority.
- Support the current and previous major Android Chrome and iOS Safari versions.
  Provide installable PWA metadata without making installation mandatory.
- Driver navigation is Today, Assigned, Active delivery, and Completed. Today
  consumes the server-ranked manifest and presents one primary next action for
  each work item.
- Driver cards and detail screens are phone-first, use at least 44px interactive
  targets, avoid horizontal table interaction, and adapt to wider viewports
  without exposing admin-only actions.
- Show customer-meaningful order rows while retaining an exact mapping to the
  current dispatch allocation lines. Quantity projection includes ordered,
  previously delivered, allocated now, packed now, short, and remaining.
- Zero packed requires a blocker reason. Partial packing changes only the
  current dispatch allocation/packing evidence and preserves the Sales Order.
- Extend the existing Dispatch Exception authority for preparation blockers and
  assistance instead of creating a parallel blocker aggregate. Add item or
  allocation identity, blocker class, manifest/evidence revision, available and
  short quantities, optional document evidence, request expiry, acknowledgement,
  decision type, and resolution-command evidence through additive compatible
  fields or structured metadata as appropriate.
- Assistance request identity is idempotent and revision-bound. A changed
  dispatch, allocation, order, evidence, or assignment revision invalidates an
  approval and requires revalidation.
- Every blocker may request help, but only an allow-listed blocker class may use
  a policy-approved override. Genuine physical shortage and stale revision are
  never overrideable.
- Production assignment, production submission/review, material review,
  inbound receiving/reconciliation, inventory configuration, Special Order
  approval, reschedule, cancellation, and physical return remain owned by their
  existing commands and domain capabilities.
- The admin review surface chooses or invokes the canonical remediation command;
  resolving an exception alone cannot manufacture readiness. Driver Ready to
  resume appears only after a fresh server readiness projection passes.
- Notification creation is checkpointed against the durable assistance request.
  Use one deduplication identity per request/revision/channel and durable
  delivery-attempt evidence so retries cannot send storms.
- In-app and email recipients are limited to the order's office and employees
  with the capability responsible for the blocker. Payloads include bounded
  order, dispatch, driver, item, quantity, reason, evidence, urgency, and deep-
  link context without exposing unauthorized detail.
- Email links to the authenticated admin review surface and never embeds an
  unauthenticated approval action. Acknowledgement, escalation, decision,
  expiry, denial, and driver feedback are recorded in Activity.
- Web proof retains one request ID for the active form. Server-staged documents
  remain authoritative; a user- and dispatch-scoped browser draft supports
  recovery and is purged on success, logout, reassignment, or expiry.
- Proof retains the existing signature and attachment validation and limits,
  including no more than five accepted photos. Location, when captured, is
  purpose-limited evidence and never authorization.
- A byte-equivalent completion retry resumes or replays the same request. The
  same request identity with different proof conflicts. The client remains in
  retry state until the server confirms completion.
- Delivered is a dispatch-level outcome after valid proof. Fulfilled is the
  aggregate order outcome after server-owned completion, inventory finalization,
  and absence of remaining fulfillment demand.
- Build a connected prototype before production presentation is locked. It uses
  realistic simulated admin and 390px driver state and performs no real
  dispatch, inventory, email, proof, or production mutations.
- Treat the responsive rollout as a continuation of the Driver Platform Revival.
  Preserve Expo, `/sales-book/dispatch-task`, `/sales/packing-list`, and deep-
  link compatibility during the pilot.
- Roll out through explicit office, role, and driver cohorts. Any required
  schema change is additive and remains backward-compatible through the
  rollback window.
- Collect manifest-load, action-failure, packing-duration, blocker-response,
  proof-retry, completion, fallback-use, stale-revision, permission-denial, and
  inventory-reconciliation evidence.
- Responsive web becomes canonical only after acceptance passes with no open
  high-severity correctness or authorization defect and a new ADR explicitly
  amends ADR-054. Old surfaces are removed only through a later explicit
  product/architecture decision.
- Rollback changes cohort or route selection only. It never reverses completed
  dispatch, proof, allocation, inventory, notification, or audit records.

## Testing Decisions

- The highest acceptance seam is one reversible local order exercised through
  the real admin and responsive-driver interfaces: order-level Fulfillment,
  dispatch creation/assignment, assigned driver manifest, quantity verification,
  blocker request, admin resolution, Ready to resume, packing, trip start,
  arrival, proof completion, and aggregate fulfillment/back-order result.
- Capture server-side snapshots before assignment, after dispatch allocation,
  after packing, after blocker resolution, after trip start, after proof
  completion, and after same-request retry. Reconciliation must prove exact
  quantities and absence of duplicate effects.
- Tests assert observable domain behavior, rendered status, protected command
  results, persisted evidence, and route state rather than component internals
  or helper call order.
- Order-projection coverage includes zero, one, and multiple dispatches;
  production-required and no-production work; partial packing; one partial
  delivered dispatch; multiple assignees; cancellation; back order; terminal
  fulfillment; open exceptions; and compatibility statuses.
- Fulfillment browser coverage proves one row per order, compact Sales Orders
  density, no Progress column, correct Assigned To summary, canonical Status,
  exception badges, truthful summary cohorts, filters, tab composition, and
  Calendar isolation.
- Sales Overview coverage proves row-open Dispatch routing, order summary,
  chronological dispatch history, Create dispatch eligibility, nested dispatch
  detail, Packing as an explicit action, URL restoration, close/back behavior,
  and query invalidation.
- Permission coverage proves ordinary order viewers, dispatch managers,
  warehouse operators, assigned drivers, cross-driver denial, production owners,
  inventory owners, Special Order override holders, and users lacking each
  required capability.
- Packing coverage proves legacy-only, inventory-backed, and mixed dispatches;
  exact allocation binding; zero-with-reason; partial quantities; shortage;
  stale revision; reassignment; correction/reopen authority; idempotent retry;
  and no commercial-order quantity rewrite.
- Assistance coverage proves every blocker taxonomy value, request identity,
  duplicate replay, revision invalidation, expiry, acknowledgement, allow-listed
  override, denial, canonical remediation command, fresh readiness validation,
  Ready to resume, and immutable audit evidence.
- Explicit negative tests prove that physical shortage, missing inventory
  identity, stale revision, absent underlying capability, customer-declined
  Special Order state, and unreturned picked stock cannot be bypassed.
- Notification tests prove office and capability recipient scoping, redacted
  payloads, in-app/email deduplication, retry checkpoints, escalation,
  acknowledgement, protected deep links, decision feedback, and no
  unauthenticated approval.
- Driver-browser coverage uses representative phone, tablet, and desktop
  viewports and verifies Today ranking, navigation, one primary action, touch
  targets, no horizontal overflow, loading, empty, stale, blocked, offline,
  retry, reassignment, and completed states.
- PWA/browser coverage proves ordinary browser use without installation,
  installability when supported, current/previous major Chrome and Safari
  behavior, cache boundaries, logout cleanup, draft expiry, and inability to
  authorize transitions from stale cached state.
- Proof coverage reuses the existing dispatch completion contract tests for
  deterministic request identity, same-request replay, different-proof
  conflict, interrupted upload, staged-document reuse, five-photo and type/size
  limits, signature validation, assigned-driver/manager authorization, payment
  review deduplication, inventory consumption, and completed-dispatch conflict.
- Web proof browser coverage proves form persistence after failure, relaunch or
  refresh recovery where supported, explicit sync state, no premature close,
  arrival/recipient/completion/failure evidence, and browser-draft cleanup.
- Lifecycle tests distinguish dispatch Delivered from aggregate Fulfilled and
  prove a completed partial dispatch produces remaining demand and Back order
  rather than terminal fulfillment.
- Cancellation tests preserve release of approved/reserved stock and require
  explicit physical-return confirmation before releasing picked stock.
- Prototype validation uses representative office administrators and drivers.
  Record whether each participant identifies the next action without coaching
  and correctly explains Status, Assigned To, Packing blocked, Back order,
  Delivered, and Fulfilled.
- Pilot acceptance measures real cohort usage and reliability without removing
  fallbacks. Required evidence includes support feedback, route fallback use,
  action and notification failures, proof retries, completion success,
  stale-revision behavior, authorization denials, and inventory reconciliation.
- Rollback acceptance proves cohort disablement or route restoration leaves all
  completed operational and audit records intact and readable through existing
  compatibility surfaces.
- Existing focused Sales lifecycle, Dispatch Workspace, driver manifest,
  Dispatch Exception, dispatch inventory, Special Order enforcement, proof
  completion, permission, notification/email, table, URL-state, and Expo tests
  are extended rather than replaced by parallel suites.
- Broad typecheck, focused formatting/lint, schema migration validation,
  accessibility inspection, authenticated desktop/mobile browser QA, real
  device weak-network proof, and diff hygiene are required in proportion to
  each implementation slice. Unrelated baseline failures must be documented and
  cannot substitute for focused evidence.

## Out of Scope

- Replacing `OrderDelivery` as the canonical trip header.
- Replacing dispatch-bound Stock Allocation, Packing List, production review,
  Special Order enforcement, resumable proof completion, or physical-return
  authority.
- Rewriting commercial Sales Order quantities when a dispatch is partial.
- Allowing a generic admin status rewrite or blanket safeguard override.
- Treating physical shortage, missing inventory configuration, stale revision,
  or customer-declined Special Order evidence as administratively ready.
- Automatic route optimization, multi-stop route planning, live driver
  surveillance, continuous background location, or customer live tracking.
- Driver payroll, marketplace/offer bidding, payment collection, billing
  redesign, or customer e-commerce changes.
- A mandatory PWA installation or a native browser feature that prevents normal
  web use when unavailable.
- Full offline mutation. Cached views and recoverable drafts do not authorize
  packing, trip, proof, or completion transitions without the server.
- Unauthenticated approval from email or notification content.
- Removing Expo, `/sales-book/dispatch-task`, `/sales/packing-list`, or any
  compatibility route during initial implementation.
- Production rollout, hosted-data mutation, legacy record backfill, or surface
  retirement without the pilot, reconciliation, rollback, and ADR gates.
- Reversing completed inventory, proof, delivery, notification, or audit effects
  during interface rollback.

## Further Notes

- Use Order lifecycle for the aggregate Sales Order state, Dispatch lifecycle
  for one `OrderDelivery`, Assignment for ownership, and Exception for a
  condition requiring attention. Avoid using these terms interchangeably.
- Preferred order labels are Awaiting production, Production queued, In
  production, Ready to fulfill, Fulfillment queued, Packing, Packed, In transit,
  Fulfilled, and Cancelled.
- Preferred operational labels are Needs assignment, Assigned, Packing blocked,
  Approval requested, Ready to resume, Ready to load, Arrived, Delivered, Back
  order, Failed, Returned, Rescheduled, and Overdue.
- “Production completed” is technically true evidence but “Ready to fulfill” is
  the useful order-stage label.
- “Back order” is not a synonym for not fully packed. It begins when a committed
  partial dispatch leaves commercial quantity outstanding.
- Delivered and Fulfilled must remain distinct in UI copy, analytics, activity,
  documents, and tests.
- Packing List remains an execution authority even when the driver no longer
  sees it as a separate product surface.
- The initial connected prototype is a decision artifact. It can refine
  interaction density and terminology but cannot weaken the approved domain,
  permission, retry, or cutover boundaries.
- This specification is ready for tracer-bullet ticketing. Ticketing should
  keep the admin/order-grain and responsive-driver trunks independently
  demonstrable before joining them in the full acceptance journey.

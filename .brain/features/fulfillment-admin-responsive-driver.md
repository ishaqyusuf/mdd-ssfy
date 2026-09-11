## Order-first fulfillment sheet — Ticket 03 in progress

Admin order-row clicks now open the order-specific fulfillment sheet directly to General information and Fulfillments. A named backlog item list expands beneath aggregate ordered/delivered/assigned/backlog totals. Unknown legacy scope remains an explicit review state. Full history includes completed/cancelled entries, rendered as a compact desktop ledger and mobile cards, with 20-entry loading. The existing Assign form is reachable while the approved secondary form is implemented in Ticket 05. Completing backlog or changing fulfillment status is not added by this read-only sheet ticket.

Browser checked the local no-fulfillment order, named backlog expansion, Assign entry and closing back to the same filtered list. Secondary fulfillment navigation and mobile/restricted-access checks remain before closing Ticket 03. No business data changed.

## Order-grain admin workspace — September 10, Ticket 02

Admin order-list tabs use one SalesOrder per row, including orders without a fulfillment. Driver names aggregate active fulfillments, while order status comes from the canonical pipeline headline. Rows show fulfillment count, delivered/ordered units and backlog or Review quantities. Existing invoice/payment presentation is enriched only for the requested page. Clicking the order opens its overview without an arbitrary fulfillment ID. Order menus expose Open order and Assign backlog when canonical remainder exists; selected orders retain the existing guarded Mark as entry point. Secondary order/fulfillment sheets and quantity-confirmed completion are subsequent tickets.

Header counts and operational cards use the same search/filter query as rows. Exceptions and driver directories retain their own counts. Clear filters preserves the current section. Existing driver execution and calendar queries remain unchanged. Browser verified the local admin table and order 09602PC without changing business records. Nine pure tests and a 13-assertion rollback integration fixture pass; full dashboard typecheck remains red on existing unrelated failures.

# Fulfillment Admin And Responsive Driver Workflow

## Status

In progress. Ticket 01 is implemented as a non-production prototype and is
paused at the representative admin/driver feedback gate. Tickets 02–14 remain
dependency ordered under
`.scratch/fulfillment-admin-responsive-driver-implementation/issues/`.

## Prototype boundary

- Development-only route: `/sales-book/fulfillment/prototype`; production
  resolves the route as not found.
- The route is intentionally absent from navigation and requires `editOrders`.
- Admin and 390px driver presentations consume the same local reducer state.
- URL state owns only the selected review surface and named scenario, making
  review states shareable without creating operational records.
- No tRPC client, mutation, email, inventory, dispatch, proof, or hosted-data
  write is imported by the prototype.

## Approved domain presentation under review

- Order status and Dispatch status are distinct lifecycle values.
- Assigned To is ownership, not a lifecycle status.
- Packing blocked is an exception overlay while assistance is waiting or
  denied.
- Back order appears only after a partial dispatch is approved and committed.
- Delivered closes one dispatch; Fulfilled closes the aggregate order only
  when the delivered quantity equals the ordered quantity.
- The driver surface presents one primary next action and explicit quantity
  truth at each scenario.
- Weak-network proof is represented as saved locally for retry, with duplicate
  request IDs treated idempotently by the simulated reducer.

## Validation and evidence

- Focused reducer and boundary validation: 8 tests / 30 assertions.
- Authenticated in-app-browser validation covered URL scenario switching,
  assistance notification, the single driver action, and proof retry.
- Review screenshots live under
  `.scratch/fulfillment-admin-responsive-driver-implementation/screenshots/`.

## 2026-08-24 Canonical Page Hydration Repair

- The canonical `/sales-book/fulfillment` route now awaits its active list or
  calendar prefetch before hydration.
- The list route prefetches the shared dispatch summary used by summary cards,
  overdue status, and driver workload, and removes workspace-only URL defaults
  before building the table query so its server and client query keys match.
- Authenticated in-app-browser validation confirmed the populated Pending list
  and Calendar route render without error boundaries or new console errors.
- No dispatch behavior, mutation, permission, API contract, or database schema
  changed.

## Open gate

Record representative admin and driver feedback on terminology, density,
exception handling, and the primary-action progression. Only after that review
may Ticket 01 be marked complete and Ticket 02 become the active frontier.

## 2026-09-10 Quantity-scoped assignment specification

- The approved follow-up specification is
  `.brain/plans/2026-09-10-spec-fulfillment-quantity-scoped-assignments-and-backlog.md`.
- Fulfillment is order-first and one order may own several quantity-scoped
  assignments. `OrderDelivery` and `OrderItemDelivery` remain the canonical
  assignment/shipment records.
- Fulfillment Backlog now includes positive unassigned remainder immediately
  after a partial assignment and quantity left behind by underpacking. This
  supersedes the prototype rule that Back order appears only after a partial
  dispatch is committed.
- The plan adds secondary assignment create/detail/edit sheets, exact remaining
  quantity selection, assignment-scoped driver manifests, update/reassignment/
  completion notifications, Pack & complete, and guarded previous-day recovery
  completion without bypassing inventory, proof, revision, or permission rules.
- The plan is analysis and ticketing only; no operational order or dispatch
  record changed.

## 2026-09-01 Dispatch Summary Reliability Repair

- The canonical `/sales-book/fulfillment/v2` summary now derives lifecycle
  stages from `OrderDelivery.status` instead of rebuilding all historical item
  controls for every request. The full control fan-out consumed roughly 12
  seconds across 3,518 production dispatches; it was a material latency
  regression but not the observed exception.
- Sentry confirmed the HTTP 500 root cause was production `TZ=:UTC` being passed
  directly to `Intl.DateTimeFormat`. The shared Dispatch date boundary now
  normalizes POSIX-style zones, validates the result, and safely falls back to
  the canonical business timezone. The repair covers both
  `dispatch.workspaceSummary` and `dispatch.list`, including due/risk filters.
- Explicit dispatch states are authoritative. In particular, `missing items`
  remains Packing blocked instead of being masked by a legacy `unknown` control
  projection.
- Summary and selected-section data now prefetch concurrently and render through
  independent Suspense/error boundaries. Summary-card failure cannot remove the
  tabs, filters, operational table, calendar, or actions.
- Tab count badges appear after hydration so a streamed summary cannot create a
  server/client markup mismatch. Summary cards and the overdue alert share one
  query consumer.
- Focused validation passes 19 tests / 168 assertions; `@gnd/sales` typecheck
  passes. Authenticated local
  browser QA confirmed summary cards, overdue alert, tabs/filter toolbar, and
  table with no visible fallback and no console error. Production deployment
  and post-deploy Vercel/Sentry monitoring remain pending.

## 2026-08-23 Mobile Authority Reconciliation

- Expo now consumes the same server-owned dispatch revision, readiness,
  lifecycle risks, capabilities, and blockers used by current fulfillment
  logic while retaining its existing queue, stop, packing, issue, proof,
  notification, and settings flow.
- Normal legacy packing, inventory-backed packing, and guarded-review requests
  share one atomic command boundary. Pending guarded quantity remains visibly
  pending and never counts as packed readiness until canonical approval.
- Drivers can Start Trip, report a durable issue, and complete with proof when
  the server grants those actions. Cancellation, generic status editing,
  packing reset, and picked-stock release remain manager operations.
- UI redesign remains outside this reconciliation. Sequential screen review
  and design alternatives require the explicit post-implementation approval
  gate.

### Quantity projection implementation — September 10

User removed the design approval gate and authorized Ticket 01. Order overview now exposes a shared quantity projection with strict planned-versus-physical separation. This is additive work in progress: inventory conversion, Backlog filtering, visible overview presentation and integration acceptance are still required. No operational order writes were made.

### Overview quantity display verified — September 10

Added a scoped Fulfillment quantities card to the existing order Dispatch tab. Expand to inspect ordered, delivered, assigned, packed, remaining and assignable values by title/size/handing. Unresolved evidence shows Needs review rather than a confirmed zero backlog. Existing inventory packing writes sales-unit delivery rows, which the projection reuses without adding component units.

In-app admin read-only verification on local 09602PC shows 83 ordered units and existing fulfillment #4659; the missing legacy scope is explicitly unresolved. The order state changed since the original design fixture inspection; this implementation did not create that fulfillment or mutate the order. Twenty focused tests pass. Queue membership/count integration remains pending.

### Ticket 01 complete — September 10

Shared Backlog membership/counting now uses the quantity projection before pagination, allowing partial assignment before delivery. Thirty-six focused tests and the 12-assertion local rollback integration fixture pass. Existing inventory command rows are reused as sales quantities. Scoped sales typecheck has only the pre-existing copy-sales nullable-string error; full repository validation limits remain in progress.md. Ticket 02 now owns order-grain rows/counts beyond Backlog.

### Secondary fulfillment packing integration (in progress)

The nested fulfillment sheet now has URL-backed Overview and Packing views. Packing lazy-loads the existing guarded packing component after the manager-protected paired detail lookup succeeds. The packing query carries both salesId and dispatchId so the existing order-membership check applies. Opening another fulfillment or closing the sheet clears the view parameter. Browser verified packing loads for 09602PC / 4659 without modifying records. This remains the legacy packing projection until Ticket 07 implements assignment-scoped quantities; route, proof, exceptions, activity and full action menus remain pending.

The secondary fulfillment sheet now offers a lazy Exceptions view with reported/resolved details, error retry and explicit load-more pagination. Its URL state restores on refresh. This is read-only history; existing exception resolution commands are not yet integrated into this sheet.

A lazy Proof tab now shows completion-proof registration state and owned document names. It distinguishes upload-in-progress from completed proof and does not infer successful fulfillment from proof registration alone. Document preview/download remains pending.

The lazy Route tab reuses the driver destination resolver, preserving driver-confirmed routing separately from the order address. Pickup needs no delivery route; unresolved delivery destinations show a confirmation notice. This view does not change destination data.

The lazy Activity tab shows creation context and structured fulfillment audit events, including schedule changes. General order notes are excluded. This currently reflects existing structured history; assignment and completion audit writers remain part of their implementation tickets.

User UI correction: order and fulfillment now share sheet-v2 with a true secondary pane, matching the main sales overview. Fulfillment tabs use the same compact uppercase desktop design and mobile dropdown. Closing the secondary pane preserves the order and list filters.

Both fulfillment panes use the shared sheet-v2 outer insets without additional nested horizontal padding, matching sales overview spacing.

Planned fulfillment creation foundation: shared selection validator computes a proposed persisted scope and resulting backlog from canonical quantities. Full selection is evidence-derived; exact selected quantities are validated without silent clamping. API/form integration and transactional reservations remain pending.

Create-assignment foundation now includes strict date/mode input validation and stable evidence revision/request fingerprint helpers. These remain internal, with nine focused passing tests; they do not yet change creation behavior.

Planned creation now has an internal transaction step with fresh evidence validation and durable request replay via structured SalesHistory. It reserves planned quantities without generating physical packing rows. Local rollback verification confirms 5-of-10 allocation, remaining backlog, duplicate prevention and stale-request rejection. The user-facing command/form is not yet connected.

The assignment form now has a manager-only defaults endpoint derived from canonical evidence. It preserves an unscheduled order date and provides item names, exact remaining quantities and the transaction revision. The new form and mutation are not wired yet.

Planned fulfillment creation now has a protected endpoint with active-driver and destination checks, transactional reservations and post-commit existing notifications. New form integration is still pending. Notification delivery failure is returned separately and does not roll back saved reservations; durable retries are not yet implemented.

User-corrected backlog rule: an order with no non-cancelled fulfillment is unassigned and has zero backlog. Remaining quantities remain available for first assignment. Partial assignment or incomplete packing on an existing fulfillment produces backlog. Cancelled-only history does not establish backlog. Missing quantity controls block both projection and assignment consistently.

User-facing switch label is **Partial Fulfillment**. Fulfillment forms must reuse the existing packing list/item components, SalesFormQuantityStepper, DeliveryDatePicker and shadcn selection controls. Native substitute form widgets should not be introduced.

Creation actions use the shared fixed secondary footer outside the item-list scroll area. Cancel and Assign fulfillment remain visible during scrolling; the external submit button targets the form by ID.

The protected updateFulfillment endpoint supports planned quantity, driver and date edits using the locked shared validator. Changed plans notify the assigned driver with a general Fulfillment updated event; reassignment sends old-driver unassignment and new-driver assignment. No-op/replay sends nothing. The edit form integration and durable notification retries remain in progress.

Create and edit now share fulfillment-form with separate query loaders. URL fulfillmentForm=edit retains both order and fulfillment IDs. The row dropdown offers Edit, Change date and Change driver through that editor; pickup omits Change driver. Editing prefills saved quantities and uses own-reservation-plus-free capacity. Cancel returns to fulfillment detail, and Save fulfillment stays in the fixed secondary footer. Closed/unresolved edits disable the form with a reason. Successful-save browser acceptance and durable retries remain pending.

With Partial Fulfillment off, a new planned fulfillment reserves all available remainder and contributes its numeric quantity to Assigned. Verified persisted example: existing 3 + full remainder 7 yields Assigned 10 and Backlog 0. The dash is reserved for unresolved evidence. Date-only edit equality ignores a stored time-of-day, so saving the same calendar date does not manufacture a change.

Planned pre-trip fulfillments expose Confirm short load in the shared packing overview when packed quantity is below target. The dialog previews assigned, packed and left-behind lines; confirmation releases the remainder through the protected transaction and refreshes dispatch data. Inventory-backed release still requires reconciliation and is blocked with a review reason; live browser acceptance remains pending.

Editing foundation: pure edit-plan validation treats own reservation as editable capacity while retaining all other reservations and refusing reductions below physical packed/delivered evidence. API and same-form editing remain pending.

Editing now has a paired manager-only prefill endpoint. It returns current assignment values and capacity including own reservation while retaining others. In-progress/closed states and unresolved evidence are non-editable. Save and UI wiring remain pending.

The internal edit transaction supports safe reductions/increases and full-mode scope recalculation with physical floors. Existing metadata is preserved and unchanged saves are identified. This does not yet enable user-facing editing.
# Short-load inventory return confirmation

Packing progress for a scoped fulfillment uses its assigned quantity as the denominator, even when fewer units have been listed. Only confirmed short-load scope reduction lowers the target; five assigned/three packed remains 3/5 before confirmation and becomes 3/3 after the saved scope is reduced to three.

The shared packing short-load dialog submits the preview's inventory revision. When excess picked stock requires a physical return, an unchecked shadcn checkbox must be confirmed before submission. Consent is scoped to the displayed inventory revision and resets when reopening the dialog; refreshed changed inventory requires confirmation again. Request retry identity covers both quantity revisions and confirmation. End-to-end inventory fixture/browser save validation remains pending.
### Completion review and historical delivery date

Administrators open Mark as completed from an individual fulfillment action menu. Completion stays inside the existing order secondary sheet and displays assigned, packed, and backlog quantities before evidence entry. The same proof form is shared with the driver surface and stores recipient, actual delivery date, signature, notes, and optional photos in a manifest-bound local draft. A legacy fulfillment without confirmed quantity scope, unresolved physical evidence, or an unconfirmed short load remains blocked until reviewed through its canonical workflow.

### Fulfillment workspace navigation

Active is the default fulfillment workspace. The broad all-orders view is named **All fulfillments**, uses the explicit `dispatches` section, and stays at the end of the tab list so it remains in the overflow menu during normal use. Summary cards that need an all-orders filtered view target that explicit section rather than clearing the section query.

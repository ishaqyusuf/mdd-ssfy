# Paid Sales Operational Handoff — Midday Migration Contract

Status: active implementation checklist

## 1. Reference Compared

Target inspected:

- Sales Orders route composition, summary, header, payment-review settings, table Suspense/error boundary, virtualized table, table header, row opening, and Sales Overview URL state.
- Sales Settings layout/navigation, Documents route, settings cards, protected settings queries/mutations, partial metadata preservation, and loading/error states.
- Canonical payment projection, inventory demand/inbound ownership, production assignment/submission review, packing/dispatch commands, notifications, jobs, and Prisma schema boundaries.

Midday reference inspected:

- Invoices route, header, search/filter, table, columns, table header, actions, bottom bar, skeleton, and empty states.
- Invoice URL-param hooks, open-sheet control, sheet wrapper, sheet header, content router, and form context.
- Midday feature-flow, table, state/routing, API/database/jobs, and package-boundary guidance.

## 2. Migration Principle

Keep the existing Sales Orders Midday-style shell intact. Add Sales Handoff as an independently hydrated, bounded section before the existing table rather than extending the table payload or route-local business logic. Keep navigable operational destinations in URL state, server state in tRPC/TanStack Query, reusable qualification/action/review rules in domain packages, persistence in Prisma/query services, orchestration in protected API procedures/jobs, and UI composition in focused Dashboard components.

## 3. Filesystem Plan

- Extend the Sales Settings schema/domain package with the canonical trigger policy and payment qualification projection.
- Add a dedicated Operations route and focused settings component under the established Sales Settings surface.
- Add a focused Sales Handoff domain boundary for action projection, epoch reconciliation, and contracts rather than placing rules in the Sales Orders route or component.
- Add additive database schema and generated migration artifacts for durable action epochs and packing-specific pending reviews.
- Add protected API schemas, query orchestration, and job/reconciliation entry points at existing Sales boundaries.
- Add a focused alert component adjacent to Sales Orders feature components and compose it in the route before the table.
- Reuse the existing Sales Overview sheet and URL hooks for Material and Production destinations; do not introduce a competing order-detail sheet.
- Extend existing production-review and packing/dispatch boundaries rather than creating generic override services.
- Add focused package, API, Dashboard contract, job/notification, permission, migration, and browser tests beside their owning layers.

## 4. Route/Page Plan

- Sales Orders remains a thin server route that loads filter/sort/table settings and prefetches independent table, summary, and handoff queries.
- Handoff loading/error behavior is isolated from Sales Orders table loading/error behavior.
- The alert is composed immediately before the table and after the existing page header/payment-review control.
- Sales Settings adds a route-backed Operations section using the shared settings layout, navigation, loading, and error conventions.
- No heavyweight handoff evaluation runs inside the route component.

## 5. Header And Open Button Plan

- Preserve the existing Sales Orders search/filter, column control, create action, and header hierarchy.
- The handoff pills are semantic buttons within the alert, not new table columns or row actions.
- Add Operations to the existing Sales Settings secondary navigation without changing unrelated sections.
- No new Sales Orders open/create button is introduced.

## 6. Sheet Plan

- Reuse the globally available Sales Overview sheet as the single destination workspace.
- Material actions set canonical Sales Overview URL state for Inventory Needs and the Create inbound continuation.
- Production actions set canonical Sales Overview URL state for the affected production item/assignment.
- Destinations lazy-load their existing active operational surface, repeat authorization, and restore focus to the originating pill on close.
- No handoff-specific sheet owns payment, inventory, production, or packing mutations.

## 7. Form-To-Sheet Plan

- Sales Handoff Trigger editing stays on the dedicated settings route because it is persistent administrative configuration, not an order-detail form.
- Inbound creation, production assignment, production review, and packing review continue through their existing sheet or command surfaces.
- No existing inline Sales Orders form is moved or retired by this feature.

## 8. Filter/Search/URL State Plan

- Alert results are server-scoped by authenticated actor and are not filtered by the Sales Orders table query.
- Material and Production deep links use the existing typed Sales Overview URL/query-state helpers.
- Alert batch expansion is ephemeral local state; the permanent `Needs Action`
  tab and selected order/item/surface remain URL state.
- Settings selection is local form state until protected save succeeds; server state is invalidated precisely afterward.

## 9. Table Plan

- Do not extend the Sales Orders row query, columns, pagination, virtualization, selection, DnD, empty state, or table store.
- The dedicated handoff read returns at most 50 stable actions; the alert initially renders six and reveals six more per local `+N more` activation.
- A permanent, non-editable `Needs Action` page tab reuses the existing Sales Orders table with an authenticated unresolved-handoff filter and a unique-order count; it does not create a competing table.
- Alert loading reserves compact space, failure is explicit and retryable, and zero actions render no alert.
- Table Suspense and handoff Suspense/error behavior remain independent so either can recover without blocking the other.

## 10. Columns And Row Actions Plan

- No Sales Orders columns or row actions change.
- Alert pills stop at the feature boundary and open the same protected Sales Overview destinations as existing order workflows.
- Material and Production use separate accessible labels and restrained semantic treatments.

## 11. Bottom Bar / Bulk Actions Plan

- Preserve the existing Sales Orders selection bottom bar unchanged.
- Handoff actions remain individual responsibilities; no bulk resolve, acknowledge, inbound creation, assignment, production approval, or packing approval is introduced.

## 12. API/Data Plan

- Validate the three trigger modes and whole-number percentage at the protected boundary; only active Super Admins mutate policy detail.
- Derive qualification from canonical integer-cents settlement facts, successful receipts, completed refunds, and explicit lifecycle exclusions.
- Persist independent Material and Production action epochs with responsible representative, policy/evidence revisions, lifecycle timestamps, escalation identity, and indexes for bounded reads/scans.
- Reconcile affected epochs after relevant domain mutations and through a bounded recurring repair job.
- Derive representative scope from the session; active Super Admins receive the bounded all-order projection.
- Extend the in-app notification contract for one-business-day escalation without email/push delivery.
- Route production-only reports through the established material-review authority and supersede the worker-only hard gate.
- Persist packing-specific pending reports/reviews with their own command and downstream hold semantics.
- Keep payment, inventory, production, packing, dispatch, payroll, and fulfillment truth in their existing authorities.

## 13. Testing And QA Plan

- Test pure payment qualification and combined action projection matrices at package level.
- Test settings, protected action reads, actor scoping, epochs, reconciliation, escalation, production review, and packing review at their API/service boundaries.
- Test alert/settings UI behavior through integration contracts rather than brittle markup snapshots.
- Run focused package/API/Dashboard tests after each ticket, then package typechecks and broad root typecheck/build checks after integrated work.
- Use the authenticated in-app browser for desktop, narrow responsive, keyboard, deep-link, pending-review, escalation, and console-error acceptance.
- Capture and retain screenshots for every user-visible feature slice as it lands.

## 14. Open Questions

None. The approved specification and tickets resolve the product and authority decisions needed for implementation.

## Conformance Checklist

- [x] Ticket 01 — settings route and qualification policy conform.
- [x] Ticket 02 — Material action alert and deep link conform.
- [x] Ticket 03 — Production action alert and deep link conform.
- [x] Ticket 04 — Super Admin scope and escalation conform.
- [x] Ticket 05 — production-only guarded review conforms.
- [x] Ticket 06 — packing-specific guarded review conforms.
- [x] Ticket 07 — repair, performance, integrated QA, and documentation conform.

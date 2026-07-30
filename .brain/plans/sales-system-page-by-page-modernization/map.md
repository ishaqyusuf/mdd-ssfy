# Plan: Sales System Page-by-Page Modernization

## Type
Program Plan

## Status
Roadmap

## Created Date
2026-07-30

## Last Updated
2026-07-30

## Goal
Modernize the complete sales system as a sequence of small, observable page
changes instead of a broad migration. Preserve working behavior, let the
operator inspect every meaningful UI or workflow change, and update Project
Brain documentation after each accepted slice.

## Execution Policy
- Only one page group is active at a time.
- The active page group is split into independently reviewable slices.
- Before a slice, record the intended behavior, affected files, risks, and
  validation.
- Do not make unrelated navigation, API, schema, or shared-component changes
  inside a page slice.
- After implementation, run focused automated checks and authenticated browser
  validation.
- Update the feature plan, feature document, task status, and progress evidence
  before starting another slice.
- Pause after every user-visible slice so the operator can inspect it.
- Do not begin the next page group without explicit direction.

## Product Direction
The long-term sales lifecycle remains:

`Quote -> Order -> Production -> Packing -> Dispatch -> Delivery -> Payment -> Customer history`

The modernization should make the lifecycle easier to follow without forcing a
single cross-system rewrite. Existing working contracts remain authoritative
until the page that owns them is deliberately migrated.

## Page Sequence

| Sequence | Page Group | Status | Plan |
| --- | --- | --- | --- |
| 01 | Sales Customers + Customer Overview | Active planning | `01-customers-and-customer-overview-plan.md` |
| 02 | Sales Orders + Sales Overview | Deferred | `02-sales-orders-and-sales-overview-plan.md` |
| 03 | Sales Quotes | Deferred | `03-sales-quotes-plan.md` |
| 04 | Sales Production: admin + worker | Deferred | `04-sales-production-admin-and-worker-plan.md` |
| 05 | Packing List | Deferred | `05-packing-list-plan.md` |
| 06 | Dispatch: admin + driver delivery | Deferred | `06-dispatch-admin-and-driver-delivery-plan.md` |
| 07 | Sales Finance + Accounting retirement review | Deferred | `07-sales-finance-and-accounting-retirement-review-plan.md` |
| 08 | Reports, products, inbounds, communications, dealers | Deferred | `08-sales-supporting-pages-plan.md` |
| 09 | Cross-system control tower and later recommendations | Deferred | `09-cross-system-control-tower-and-recommendations-plan.md` |

## Plan Outcomes
- 01: A fast customer directory and one coherent customer detail experience.
- 02: A consistent order workspace and drill-down flow.
- 03: Quote follow-up and conversion without duplicate workflows.
- 04: Role-specific production workspaces backed by shared controls.
- 05: Item-level packing, assignment, staging, and exception handling.
- 06: Assignment, scheduling, driver manifest, proof, and exception management.
- 07: Preserve canonical Finance and evaluate legacy Accounting retirement.
- 08: Align supporting sales pages after core workflows stabilize.
- 09: Add only cross-stage views supported by completed page contracts.

## Recorded Later Direction

### Navigation
- Sidebar entries should represent page destinations, not create actions,
  deleted views, experimental routes, or page modes.
- Admin/worker modes should be permission-aware views inside the owning feature
  unless a separate route is operationally required.
- Navigation work is deferred until the active page provides evidence for the
  shared pattern.

### Production
- Admin and worker experiences should share production domain rules while
  exposing role-appropriate actions.
- Assignment, task progress, material review, approval, and fulfillment release
  must remain distinct states.

### Packing
- Packing should become item-level work rather than a simple dispatch-status
  table.
- Notification tags must not become the durable source of packing state.

### Dispatch And Driver Delivery
- Packing readiness, dispatch assignment, trip state, delivery proof, and
  exceptions should remain separate.
- The native mobile app is the intended primary driver surface unless later
  operator evidence changes that decision.
- Existing resumable/idempotent proof completion must be preserved.

### Finance And Reporting
- Sales Finance remains the current internal quality reference.
- Legacy Accounting retirement requires parity, usage evidence, responsive
  operator acceptance, and explicit approval.

### Later Recommendations
- Customer follow-up queue
- Fulfillment exception center
- Returns/RMA
- Sales activity timeline
- Duplicate/data-quality review
- Demand and capacity planning

These remain deferred ideas, not implementation commitments.

## Shared Quality Direction
- URL state should preserve search, filters, selected records, sheet mode, and
  active detail tab where appropriate.
- Desktop management pages may use virtualized tables.
- Mobile task pages should use task-appropriate cards instead of compressed
  desktop tables.
- Internal APIs must enforce identity, permissions, ownership, and office scope.
- List queries should stay paginated and lean; detail data should load only
  when required.
- New user-visible work should include focused tests, responsive browser proof,
  and Brain completion evidence.

## Active Plan
`.brain/plans/sales-system-page-by-page-modernization/01-customers-and-customer-overview-plan.md`

## Deferred Plans
- `.brain/plans/sales-system-page-by-page-modernization/02-sales-orders-and-sales-overview-plan.md`
- `.brain/plans/sales-system-page-by-page-modernization/03-sales-quotes-plan.md`
- `.brain/plans/sales-system-page-by-page-modernization/04-sales-production-admin-and-worker-plan.md`
- `.brain/plans/sales-system-page-by-page-modernization/05-packing-list-plan.md`
- `.brain/plans/sales-system-page-by-page-modernization/06-dispatch-admin-and-driver-delivery-plan.md`
- `.brain/plans/sales-system-page-by-page-modernization/07-sales-finance-and-accounting-retirement-review-plan.md`
- `.brain/plans/sales-system-page-by-page-modernization/08-sales-supporting-pages-plan.md`
- `.brain/plans/sales-system-page-by-page-modernization/09-cross-system-control-tower-and-recommendations-plan.md`

## Out Of Scope Until Explicitly Activated
- System-wide route renaming or removal
- Global sidebar replacement
- Dispatch/packing state migration
- Production role redesign
- Accounting retirement
- New cross-system dashboards
- Broad table-core changes
- Database migrations unrelated to the active page

## Completion Rule
This program is complete only after each page group has its own accepted plan,
incremental implementation evidence, updated feature documentation, and
explicit operator acceptance. Completion of one page does not authorize work on
the next page.

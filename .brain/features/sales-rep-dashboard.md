# Sales Rep Dashboard

## Current Route

- `/sales-rep`
  - internal sales representative dashboard
  - shows summary metrics for total sales, commission earned, pending commission, and active customers
  - exposes work panels for dealer requests, recent sales, recent quotes, and commission

## UI Behavior

- The page-level `New order` and `New quote` actions navigate directly to the
  canonical sales form routes. Find Anything interception is reserved for the
  shared Sales layout header actions.
- The dashboard sections are ordered as Recent Orders, Recent Quotes, Dealership Requests, and Commissions.
- At `md` and wider, the dashboard tab selector uses the shared `ButtonGroup` pattern from the sales overview/sales-book navigation. Below `md`, it falls back to a full-width dropdown selector.
- Tab controls link to `?tab=recent-sales`, `?tab=recent-quotes`, `?tab=requests`, or `?tab=commission` so refreshes and notification deep links preserve the active panel.
- Dealership Requests and Commissions remain WIP: they are enabled outside production, disabled in production controls, and direct production URLs for either panel redirect to Recent Orders.
- The Requests tab keeps the existing pending request count badge inside the grouped button.
- The route still server-hydrates only the active tab's first visible data; no API contract or database behavior changed.
- Recent Sales is a bounded dashboard list rather than a table workspace. It requests exactly five latest orders with `showing: null` and `createdAt.desc`, preserving the existing sales-rep scope without filters, table settings, selection, virtualization, drag-and-drop, row menus, or an internal scroll container.
- Each Recent Sales row keeps the existing Sales Overview URL-driven opener, shows the order number, priority, customer, invoice total, date, and lifecycle status, and the panel offers a `View all` link to `/sales-book/orders`.
- Recent Quotes continues to use the shared `components/tables-2/sales-quotes` compact table module.
- The Commission tab uses dedicated `components/tables-2/sales-rep-commission-payments` and `components/tables-2/sales-rep-commissions` modules for the two commission cards instead of the old `components/tables` helper layer.
- Commission tables run as compact embedded panels with 56px rows, sticky Payment/Commission columns, tailored payment/commission widths, table-owned scroll, draggable/resizable headers, and persisted table settings.
- `/sales-rep/design` remains a static design/profile route, but its Recent Activity panel now uses the restarted `components/tables-2/sales-rep-design-activity` module instead of inline `@gnd/ui/table` markup.
- The design activity table uses compact 48px rows, sticky Order, table-owned scroll, `VirtualRow`, DnD, draggable/resizable headers, persisted settings, and tailored widths for Order, Customer, Product, Status, Amount, Commission, and Date.

## Validation

- 2026-06-25: scoped `git diff --check` passed for the sales-rep route update.
- 2026-07-16: migrated the recent sales/recent quotes embeds to `tables-2`; focused sales-rep/audit/quotes tests passed with 11 tests / 97 assertions, the restarted parity suite passed with 52 tests / 413 assertions, targeted Biome passed, filtered `@gnd/dashboard` typecheck reported no touched-file diagnostics, static route scan found no legacy table imports or manual query fetches, and `/sales-rep?tab=recent-sales` plus `/sales-rep?tab=recent-quotes` returned `200` with hydrated data markers in auth-limited SSR smoke.
- 2026-07-17: migrated the commission tab tables to `tables-2`; focused sales-rep commission/page audit tests passed with 6 tests / 53 assertions, the full restarted parity suite passed with 123 tests / 1173 assertions, targeted Biome passed, filtered `@gnd/dashboard` typecheck reported no touched-file diagnostics, static scans found no legacy commission table helpers or raw table imports in the commission tab surfaces, and `tables-2/core` remained unchanged. Unauthenticated curl smokes for `/sales-rep` currently return the same `authUser()`-path generic `500`, so authenticated browser visual proof remains outstanding.
- 2026-07-17: migrated the `/sales-rep/design` Recent Activity panel to `tables-2`; focused Sales Rep design activity parity tests passed with 3 tests / 29 assertions, the full restarted table parity suite passed with 166 tests / 1618 assertions, targeted Biome passed, filtered `@gnd/dashboard` typecheck reported no touched-file diagnostics, static scans found no raw table imports/markup in the design page, `git diff --check` passed, and `tables-2/core` remained unchanged. Runtime smoke was attempted through both local proxy and direct Next port, but both timed out with no bytes from the local dev server.
- 2026-07-28: replaced the five-row Recent Sales table embed with a responsive semantic list that has no internal horizontal or vertical scrolling while retaining server hydration, Suspense/error boundaries, the existing order query scope, lifecycle labels, and URL-driven Sales Overview behavior. Focused Recent Sales and migration-parity tests passed with 7 tests / 60 assertions, the affected sticky-page audit passed, targeted Biome and `git diff --check` passed, and filtered `@gnd/dashboard` typecheck output contained no touched-file diagnostics. Authenticated browser QA verified five rows, the `View all` destination, row-open URL state, no scrollable descendants or document overflow at desktop `1440x900` and mobile `390x844`, and no browser console errors.

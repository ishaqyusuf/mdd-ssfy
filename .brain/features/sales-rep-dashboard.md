# Sales Rep Dashboard

## Current Route

- `/sales-rep`
  - internal sales representative dashboard
  - shows summary metrics for total sales, commission earned, pending commission, and active customers
  - exposes work panels for dealer requests, recent sales, recent quotes, and commission

## UI Behavior

- The dashboard tab selector uses the shared `ButtonGroup` pattern from the sales overview/sales-book navigation.
- Tab buttons link to `?tab=requests`, `?tab=recent-sales`, `?tab=recent-quotes`, or `?tab=commission` so refreshes and notification deep links preserve the active panel.
- The Requests tab keeps the existing pending request count badge inside the grouped button.
- The route still server-hydrates only the active tab's first visible data; no API contract or database behavior changed.
- Recent Sales and Recent Quotes use the shared `components/tables-2/sales-orders` and `components/tables-2/sales-quotes` table modules instead of the legacy `components/tables/*` folders.
- Both table embeds run as compact, single-page panels with a five-row default size and embedded fixed height while keeping table-owned scroll, sticky headers, draggable/resizable columns, and the Sales Orders row-density contract.
- Recent Sales passes `showing: null` in its default filters so the existing Sales Orders query keeps the current sales-rep default scoping instead of forcing the all-sales page default.
- The Commission tab uses dedicated `components/tables-2/sales-rep-commission-payments` and `components/tables-2/sales-rep-commissions` modules for the two commission cards instead of the old `components/tables` helper layer.
- Commission tables run as compact embedded panels with 56px rows, sticky Payment/Commission columns, tailored payment/commission widths, table-owned scroll, draggable/resizable headers, and persisted table settings.
- `/sales-rep/design` remains a static design/profile route, but its Recent Activity panel now uses the restarted `components/tables-2/sales-rep-design-activity` module instead of inline `@gnd/ui/table` markup.
- The design activity table uses compact 48px rows, sticky Order, table-owned scroll, `VirtualRow`, DnD, draggable/resizable headers, persisted settings, and tailored widths for Order, Customer, Product, Status, Amount, Commission, and Date.

## Validation

- 2026-06-25: scoped `git diff --check` passed for the sales-rep route update.
- 2026-07-16: migrated the recent sales/recent quotes embeds to `tables-2`; focused sales-rep/audit/quotes tests passed with 11 tests / 97 assertions, the restarted parity suite passed with 52 tests / 413 assertions, targeted Biome passed, filtered `@gnd/www` typecheck reported no touched-file diagnostics, static route scan found no legacy table imports or manual query fetches, and `/sales-rep?tab=recent-sales` plus `/sales-rep?tab=recent-quotes` returned `200` with hydrated data markers in auth-limited SSR smoke.
- 2026-07-17: migrated the commission tab tables to `tables-2`; focused sales-rep commission/page audit tests passed with 6 tests / 53 assertions, the full restarted parity suite passed with 123 tests / 1173 assertions, targeted Biome passed, filtered `@gnd/www` typecheck reported no touched-file diagnostics, static scans found no legacy commission table helpers or raw table imports in the commission tab surfaces, and `tables-2/core` remained unchanged. Unauthenticated curl smokes for `/sales-rep` currently return the same `authUser()`-path generic `500`, so authenticated browser visual proof remains outstanding.
- 2026-07-17: migrated the `/sales-rep/design` Recent Activity panel to `tables-2`; focused Sales Rep design activity parity tests passed with 3 tests / 29 assertions, the full restarted table parity suite passed with 166 tests / 1618 assertions, targeted Biome passed, filtered `@gnd/www` typecheck reported no touched-file diagnostics, static scans found no raw table imports/markup in the design page, `git diff --check` passed, and `tables-2/core` remained unchanged. Runtime smoke was attempted through both local proxy and direct Next port, but both timed out with no bytes from the local dev server.

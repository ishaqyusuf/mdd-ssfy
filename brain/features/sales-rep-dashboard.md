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

## Validation

- 2026-06-25: scoped `git diff --check` passed for the sales-rep route update.

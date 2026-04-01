# Sales Orders V2

## Goal
- Rebuild the sales orders page as a clean v2 workspace under `sales-book` using Midday-style architecture:
  - thin route component
  - summary-first page shell
  - dedicated filter contract
  - isolated table module
  - reusable tRPC-backed backend contracts

## Route
- `/sales-book/orders/v2`
  - new orders workspace with:
    - summary widgets
    - `SearchFilter`-driven URL filters
    - paginated/infinite invoice-style table
    - mobile card presentation
    - row open action into the existing sales overview flow

## Backend Contracts
- `sales.getOrdersV2`
  - dedicated orders list query for the v2 page
  - reuses established sales filtering semantics through an internal legacy-query adapter
  - returns a slimmer row payload focused on list presentation instead of the legacy table shape
- `sales.getOrdersV2Summary`
  - returns page-level summary metrics for:
    - total orders
    - invoice value
    - outstanding balance
    - paid orders
    - evaluating orders
- `filters.salesOrdersV2`
  - dedicated filter metadata source for the v2 page
  - uses cleaner query keys than the older sales-order filter path

## Frontend Structure
- Hook
  - `apps/www/src/hooks/use-sales-orders-v2-filter-params.ts`
- Header
  - `apps/www/src/components/sales-orders-v2-header.tsx`
- Summary widgets
  - `apps/www/src/components/sales-orders-v2-summary-widgets.tsx`
- Table
  - `apps/www/src/components/tables/sales-orders-v2/columns.tsx`
  - `apps/www/src/components/tables/sales-orders-v2/data-table.tsx`
- Route
  - `apps/www/src/app/(sidebar)/(sales)/sales-book/orders/v2/page.tsx`

## Architectural Notes
- The v2 page intentionally avoids the older route-local coupling in `sales-book/orders`.
- The route prefetches only the list and summary queries.
- Summary metrics render as separate page-level cards instead of piggybacking on table-only state.
- The table payload omits legacy note-count and extra enrichment work that is not required for first paint.
- The page keeps existing sales overview integration by opening rows through `useSalesOverviewQuery`.
- The table now uses a unified sales funnel status contract so UI surfaces do not have to reason separately about invoice, production, and fulfillment state for list presentation.

## Current Table Shape
- Columns
  - invoice id
  - customer name
  - smart date
  - payment amount
  - status
  - actions
- Row interaction
  - clicking a row opens the existing sales sheet
  - the actions column exposes a compact overview icon with a hover preview
  - the hover preview is intentionally compact and composed as a single overview panel instead of multiple cards
- Smart funnel status
  - `pending`
    - no active production or fulfillment progress
  - `queued`
    - assigned or started in production
  - `ready`
    - production completed and ready for fulfillment
  - `transit`
    - dispatch or fulfillment is in progress
  - `completed`
    - order has been delivered or fully completed

## Follow-up Ideas
- Add dedicated batch actions for the v2 table once the row model is stable.
- Add cleaner sales manager scoping controls to the v2 filter contract if needed.
- Move more of the sales list/query normalization into shared package-layer application code if this v2 route becomes the canonical orders workspace.

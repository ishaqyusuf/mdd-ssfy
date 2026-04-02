# Sales Production Workspace

## Goal
Provide a cleaner production operations surface for both admins and production workers with fast due-date triage, clear urgency alerts, and a more usable daily queue.

## Routes
- Admin board: `apps/www/src/app/(clean-code)/(sales)/sales-book/(pages)/(admin)/productions/page.tsx`
- Admin board v2: `apps/www/src/app/(clean-code)/(sales)/sales-book/(pages)/(admin)/productions/v2/page.tsx`
- Worker sales-book route: `apps/www/src/app/(clean-code)/(sales)/sales-book/(pages)/production-tasks/page.tsx`
- Worker sidebar route: `apps/www/src/app/(sidebar)/production/dashboard/page.tsx`
- Worker sidebar route v2: `apps/www/src/app/(sidebar)/production/dashboard/v2/page.tsx`

## Shared UI
- Shared client shell: `apps/www/src/components/production-workspace.tsx`
- Shared list/table: `apps/www/src/components/tables/sales-production/*`
- Shared filter state: `apps/www/src/hooks/use-sales-production-filter-params.ts`

## V2 Architecture
- New package boundary: `packages/sales/src/production-v2/*`
- Route entry points delegate to dedicated v2 queries:
  - `sales.productionsV2`
  - `sales.productionDashboardV2`
  - `sales.productionOrderDetailV2`
- The v2 pages do not reuse the shared production workspace or modal flow.
- Production order interaction is moving to inline collapsible sections instead of the legacy production modal.
- Worker and admin pages are separate page compositions, but share v2 package contracts and application services.

## Core UX
- Summary cards for active queue, past due, due today, and due tomorrow
- Alert sections for today and tomorrow with direct open-to-overview actions
- Compact due-date calendar strip that applies exact-date filtering to the queue
- Search/filter panel retained from the existing production filter system
- Worker and admin routes now reuse the same workspace shell with role-specific copy

## V2 Core UX
- Worker dashboard v2 is a mobile-friendly assigned-production board with:
  - due-date cards
  - clickable month calendar
  - worker-only queue
  - inline expandable order detail
  - simplified worker queue status that favors per-order completion progress over admin assignment/status badges
  - notification-channel-backed note activity in the expanded section
- Admin productions v2 is a dedicated admin board with:
  - completed label visibility
  - expandable order detail
  - quick-assign panel scaffolded inline
- Inline detail sections are the new home for production information, notes/activity, and production actions such as submission and submission removal.
- Production items inside the expanded order now render as a responsive card grid:
  - single-column when there are 2 items or fewer
  - `lg:grid-cols-2` when there are more than 2 items
  - clicking an item injects its full detail panel directly after that visual row instead of nesting inside the card
- Worker submission entry now uses compact button-group controls:
  - quantity presets remain the primary input
  - handled assignments use LH/RH toggle selection plus quantity presets
  - large quantities still expose the combobox fallback
  - single-handle assignments auto-select the only valid handle

## Data Contract
- `sales.productions`: full/admin production queue
- `sales.productionTasks`: authenticated worker queue
- `sales.productionDashboard`: summary counts, alert buckets, and next-10-day calendar counts
- `productionDueDate`: exact queue filter used by the compact calendar
- `show`: alert preset selector for `due-today`, `due-tomorrow`, and `past-due`

## V2 Data Contract
- `sales.productionsV2`: v2 list query for worker/admin boards
- `sales.productionDashboardV2`: v2 summary counts plus label metadata including `completed`
- `sales.productionOrderDetailV2`: lazy inline detail payload for expanded order sections
- `sales.productionOrderDetailV2.items[].noteContext`: normalized note identity used by the new inbox/chat note system
- Worker scoping remains server-enforced in v2 through authenticated `workerId` injection at the router layer.
- Worker expanded-order item grids now apply a client-side safety filter too, so only production items assigned to the logged-in worker render in worker mode.
- `completed` semantics now differ by scope in the shared production list pipeline:
  - worker mode treats an order as completed only when that worker's related assignments are fully submitted
  - admin mode treats an order as completed only when total submitted production qty meets the full production qty for the order

## V2 Notes
- Order-level notes now use the newer inbox/chat note flow on the `sales_info` notification channel.
- Production item notes now use the newer inbox/chat note flow on the `sales_item_info` notification channel.
- Production item note identity is normalized from v2 detail data via:
  - `salesId`
  - `salesNo`
  - `itemId`
  - `itemControlId`
- Current caveat: production items are still keyed by string `controlUid` in sales-control, so `itemControlId` currently falls back to the numeric sales item id until the sales domain exposes a dedicated numeric item-control identifier.

## Notes
- The rebuild intentionally reuses the existing production list infrastructure instead of creating a second list system.
- The current dashboard summary is optimized around open production queue visibility and near-term due dates.
- The current v2 slice now includes a worker-focused interaction pass:
  - item-card chevrons are pinned to the top-right of each card
  - worker submission UX is optimized for fast repetitive entry
  - row-level detail expansion replaces the older nested accordion feel for production items

# Community Install Costs Table

## Overview
`/community/install-costs` manages reusable install-cost rate rows for community model and job workflows. The page now uses the restarted `tables-2` Sales Orders-style table shell instead of the old `@gnd/ui/namespace` table and per-row `InstallCostLine` component.

## Current Behavior
- Route shell uses `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, `ErrorBoundary`, `Suspense`, and `getInitialTableSettings("community-install-costs")`.
- The page keeps the existing `community.getCommunityInstallCostRates`, `community.getInstallCostRateUnits`, `community.updateInstallCostRate`, and `community.importLegacyInstallCosts` contracts.
- The table supports compact rows, table-owned scroll, virtualization, sticky columns, DnD column reorder, resize handles, persisted column visibility/sizing/order/dividers, skeletons, and empty state.
- Inline create/edit behavior is preserved inside the table. `Add New Rate` creates a draft row, existing rows can be edited from the sticky action column, and saves invalidate `community.getCommunityInstallCostRates`.
- The third column is now labeled `Unit` because it renders the rate unit, replacing the misleading old `Max Qty` label.
- Legacy import behavior is preserved when there are no modern install-cost rows and legacy v1 costs exist.

## Compact Widths
- Task: `220/420/280`, sticky left
- Cost: `108/150/120`
- Unit: `100/140/112`
- Actions: `92/120/104`, sticky right
- Row height: `48px`

## Validation
- Focused parity: `bun test apps/www/src/components/tables-2/community-install-costs/migration-parity.test.ts` passed with 5 tests / 44 assertions.
- Full restarted table parity: `bun test apps/www/src/components/tables-2` passed with 175 tests / 1714 assertions.
- Targeted Biome passed for the install-cost route/component/table files plus table settings/config.
- Broad `@gnd/www` typecheck still fails on existing baseline errors, but filtered log scan found no diagnostics for install-cost/table-setting/table-config touched paths.
- Runtime static scan excluding tests found no old `@gnd/ui/namespace`, `InstallCostLine`, `getQueryClient`, or `fetchQuery` usage in the install-cost route/runtime component paths.
- `git diff --check` passed and `apps/www/src/components/tables-2/core` stayed unchanged.

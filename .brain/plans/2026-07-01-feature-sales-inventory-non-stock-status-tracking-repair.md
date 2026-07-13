# Plan: Sales Inventory Non-Stock Status And Tracking Change Repair

## Type
Feature

## Status
Done

## Created Date
2026-07-01

## Last Updated
2026-07-02

## Intake
- Intake File: brain/intake/2026-07-01-sales-inventory-inbounds-tables-polish.md
- Intake Item: Non-stock or zero-stock sales inventory should show a non-editable inbound status, and changing future stock tracking should repair only eligible not-yet-production orders.

## Goal Or Problem
Inventory rows that are initialized as non-stock or otherwise have no stock-tracked requirement should not look like editable inbound work. Operators need a clear `Not Applicable` / `N/A` status for these rows, and later changing an inventory item from non-stock to tracked stock should not retroactively disrupt orders that already passed production or fulfillment. Orders that are still before the production/fulfillment boundary may need a reviewed repair prompt if the new stock policy creates pending inbound needs from rows that were previously treated as available/not required.

## Current Context
- Inventory owns inbound demand semantics through `brain/decisions/ADR-009-inventory-owned-inbound-demand-status.md`.
- The sales overview Inventory tab currently segments rows into `Stock | Inbounds | Non Stock` and exposes row-level tracking controls in `apps/www/src/components/sales-overview-system/tabs/inventory-tab.tsx`.
- `brain/plans/2026-06-29-sales-inventory-inbound-status-guardrails.md` already covers inventory-owned inbound status once linked inbound exists and Mark As production/fulfilled preflight, but it does not fully specify future tracking-mode changes.
- Existing inventory correctness cutover docs warn that repairs are stopped unless explicitly resumed; this plan should not trigger broad historical repair applies.

## Proposed Approach
Define an inventory policy for stock-not-required rows and stock-mode transitions. Prefer a derived display status `Not Applicable` with compact `N/A` badge for non-stock or zero-required-stock rows instead of writing `AVAILABLE`, because `AVAILABLE` implies stock is physically available. When an inventory/category stock setting changes from non-stock to tracked, run a bounded impact preview for open sales inventory rows that reference that inventory and have not passed the configured production/fulfillment boundary. If any affected order previously had available/not-required inbound state but now needs pending stock/inbound, show a repair modal listing those orders and choices before applying changes.

## Implementation Steps
- Add or extend a pure policy helper in `packages/sales` or `packages/inventory` for stock requirement display:
  - stock tracked with requirement > 0 uses normal availability/inbound status.
  - non-stock, not inventory, or zero required stock resolves to display status `not_applicable` / `Not Applicable`.
  - direct inbound edits are disabled for the not-applicable state.
- Define the lifecycle exclusion predicate for orders that are past production or fulfillment.
  - TODO: Use existing sales-control / production / fulfillment fields once identified.
  - Fulfilled, cancelled, completed-readonly, and production-passed orders should be read-only for future stock-setting effects.
- Extend inventory stock-mode/category tracking mutation flows to produce an impact preview when tracking becomes stricter.
- Build a repair modal/helper component that silently checks the preview after a stock setting change and opens only when action is required.
- Modal copy should clearly say the following orders were previously treated as not needing inbound stock, but the new tracking setting creates pending inventory requirements.
- Add explicit choices such as:
  - review in Inventory tab
  - create/keep pending demand for eligible orders
  - keep existing state for selected orders if policy allows
  - cancel
- Ensure any apply mutation uses guarded writes, exact reviewed baselines, and order-scoped `SalesHistory` audit entries.
- Ensure orders already past the lifecycle boundary are reported as skipped/read-only and are not mutated.
- Update UI badges/tooltips in sales orders and sales overview to show `Not Applicable` / `N/A` for derived non-stock status.

## Affected Files Or Areas
- `packages/inventory/src/application/inbound/inbound-demand-policy.ts`
- `packages/inventory/src/inbound-policy.ts`
- `packages/sales/src/sales-inventory-policy.ts`
- `packages/sales/src/sales-inventory-overview.ts`
- `packages/sales/src/sales-inventory-mark-as-preflight.ts`
- `apps/www/src/components/sales-overview-system/tabs/inventory-tab.tsx`
- `apps/www/src/components/sales-inbound-status-badge.tsx`
- `apps/www/src/components/forms/inventory-category-form/*`
- `apps/www/src/components/forms/inventory-products/*`
- `apps/api/src/trpc/routers/inventories.route.ts`
- `brain/features/inventory-backed-sales-fulfillment.md`
- `brain/features/order-inbound-status.md`
- `brain/api/contracts.md`
- `brain/api/endpoints.md`

## Acceptance Criteria
- Non-stock / stock-not-required sales inventory rows display `Not Applicable` or compact `N/A`, not editable `Available`.
- The not-applicable status does not create or cancel inbound demand by itself.
- Changing an inventory/category from non-stock to tracked stock does not mutate orders already past production or fulfillment.
- Eligible not-yet-production orders affected by a stricter tracking setting are detected and summarized in a repair modal.
- Repair apply choices are explicit, audited, guarded by reviewed baselines, and leave skipped read-only orders untouched.

## Test Plan
- Focused package tests for the not-applicable stock-requirement policy.
- Focused package/API tests for stock-mode transition preview and guarded apply.
- UI/component or browser verification for non-stock row badges, disabled status editing, and repair modal presentation.
- Run the narrowest relevant tests plus `bun run typecheck` if cross-package contracts change.

## Brain Update Requirements
- Update `brain/features/inventory-backed-sales-fulfillment.md`.
- Update `brain/features/order-inbound-status.md` if user-facing status vocabulary changes.
- Update `brain/api/contracts.md` and `brain/api/endpoints.md` if route payloads or procedures change.
- Update `brain/progress.md`.
- Add an ADR only if a new persisted inbound status enum/state is introduced.

## Lower-Agent Readiness
- Implementation scope is clear: Yes
- File boundaries are clear: Yes
- Acceptance criteria are observable: Yes
- Required checks are listed: Yes
- Brain update requirements are listed: Yes
- Ready for handoff: Yes

## Completion Report Requirements
Lower agent must report:
- Changed files
- Checks run
- Brain docs updated
- Unresolved issues
- Any skipped acceptance criteria

## Risks / Edge Cases
- Persisting a new status may require schema/API changes; derived display is safer unless persistence is truly needed.
- Existing orders may have mixed stock and non-stock rows, so order-level badges must avoid hiding real pending stock behind a broad N/A label.
- Repair prompts must not resume the stopped broad inventory reconciliation repair loop.

## Open Questions
- Resolved: the production/fulfillment repair boundary uses the shared sales lifecycle predicate and treats `ready_to_fulfill`, fulfillment-stage, fulfilled, and cancelled orders as skipped/read-only for future tracking-change repair previews.
- Resolved: the non-stock/zero-required display remains derived (`Not Applicable` / `N/A`) rather than a persisted inbound status enum, so it does not imply physical stock availability or mutate inbound demand by itself.
- Follow-up: any future auto-apply repair choice should remain explicit and audited; this slice intentionally added a read-only modal/check rather than a silent repair apply because the broad inventory repair loop is stopped by user request.

## Linked Task
- Task Title: Sales Inventory Non-Stock Status And Tracking Change Repair
- Task File: brain/tasks/roadmap.md

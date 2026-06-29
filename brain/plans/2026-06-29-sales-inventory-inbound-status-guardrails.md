# Plan: Sales Inventory Inbound Status Guardrails

## Type
Feature Hardening

## Status
Planned

## Created Date
2026-06-29

## Goal Or Problem
Sales inventory setup, order-level inbound status, inventory-created inbound shipments, and final production/fulfillment actions currently overlap in ways that can let operators make conflicting updates. The desired workflow is:

- Once inventory-backed inbound exists for a sale, inventory becomes the source for inbound lifecycle changes.
- The sales orders inbound column should reflect the right order-level state after inventory inbound is created.
- Orders with an old/manual `SalesOrders.inventoryStatus` but no inventory-backed setup should not silently run setup; the user must reset or override that old status first.
- Production-complete and fulfilled actions should warn when inventory-backed inbound exists and stock is not available.

## Current Context
- `SalesOrders.inventoryStatus` currently feeds the sales orders table inbound badge.
- Inventory owns inbound demand status semantics per `brain/decisions/ADR-009-inventory-owned-inbound-demand-status.md`.
- `inventories.createInboundShipmentFromDemands` creates `InboundShipment` rows and links `InboundDemand`, but does not currently guarantee `SalesOrders.inventoryStatus` is updated.
- The sales overview Inventory tab can auto-sync missing inventory rows and expose setup actions based on inventory row state.
- `SalesMenu.MarkAs` is the shared web entry point for production-complete and fulfilled actions.

## Proposed Behavior
1. **Fallback / legacy status mode**
   - If `SalesOrders.inventoryStatus` is set but no inventory-backed line items or linked inbound demand exist, the Inventory tab should not auto-configure.
   - Show a locked state explaining that the order has a legacy/manual inbound status.
   - Offer explicit actions:
     - `Reset inbound status and configure inventory`
     - `Override and configure inventory`
     - `Cancel`

2. **Inventory inbound owns status after creation**
   - Creating inventory inbound should update `SalesOrders.inventoryStatus` to `ORDERED`.
   - After inventory inbound exists, normal direct title/status update should be blocked for that order.
   - Clicking the inbound status badge should open the linked inventory inbound surface so status changes happen there.
   - Orders without inventory-backed inbound may continue using the single status update flow.

3. **Production / fulfilled guard**
   - When `Mark as > Production completed` or `Mark as > Fulfilled` is selected, check sale inventory state first.
   - If inventory is configured and any required inventory is not available/covered, show a shadcn alert dialog.
   - Actions:
     - `Mark all as available and continue`
     - `Cancel`
   - Continuing should use an explicit mutation that safely resolves selected mutable demand/availability state before triggering the existing mark-as task.

## Detailed Execution Plan

### Phase 1: Domain Policy And Contracts
1. Add a pure sales/inventory guard helper in the shared domain layer, preferably under `packages/sales` or `packages/inventory` depending on ownership:
   - Input: sale id/status, `SalesOrders.inventoryStatus`, inventory line count, linked inbound count, demand summary, readiness.
   - Output: `inventorySetupMode` such as `active`, `legacy_status_locked`, `completed_readonly`, `not_configured`, `needs_inventory_attention`.
2. Extend `inventories.salesInventoryOverview` to return guard metadata:
   - `setupMode`
   - `canConfigureInventory`
   - `requiresLegacyStatusReset`
   - `hasInventoryInbound`
   - `linkedInboundIds`
   - `blockingReason`
3. Add focused package tests for:
   - no status + no inventory rows => configurable
   - `PENDING ORDER` / `ORDERED` / `AVAILABLE` + no inventory rows => locked until reset/override
   - linked inbound exists => inventory-owned status mode
   - fulfilled/production-complete sale => read-only or repair-only mode

### Phase 2: Inventory Inbound Creation Updates Sales Order Status
1. Update the create-inbound-from-demand service so the same transaction:
   - creates `InboundShipment`
   - links eligible `InboundDemand` rows
   - updates all affected `SalesOrders.inventoryStatus` values to `ORDERED`
2. Add a result payload field such as `updatedSalesOrderCount` for UI/audit feedback.
3. Ensure idempotent/retry behavior:
   - linked demand already ordered should not double-count or fail
   - completed/closed/cancelled inbound histories should not reopen demand
4. Update API contract docs after implementation.
5. Tests:
   - creating inbound for one sale updates that sale to `ORDERED`
   - creating inbound spanning multiple sales updates each affected sale
   - cancelled/deleted demand is ignored
   - existing linked inbound is not duplicated

### Phase 3: Split Direct Status Update From Inventory-Owned Status
1. Find every direct order inbound status update entry point:
   - sales orders table inbound badge/modal
   - sales overview side-sheet inbound status badge
   - legacy notes/inbound status mutation paths
2. Add a preflight query or enrich existing row DTOs with:
   - `hasInventoryInbound`
   - `linkedInboundIds`
   - `canUseManualInboundStatus`
3. UI behavior:
   - If no inventory inbound: keep the existing single status update flow.
   - If inventory inbound exists: disable direct status edit and make the badge/link open the inventory inbound detail instead.
4. Route behavior:
   - Clicking the inbound badge should open the sales overview Inventory tab `INBOUNDS` segment when inside a sale context, or `/sales-book/inbounds` / `/inventory/inbounds` with the inbound selected from table contexts.
5. Server-side safety:
   - Direct status mutation should reject or return a typed error when inventory inbound exists, unless a privileged override flag is supplied.
6. Tests:
   - table row with linked inbound opens inbound detail instead of status modal
   - manual status modal still works for orders without linked inbound
   - direct mutation guard prevents stale UI from bypassing the rule

### Phase 4: Inventory Tab Legacy Status Lock And Override
1. Update `SalesOverviewInventoryContent` to read the new guard metadata.
2. If `setupMode === "legacy_status_locked"`:
   - do not auto-sync inventory
   - do not render `Create inbound`, allocation, or tracking edits
   - render an explanatory empty/locked state
3. Add explicit actions:
   - `Reset inbound status and configure inventory`: clears `SalesOrders.inventoryStatus`, runs inventory sync, then opens the workbench.
   - `Override and configure inventory`: records an audit note, applies inventory sync, and transitions to inventory-owned mode.
4. Keep the fallback conservative:
   - `AVAILABLE` should not cancel shortage demand broadly.
   - Existing ADR-009 selected-demand rules should be used for any line-scoped cleanup.
5. Tests:
   - auto-sync does not run while locked
   - reset clears order status before sync
   - override records/audits and enables inventory setup
   - fulfilled/completed read-only state does not expose setup controls

### Phase 5: Mark As Production/Fulfilled Inventory Guard
1. Add a preflight call used by `SalesMenu.MarkAs` before triggering production-complete or fulfilled tasks:
   - sale id(s)
   - target action: `production_completed` or `fulfilled`
   - inventory configured?
   - any active inbound/backorder/pending demand?
   - any required stock row not available/allocated/received?
2. If no blockers: continue existing task flow unchanged.
3. If blockers exist: show a shadcn `AlertDialog` with concise row summary:
   - total blocked orders
   - pending/inbound qty
   - linked inbound status
4. Dialog actions:
   - `Cancel`
   - `Mark all as available and continue`
5. Implement the continue path as a server mutation:
   - only operates on eligible mutable demand rows
   - updates `SalesOrders.inventoryStatus` to `AVAILABLE` where valid
   - does not downgrade received/partially received or shipment-linked demand incorrectly
   - then triggers the existing mark-as task
6. Tests:
   - no inventory rows: normal mark-as behavior preserved
   - configured inventory with pending inbound: dialog appears
   - cancel does not trigger task
   - continue marks eligible demand/order state and triggers task
   - batch selected orders summarize blockers correctly

### Phase 6: Status Display And Navigation Polish
1. Update sales orders inbound column:
   - Continue showing manual `AVAILABLE` / `ORDERED` / `PENDING ORDER` when no inventory inbound exists.
   - For inventory-owned rows, show a distinct label such as `Inbound #123`, `In progress`, `Received`, or `Issue open` from linked inbound shipment status.
2. Add tooltip text explaining the source:
   - `Manual order status`
   - `Inventory inbound status`
3. Update sales overview header/status badge similarly.
4. Ensure status click targets:
   - single linked inbound: open that inbound directly
   - multiple linked inbounds: open Inventory tab `INBOUNDS` segment with all visible
5. Browser validation:
   - manual-only order
   - order with newly created inbound
   - order with multiple linked inbounds
   - order after inbound received/completed
   - order with legacy status but no inventory rows

### Phase 7: Documentation, Backfill, And Release
1. Add/update Brain docs:
   - `brain/features/inventory-backed-sales-fulfillment.md`
   - `brain/api/contracts.md`
   - `brain/api/endpoints.md` if endpoints change
   - ADR addendum only if ownership semantics change beyond ADR-009
2. Add a small migration/backfill script only if needed:
   - Detect linked inbound demand where `SalesOrders.inventoryStatus` is null or stale.
   - Dry-run first; apply only after reviewed counts.
3. Release order:
   - land domain/API tests first
   - land UI guard second
   - land Mark As guard third
   - run browser validation last

## Acceptance Criteria
- Creating inventory inbound automatically sets affected sales orders to `ORDERED`.
- Direct inbound status editing is disabled for orders that have inventory-backed inbound; clicking the status opens the inventory inbound view instead.
- Orders with a legacy/manual `inventoryStatus` but no inventory-backed configuration do not auto-configure inventory without reset/override.
- Production-complete and fulfilled actions prompt when configured inventory has unresolved inbound/unavailable stock.
- `Mark all as available and continue` is explicit, audited, and respects inventory-owned selected-demand mutability rules.
- Existing single status update remains available for orders that have not entered inventory-backed inbound.

## Validation Plan
- Focused package tests for guard helper and inbound demand/status policy.
- Focused API tests for inbound creation, manual status guard, and mark-as preflight.
- Focused UI/component tests or import checks for sales overview Inventory tab and SalesMenu guard.
- Browser validation through saved sales overview and sales orders table fixtures.
- Run `bun run typecheck` or the narrowest relevant package/app typechecks when implementation is complete.

## Brain Update Requirements
- Update `brain/features/inventory-backed-sales-fulfillment.md`.
- Update `brain/api/contracts.md` for changed DTO/procedure payloads.
- Update `brain/api/endpoints.md` if new procedures are added.
- Update `brain/progress.md`.

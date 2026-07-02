# Plan: Sales Inventory Inbound Status Guardrails

## Type
Feature Hardening

## Status
In Progress

## Created Date
2026-06-29

## Implementation Notes
- 2026-06-30: Phase 3 UI/data slice started. `sales.getSaleOverview` now returns `inventoryInboundOwnership` for orders, and sales overview inbound status badges/detail rows route inventory-owned inbound work to the Inventory tab's `Inbounds` segment. Remaining Phase 3 work includes sales orders table inbound-column click-through, general inbound workspace selected-row navigation, and browser validation.
- 2026-06-30: Phase 3 list/workspace slice continued. `sales.getOrders` and `sales.inboundIndex` now expose the same `inventoryInboundOwnership` object. Canonical sales order inbound cells keep manual status editing for non-inventory-owned rows, show `Inbound #...` for inventory-owned rows, and route inventory-owned clicks to the Inventory/Inbounds segment; inbound-management row actions now use the same rule. Remaining Phase 3 work is browser validation and any selected-inbound deep-link polish beyond opening the Inbounds segment.
- 2026-06-30: Phase 6 selected-inbound polish added. The Inventory tab now accepts `inventoryInboundId` for its `Inbounds` segment, single-linked inbound clicks pass the exact inbound id, and creating inbound from the Inventory tab switches directly to the newly created inbound detail. Remaining work is browser validation with manual-only, single-linked, multi-linked, and received/completed examples.
- 2026-06-30: Phase 6 status-display polish started. `inventoryInboundOwnership` now carries compact linked inbound shipment summaries plus `primaryInboundStatus`; sales overview headers/details, canonical sales orders, and inbound-management list rows show the linked shipment status label for inventory-owned inbound rows while keeping manual order status labels for manual-only rows. Remaining work is browser validation and any tooltip wording polish.
- 2026-06-30: Phase 6 source/ownership polish continued. The shared `inventoryInboundOwnership` helper now ignores deleted shipment items and deleted/cancelled inbound shipments, and `notes.saveInboundNote` uses that same helper before rejecting manual order-status edits. UI titles now label the source as `Inventory inbound status` or `Manual order status`. Remaining work is browser validation with manual-only, active-linked, cancelled-linked, multi-linked, and received/completed examples.
- 2026-06-30: Phase 7 dry-run preview added. `inventories.salesInventoryInboundStatusBackfillPreview` returns bounded samples of active inventory-owned inbound orders whose legacy `SalesOrders.inventoryStatus` is null or not `ORDERED`, including linked ownership summaries and cursor metadata. Remaining Phase 7 work is reviewing preview counts and adding an explicit reviewed repair/backfill path only if needed.
- 2026-06-30: Phase 7 reviewed repair path added. `inventories.repairSalesInventoryInboundStatusBackfill` defaults to dry-run and only repairs explicit reviewed `salesOrderIds`; apply mode revalidates active inventory-owned inbound ownership and stale legacy status, sets matched orders to `ORDERED`, writes `SalesHistory` audit rows, and returns post-run remaining mismatch candidates for apply evidence. Remaining Phase 7 work is operator preview review, optional apply run evidence, and browser/API validation under real data.
- 2026-07-01: Phase 7 apply evidence tightened. The reviewed repair result now returns post-run `remainingMismatchCount` and `remainingCandidates` for both dry-run and apply responses, so a reviewed apply can prove which requested rows still need attention after revalidation or concurrent changes.
- 2026-07-01: Phase 7 repair result status added. The reviewed repair response now includes `status=clean|needs_backfill`, matching the preview status vocabulary so operator tooling can check the final reviewed set without deriving state from counts.
- 2026-07-01: Phase 7 skipped evidence added. The reviewed repair response now returns `skippedSalesOrderReasons` with classified initial reasons (`already_ordered`, `missing_or_ineligible_order`, `no_active_inventory_inbound`, fallback `not_matching_candidate`) and `changed_before_apply` for rows that fail mutation-time revalidation.
- 2026-07-01: Shared inbound ownership ID sanitization aligned. `getSalesInventoryInboundOwnershipMap` now reuses the positive-integer sales order id sanitizer used by the reviewed backfill path, keeping overview/list/manual-status ownership checks from querying decimal or otherwise invalid ids.
- 2026-07-01: Phase 7 preview count evidence tightened. `inventories.salesInventoryInboundStatusBackfillPreview` now returns global `totalMismatchCount` in addition to page-level `sampledMismatchCount`, and preview `status` reflects the global count so operators can review the full stale scope before applying explicit IDs.
- 2026-07-01: Phase 7 candidate predicate centralized. Preview samples, preview total count, reviewed candidate lookup, and mutation-time apply revalidation now share the same stale active inventory-owned inbound order predicate to reduce drift between dry-run evidence and apply behavior.
- 2026-07-01: Phase 7 reviewed repair apply guard tightened again under the July 1 cutover plan. Apply writes now also require the exact reviewed legacy `SalesOrders.inventoryStatus` baseline, so concurrent stale-to-stale changes are skipped as `changed_before_apply` and do not receive audit history with an older pre-read status.
- 2026-07-01: Inbound cancellation demand cleanup added. `inventories.updateInboundShipmentStatus` now releases unreceived active demand rows from a cancelled inbound shipment back to unassigned `pending` demand, recomputes affected components, and records release/recompute counts in activity metadata and the mutation response.
- 2026-07-01: Inbound cancellation cleanup coverage added. Focused `packages/inventory` tests now cover releasing unreceived active demand from a cancelled inbound shipment, recomputing touched components once, and no-op behavior when no eligible demand is linked.
- 2026-07-01: Inbound cancellation cleanup made atomic. Cancelling an inbound shipment now updates the shipment status and releases linked unreceived active demand in one transaction, preventing partial cancellation state if cleanup fails.
- 2026-07-01: Sales inventory inbound creation made atomic with legacy status sync. `inventories.createInboundShipmentFromDemands` now performs the parent-sale guard, selected demand preparation/splitting, inbound shipment creation, demand linking, and affected `SalesOrders.inventoryStatus=ORDERED` update in one transaction before writing activity evidence.
- 2026-07-01: Mark As availability resolution audit evidence added. `inventories.resolveSalesInventoryMarkAsAvailabilityForContinue` now writes order-scoped `SalesHistory` rows when it cancels safe mutable demand and sets affected orders to `AVAILABLE`, and returns `auditHistoryCount`.
- 2026-07-01: Mark As continue mutation-time revalidation tightened. Orders are now set to `AVAILABLE` and audited only when their mutable demand rows still pass the final transaction-time safety filter; stale preview blockers that changed before apply remain blocked by the remaining preflight.
- 2026-07-01: Mark As continue apply evidence confirmed from persisted rows. The continue mutation now stamps cancelled demand with a per-mutation operation note and derives recompute, order-status updates, audit rows, and `cancelledDemandCount` only from rows confirmed changed by that apply.
- 2026-07-01: Create-inbound retry idempotency tightened. `createInboundShipmentFromDemands` now plans shipment quantity only from active unassigned demand rows and fails before creating a shipment when every requested demand row is already linked to an inbound shipment item.
- 2026-07-01: Existing-inbound demand assignment retry idempotency tightened. `assignInboundDemandsToShipment` now uses the same active unassigned-demand rule, so retries or already-linked demand rows cannot inflate existing inbound shipment item quantities.
- 2026-07-01: Inbound demand linking evidence tightened. Create-inbound and existing-inbound assignment now add shipment item quantity only for demand rows whose guarded link write succeeds; create-inbound soft-deletes empty direct-service artifacts and fails if no rows link after a race.
- 2026-07-01: Inbound demand link writes for create-inbound and existing-inbound assignment now require the pre-read `qtyReceived` baseline, preventing concurrently received demand rows from contributing stale outstanding quantity to inbound item plans.
- 2026-07-01: Create-inbound item quantity commits now use the same parent inbound active-state guard as existing-inbound assignment, preventing confirmed links from committing quantity into a newly-created inbound that concurrently became closed, cancelled, or deleted.
- 2026-07-01: Zero-link cleanup for newly-created inbound items and empty newly-created inbound shipments now uses the same parent active-state guard, preventing cleanup writes from touching an inbound that became closed, cancelled, or deleted after the link race.
- 2026-07-01: Confirmed demand-link IDs now drive API orchestration. Create-inbound uses package-confirmed linked demand ids for legacy `SalesOrders.inventoryStatus=ORDERED` sync and activity order references, and existing-inbound assignment uses the same confirmed ids for timeline order references.
- 2026-07-01: Existing-inbound assignment made atomic at the API boundary. `inventories.assignInboundDemands` now runs package assignment inside a transaction so demand links and inbound item quantity updates commit together before timeline activity is written.
- 2026-07-01: Existing-inbound assignment item quantity updates now use atomic increments for existing shipment item rows, based only on demand rows confirmed linked by guarded writes.
- 2026-07-01: Existing-inbound assignment now rejects deleted, closed, or cancelled target inbound shipments before demand lookup or link writes begin.
- 2026-07-01: Existing-inbound assignment item quantity commits are now guarded by parent inbound status/deletion state, preventing confirmed demand links from committing quantity into an inbound that concurrently became closed, cancelled, or deleted.
- 2026-07-01: Existing-inbound no-op assignment now fails after guarded revalidation. If all candidate rows are concurrently claimed before assignment links them, the package raises the same no-confirmed-link error as create-inbound and cleans up any empty newly-created shipment item.
- 2026-07-01: Inbound receiving retry/status handling tightened. Receive mutations now run in one API transaction, preserve existing completion timestamps on duplicate receives, and keep `issue_open` when a retry sees existing open item issues.
- 2026-07-01: Duplicate inbound receive attempts no longer rewrite shipment item quantity or unit-price fields when the receive payload has no new good/issue delta, keeping repeat receives as status/progress recomputation only.
- 2026-07-01: Inbound cancellation recompute evidence tightened. Cancel cleanup now returns without recomputing components when candidate demand rows are found but the guarded release updates zero rows.
- 2026-07-01: Inbound cancellation recompute evidence now follows confirmed per-demand release rows, so partially stale cancellation cleanup recomputes only components whose demand rows were actually released.
- 2026-07-01: Line-item component demand recompute now reads and updates only active component rows, and skipped component update guards no longer count as recompute evidence.
- 2026-07-01: Explicit receive item lists no longer auto-receive omitted rows. The receive service keeps legacy receive-all behavior only when `items` is omitted, while `items: []` or a subset preserves persisted quantities for omitted shipment items.
- 2026-07-01: Explicit receive item ids are now validated against the target shipment. Stale or cross-shipment item ids fail before stock, demand, item, or shipment status writes.
- 2026-07-01: Explicit receive payloads now reject duplicate item ids before planning receipt deltas, avoiding silent last-row-wins behavior from map normalization.
- 2026-07-01: Inbound receipt deltas are now capped at planned item quantity. The planner preserves already-persisted received totals but prevents new good/issue deltas from increasing total received beyond the inbound item plan.
- 2026-07-01: Inbound receipt deltas now require guarded item-row commit evidence before stock, movement, issue, demand, or component writes run. If the persisted good/issue baseline changed first, the item is skipped and downstream receive writes do not run from the stale snapshot.
- 2026-07-01: Existing stock row updates during inbound receive now use atomic increments, and stock movement evidence uses the returned post-increment quantity for its current/previous quantity pair.
- 2026-07-01: Existing stock row increments during inbound receive now also require the stock row to remain active for the same variant/supplier at commit time; stale or deleted stock rows fail before movement/log evidence is written.
- 2026-07-01: Inbound demand receipt updates now use guarded baseline/status writes. Stale skipped demand rows no longer consume the new received quantity, and component recompute evidence is limited to demand rows confirmed changed by the receive.
- 2026-07-01: Receive mutations now reject already-terminal or deleted inbound shipments before receipt writes, and the final shipment status update is guarded so concurrent close/cancel/delete changes are not overwritten.
- 2026-07-01: Inbound lifecycle status mutations now guard the status update by non-deleted row and previously observed status before writing activity or running cancellation cleanup, preventing stale status controls from overwriting concurrent lifecycle changes.
- 2026-07-01: Manual order prompt demand mutation now requires unassigned demand for `ORDERED`, `PENDING ORDER`, and selected `AVAILABLE` updates, preventing legacy prompt saves from relabeling shipment-linked inventory-owned demand.
- 2026-07-01: Manual order prompt demand mutation now also requires `qtyReceived=0` for `ORDERED`, `PENDING ORDER`, and selected `AVAILABLE` updates, preventing legacy prompt saves from relabeling or cancelling received inventory-owned demand.
- 2026-07-01: Inbound cancellation demand release now scopes both candidate lookup and guarded release writes through the cancelled parent inbound shipment, preventing direct helper misuse or stale cleanup from releasing demand attached to an active inbound.
- 2026-07-01: The shared `canOrderInboundPromptMutateDemand` policy helper now also treats any positive `qtyReceived` as non-mutable, keeping future prompt callers aligned with the `notes.saveInboundNote` mutation filter.
- 2026-07-01: The manual inbound-status modal now passes demand `qtyReceived` into `canOrderInboundPromptMutateDemand`, and the policy input requires that field so future callers cannot silently omit the received-demand guard.
- 2026-07-01: The shared `canOrderInboundPromptMutateDemand` policy helper now blocks shipment-linked demand for all prompt statuses, matching the server mutation filter's `inboundShipmentItemId=null` guard for `AVAILABLE`, `ORDERED`, and `PENDING ORDER`.
- 2026-07-01: The shared prompt mutability helper now treats any non-null `inboundShipmentItemId` as linked demand, matching the server filter exactly instead of relying on truthiness.

## Goal Or Problem
Sales inventory setup, order-level inbound status, inventory-created inbound shipments, and final production/fulfillment actions currently overlap in ways that can let operators make conflicting updates. The desired workflow is:

- Once inventory-backed inbound exists for a sale, inventory becomes the source for inbound lifecycle changes.
- The sales orders inbound column should reflect the right order-level state after inventory inbound is created.
- Orders with an old/manual `SalesOrders.inventoryStatus` but no inventory-backed setup should not silently run setup; the user must reset or override that old status first.
- Production-complete and fulfilled actions should warn when inventory-backed inbound exists and stock is not available.

## Current Context
- `SalesOrders.inventoryStatus` currently feeds the sales orders table inbound badge.
- Inventory owns inbound demand status semantics per `brain/decisions/ADR-009-inventory-owned-inbound-demand-status.md`.
- `inventories.createInboundShipmentFromDemands` creates `InboundShipment` rows, links `InboundDemand`, and now commits affected `SalesOrders.inventoryStatus=ORDERED` updates in the same transaction.
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

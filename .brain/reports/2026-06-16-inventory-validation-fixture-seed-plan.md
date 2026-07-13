# Inventory Validation Fixture Seed Plan

## Status
Ready for DB-backed fixture preparation

## Date
2026-06-16

## Purpose
Define the controlled local/staging data set needed before rerunning the inventory-backed sales browser mutation matrix.

This plan complements:
- `brain/reports/2026-06-15-inventory-browser-validation-readiness.md`
- `brain/reports/2026-06-15-inventory-browser-validation-evidence.md`
- `bun run inventory:validation-fixtures`
- `bun run inventory:validation-fixtures --seed-checklist`
- `bun run inventory:validation-fixtures --seed-blueprint`
- `bun run inventory:seed-stock-fixtures`

## Safety Rules
- Do not seed or mutate production for receiving, dispatch, stock adjustment, or fulfillment proof.
- Use a local or approved staging database with disposable fixture sales and variants.
- Prefer a small number of clearly named fixture orders so evidence can record stable order IDs.
- Run `bun run inventory:validation-fixtures` before and after fixture setup.
- Use `bun run inventory:validation-fixtures --seed-checklist` to turn the live preflight result into grouped setup actions before manually creating or identifying fixture data.
- Use `bun run inventory:validation-fixtures --seed-blueprint` to review the read-only row families, status values, validation predicates, and rollback order before converting the plan into any DB-mutating seed.
- Use `bun run inventory:seed-stock-fixtures` for a default dry-run of the stock-only fixture seed (`INV-FIX-STOCK-LOW` and `INV-FIX-STOCK-SAFE`). Only run `bun run inventory:seed-stock-fixtures --apply` against a local or approved staging database.
- Use `bun run inventory:seed-allocation-fixture` for a default dry-run of the allocation lifecycle fixture seed (`INV-FIX-ALLOC`). Only run `bun run inventory:seed-allocation-fixture --apply` against a local or approved staging database.
- Use `bun run inventory:seed-inbound-fixture` for a default dry-run of the inbound demand/receiving fixture seed (`INV-FIX-INBOUND`). Only run `bun run inventory:seed-inbound-fixture --apply` against a local or approved staging database.
- Use `bun run inventory:seed-received-fixture` for a default dry-run of the received inbound backorder fixture seed (`INV-FIX-RECEIVED`). Only run `bun run inventory:seed-received-fixture --apply` against a local or approved staging database.
- Use `bun run inventory:seed-partial-fixture` for a default dry-run of the available/held partial shipment fixture seed (`INV-FIX-PARTIAL`). Only run `bun run inventory:seed-partial-fixture --apply` against a local or approved staging database.
- Keep each mutation path reversible or disposable; do not reuse real customer orders unless explicitly approved.
- Stop and record a fix plan if receiving, allocation, dispatch, or stock adjustment creates duplicate movements.

## Minimal Fixture Set

The preflight report requires 11 readiness categories. A compact seed set can cover them with four fixture orders plus two monitored variants:

| Seed ID | Fixture Purpose | Covers Preflight Categories | Primary Workspace |
| --- | --- | --- | --- |
| `INV-FIX-ALLOC` | Inventory-backed sale with three pending-review allocations, two approved allocations, two reserved allocations, and picked allocations across safe lines/components | pending allocation review, dispatch assignable allocation, dispatch packable allocation, dispatch fulfillable allocation | `/inventory/allocations`, `/inventory/dispatch-mode` |
| `INV-FIX-INBOUND` | Inventory-backed sale blocked by missing required component with open demand and receiveable inbound shipment | open inbound demand, inbound receiving shipment | `/inventory/inbounds` |
| `INV-FIX-RECEIVED` | Backordered sale line with received inbound demand not yet allocated to the line | received inbound backorder | `/inventory/backorders` |
| `INV-FIX-PARTIAL` | Sale line with partial available quantity and hold-until-complete metadata on one line | partial shipment available, held partial shipment | `/inventory/partial-shipments` |
| `INV-FIX-STOCK-LOW` | Monitored inventory variant at or below low-stock threshold | low-stock variant | `/inventory/variants` |
| `INV-FIX-STOCK-SAFE` | Monitored inventory variant safe for manual stock add/remove/return/correction proof | safe stock adjustment variant | `/inventory/stocks` |

## Fixture Shapes

### `INV-FIX-ALLOC`
Create one inventory-backed sale with mapped `LineItem` / `LineItemComponents` rows and stock allocations in each lifecycle state:
- three `pending_review` allocations: validates allocation approve, reject, and bulk actions without consuming the only pending sample.
- two `approved` allocations: validates dispatch assign without stealing the only approved row that may also prove partial shipment availability in thin data sets.
- two `reserved` allocations: validates dispatch pack and release without consuming the same reserved row.
- `picked`: validates dispatch fulfill and release.

Required evidence after setup:
- `inventories.inventoryBrowserValidationFixtureReport` counts:
  - at least three for `pending_allocation_review`
  - at least two for `dispatch_assignable_allocation`
  - at least two for `dispatch_packable_allocation`
  - at least one for `dispatch_fulfillable_allocation`
- Samples include order/sale, line item, inventory item, variant, status, and quantity.

### `INV-FIX-INBOUND`
Create one sale line/component that is short on a required inventory component and has an open `InboundDemand`:
- demand status should be `pending` or `ordered`
- demand should be attached to a mapped `LineItemComponent`
- one `InboundShipment` should contain a receiveable item for the same variant

Required evidence after setup:
- `open_inbound_demand >= 1`
- `inbound_receiving_shipment >= 1`
- `/inventory/inbounds` can open the shipment and receive a partial/full quantity.

### `INV-FIX-RECEIVED`
Create or reuse a backordered line where inbound demand has been received but not allocated/released to the sale:
- `InboundDemand.qtyReceived > 0`
- related line still has remaining/backordered quantity
- a real positive `InventoryStock` row exists for the same received variant, otherwise `allocateReceivedInboundToBackorders` correctly skips the demand because there is no stock to reserve
- allocation/release action is safe to run once

Required evidence after setup:
- `received_inbound_backorder >= 1`
- `/inventory/backorders` can allocate received inbound stock and update remaining/backordered quantities.

### `INV-FIX-PARTIAL`
Create a partially available line where available quantity is less than remaining quantity:
- one line should be ship-available without hold
- one line should have `LineItem.meta.fulfillment.holdUntilComplete = true`
- each fixture line should have a linked legacy `SalesOrderItems` row through `LineItem.salesItemId`, otherwise `shipAvailableSalesInventory` cannot write `OrderItemDelivery` compatibility rows
- stock/allocation state should allow proving held lines are skipped until complete

Required evidence after setup:
- `partial_shipment_available >= 1`
- `held_partial_shipment >= 1`
- `partial_shipment_available` samples should not include `holdUntilComplete=true` lines; held rows are validated through `held_partial_shipment`.
- if `held_partial_shipment` reports incomplete count diagnostics, record the scan/candidate counts in the evidence worksheet.

### `INV-FIX-STOCK-LOW`
Create or identify a monitored variant:
- inventory/category stock mode resolves to `monitored`
- `InventoryVariant.lowStockAlert` is set
- current summed `InventoryStock.qty <= lowStockAlert`

Required evidence after setup:
- `low_stock_variant >= 1`
- operations dashboard shows a low-stock alert after refresh.
- if low-stock reports incomplete count diagnostics, record the scan/candidate counts.

### `INV-FIX-STOCK-SAFE`
Create or identify a monitored variant reserved for manual stock operations:
- not tied to a real customer fulfillment commitment
- has at least one non-deleted positive-stock row, with enough current stock for remove/return/correction proof or enough room to safely receive a small add-stock action first
- variant and inventory names clearly indicate validation fixture usage

Required evidence after setup:
- `safe_stock_adjustment_variant >= 1`
- `/inventory/stocks` can run add/remove/return/correction proof with reason codes.

## Recommended Setup Sequence
1. Start with fixture inventory items and variants: dry-run `bun run inventory:seed-stock-fixtures`, then apply only on local/approved staging when ready.
2. Create or sync fixture sales so each has inventory-backed `LineItem` rows.
3. Seed allocations for `INV-FIX-ALLOC`: dry-run `bun run inventory:seed-allocation-fixture`, then apply only on local/approved staging when ready.
4. Seed demand and shipment for `INV-FIX-INBOUND`: dry-run `bun run inventory:seed-inbound-fixture`, then apply only on local/approved staging when ready.
5. Seed received demand/backorder state for `INV-FIX-RECEIVED`: dry-run `bun run inventory:seed-received-fixture`, then apply only on local/approved staging when ready.
6. Seed partial shipment and hold state for `INV-FIX-PARTIAL`: dry-run `bun run inventory:seed-partial-fixture`, then apply only on local/approved staging when ready.
7. Run `bun run inventory:validation-fixtures --seed-checklist` and review the grouped setup actions it prints.
8. Run `bun run inventory:validation-fixtures --seed-blueprint` and convert the row families into a reviewed local/staging seed only after checking rollback order.
9. Run `bun run inventory:validation-fixtures --json` or `bun run inventory:validation-fixtures --markdown`.
10. Run `bun run inventory:validation-fixtures --completion-gate` to confirm the Pending 15 evidence gates, pending phase groups, and browser run rows are ready before the approval-gated browser pass.
11. Run `bun run inventory:validation-fixtures --evidence-template` and use its `Run`, `Use Sample`, `Compare Fields`, `Expected Delta`, and `Guard` columns as the browser mutation worksheet.
12. Copy the summary, missing categories, diagnostics, and sample IDs into `brain/reports/2026-06-15-inventory-browser-validation-evidence.md`.
13. Run `bun run inventory:validation-fixtures --mutation-snapshot` before browser mutation validation to capture exact row state.
14. Run browser mutation validation only after the preflight reports `status: ready`.
15. Run `bun run inventory:validation-fixtures --mutation-snapshot` again after browser mutation validation and compare allocation statuses, inbound quantities, line projections, stock rows, and delivery compatibility rows.
16. In the mutation snapshot, start with the `Primary Proof Target Index`, then use its `compareFields` and `expectedDelta` guidance plus `proofTarget` and `primaryProof=yes` in the detail tables to separate the worksheet's primary browser-proof rows from legacy seed rows and alternate/recovery candidates; allocation and inbound rows also expose `proofRole` for lower-level lifecycle auditing.

## Completion Gate
Fixture setup is complete only when:
- `bun run inventory:validation-fixtures` reports `status: ready`
- every fixture row has at least one safe sample
- incomplete count diagnostics, if present, are recorded and accepted for the validation pass
- fixture order/variant IDs are recorded in the evidence worksheet
- before/after `--mutation-snapshot` outputs are attached to the evidence worksheet for any browser mutation pass
- browser mutation validation has not yet consumed or invalidated the only available sample for another required action

## Applied Local Fixture Evidence
- `2026-06-16`: `bun run inventory:seed-stock-fixtures --apply` created the stock-only local validation fixtures.
- `INV-FIX-STOCK-LOW`: category id `21`, item id `600`, variant id `2065`, stock id `1`, stock qty `0`, low-stock threshold `5`.
- `INV-FIX-STOCK-SAFE`: category id `22`, item id `601`, variant id `2066`, stock id `2`, stock qty `10`, low-stock threshold `2`.
- `bun run inventory:validation-fixtures --markdown` then reported `2/11` ready and `9` missing. Remaining seed groups: `INV-FIX-ALLOC`, `INV-FIX-INBOUND`, `INV-FIX-RECEIVED`, and `INV-FIX-PARTIAL`.
- `bun run inventory:seed-stock-fixtures --rollback` dry-ran the cleanup path and confirmed it would soft-delete stock, variant, item, and category rows in dependency order. Rollback was not applied.
- `2026-06-16`: `bun run inventory:seed-allocation-fixture --apply` created the allocation lifecycle validation fixture.
- `INV-FIX-ALLOC`: category id `23`, item id `602`, variant id `2067`, stock id `3`, sale id `23024`, line id `20`, line component id `116`, allocation ids `1`-`4` for the first `pending_review`, `approved`, `reserved`, and `picked` fixture rows.
- Follow-up requirement tightened the `pending_allocation_review` fixture to require three pending rows, one each for approve/reject/bulk proof. Rerun `bun run inventory:seed-allocation-fixture --apply` to repair older local fixture sets that only have one pending allocation.
- `2026-06-16`: rerunning `bun run inventory:seed-allocation-fixture --apply` repaired `INV-FIX-ALLOC` with distinct pending review approve/reject/bulk ids `7`/`8`/`9`, dispatch assign id `10`, and dispatch fulfill id `12`. A later dispatch-capacity repair added spare dispatch candidates: approved id `13` plus reserved ids `14`/`15`. A follow-up dry-run reported all current allocation proof rows unchanged.
- Current `INV-FIX-ALLOC` browser samples are pending review ids `7`/`8`/`9`, approved ids `10`/`13`, reserved ids `11`/`14`/`15`, and picked id `12`; older allocation ids can still appear in aggregate readiness counts until the fixture group is rolled back/reseeded.
- The allocation line quantity is `3`, matching the three active dispatch states (`approved`, `reserved`, `picked`) so complete dispatch allocation does not falsely satisfy the partial-shipment fixture. Pending review rows remain separate review-state allocations.
- `bun run inventory:validation-fixtures --markdown` then reported `6/11` ready and `5` missing. Remaining seed groups: `INV-FIX-INBOUND`, `INV-FIX-RECEIVED`, and `INV-FIX-PARTIAL`.
- `bun run inventory:seed-allocation-fixture --rollback` dry-ran cleanup and confirmed it would soft-delete stock allocations, line item, subcomponent, stock, variant, sale, item, and category rows, while cancelling `LineItemComponents` because that table has no `deletedAt`. Rollback was not applied.
- `2026-06-16`: `bun run inventory:seed-inbound-fixture --apply` created the inbound demand/receiving validation fixture.
- `INV-FIX-INBOUND`: supplier id `7`, category id `24`, item id `603`, variant id `2068`, sale id `23025`, line id `21`, line component id `117`, inbound shipment id `1`, shipment item id `1`, inbound demand id `1`, demand status `ordered`.
- `bun run inventory:validation-fixtures --markdown` then reported `8/11` ready and `3` missing. Remaining seed groups: `INV-FIX-RECEIVED` and `INV-FIX-PARTIAL`.
- `bun run inventory:seed-inbound-fixture --rollback` dry-ran cleanup and confirmed it would soft-delete inbound demand, shipment item, shipment, line item, subcomponent, variant, sale, item, category, and supplier rows, while cancelling `LineItemComponents` because that table has no `deletedAt`. Rollback was not applied.
- `2026-06-16`: `bun run inventory:seed-received-fixture --apply` created the received inbound backorder validation fixture.
- `INV-FIX-RECEIVED`: supplier id `8`, category id `25`, item id `604`, variant id `2069`, sale id `23026`, line id `22`, line component id `118`, inbound shipment id `2`, shipment item id `2`, inbound demand id `2`, demand status `partially_received`, received qty `1`.
- `2026-06-17`: `bun run inventory:seed-received-fixture --apply` repaired the received fixture with a positive `validation-fixture` stock row for variant id `2069`, stock id `6`, qty `1`, so `/inventory/backorders` can reserve the received unit during `Allocate Received`.
- `bun run inventory:validation-fixtures --markdown` then reported `9/11` ready and `2` missing. Remaining seed group: `INV-FIX-PARTIAL`.
- `bun run inventory:seed-received-fixture --rollback` dry-ran cleanup and confirmed it would soft-delete inbound demand, shipment item, shipment, line item, subcomponent, variant, sale, item, category, and supplier rows, while cancelling `LineItemComponents`. Rollback was not applied.
- `2026-06-16`: `bun run inventory:seed-partial-fixture --apply` created the available/held partial shipment validation fixture.
- `INV-FIX-PARTIAL`: category id `26`, item id `605`, variant id `2070`, stock id `4`, sale id `23027`, available line id `23`, available component id `119`, available allocation id `5`, held line id `24`, held component id `120`, held allocation id `6`.
- `2026-06-17`: `bun run inventory:seed-partial-fixture --apply` repaired the partial fixture with per-line legacy sales items: available line `23` -> sales item `161922`, held line `24` -> sales item `161923`. This lets partial shipment write delivery compatibility rows while preserving held-line skip evidence.
- `bun run inventory:validation-fixtures --markdown` then reported `11/11` ready and `0` missing. The local fixture setup gate is complete.
- `2026-06-16`: final verification after the dispatch-capacity repair reported `status: ready`, `11/11` fixture categories ready, and `13/13` browser mutation workflows runnable. Sample readiness counts were pending allocation review `4/3`, dispatch assignable approved `4/2`, dispatch packable reserved `5/2`, dispatch fulfillable picked `2/1`, ship-available partial line `23`, and held partial line `24`.
- `bun run inventory:seed-partial-fixture --rollback` dry-ran cleanup and confirmed it would soft-delete stock allocations, line items, subcomponent, stock, variant, sale, item, and category rows, while cancelling `LineItemComponents`. Rollback was not applied.

## Open Decisions
- Whether browser mutation validation should consume and then recreate these local fixtures per run, or use rollback/reseed scripts around each proof pass. The current seed helpers mutate only their named fixture groups when explicitly run with `--apply`, and each has a rollback dry-run path.
- Whether to keep fixture rows permanently in local/staging data or recreate them before each cutover validation pass.

# Dealership / WWW Sales Form UI Region Map

Date: 2026-05-23
Status: Active source-of-truth map

## Source Of Truth

The visual source of truth is the intact `www` panel:

- `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`

The target package owner is:

- `packages/sales/src/sales-form/ui/workflow`

## Region Map

| Region | Current WWW Owner | Current Dealer Owner | Target Owner | Gate |
| --- | --- | --- | --- | --- |
| Form shell frame | `@gnd/sales` `SalesFormShell` | `@gnd/sales` `SalesFormShell` | Package | Shared shell remains the single owner. |
| Header actions | `SalesFormHeaderActions` plus `www` save/print/payment actions | `SalesFormHeaderActions` with dealer save actions | Package shell plus host slots | Same placement; hidden actions by capability. |
| Customer selection | `www` customer selector dialog and form state | bespoke dealer native selects | Package header/customer region with host data | Dealer must not keep a visually different native-select block. |
| Profile/tax selection | `www` invoice/customer overview flow | bespoke dealer native select/input | Package header/customer region with gates | Dealer can edit allowed profile/tax through same visual pattern. |
| Recovery/payment dialogs | `www` slots | absent | Host slots | Dealer hides through capability. |
| Floating desktop actions | `www` `NewSalesFormFloatingActions` | absent | Package shell/host slot | Dealer hides print/pay/internal actions, keeps allowed add/save controls. |
| Mobile footer | Package shell | Package shell | Package | Same footer, dealer save label only differs. |
| Line list/card shell | `WorkflowLineList`/`InvoiceItemCard` via `ItemWorkflowPanel` | package `SalesFormWorkflowPanel` | Package engine | Must render identical card/step shell. |
| Active item/step state | `www` store adapter | package local/dealer adapter | Package engine + host editor adapter | Same visible step behavior. |
| Root picker | `RootComponentPicker` in `ItemWorkflowPanel` | package fallback root picker | Package engine | Same root grid, toolbar, loading/error states. |
| Step component picker | `WorkflowStepRenderer`/`WorkflowStepComponentPanel` | package fallback step renderer | Package engine | Same card/action layout; gates hide unavailable actions. |
| Component admin actions | `www` modal/action handlers | omitted in dealer | Package action menu + typed slots | Dealer hides edit/pricing/redirect/configuration actions. |
| Custom component visibility | `www` include custom toggle | package fallback option | Package engine + capability | Dealer must not expose admin custom enable unless allowed. |
| Door step | `DoorStepPanel` in `ItemWorkflowPanel` | package default | Package engine | Same tabs/card/action layout. |
| Door/HPT table | `HousePackageToolPanel` in `ItemWorkflowPanel` | package default | Package engine | Same table, size rows, totals, supplier display. |
| Door size qty modal | `DoorSizeQtyDialog` | package default | Package engine | Same dialog; dealer allowed only selection, not variant authoring. |
| Door swap dialog | `DoorSwapDialog` | package default | Package engine | Same dialog, gated by selected candidates. |
| Door supplier manager | `DoorSupplierManager` in `www` admin path | hidden/omitted in dealer | Host slot | Dealer sees supplier selection/display only if safe; no CRUD by default. |
| Door size variants | `DoorSizeVariantDialog` in `www` admin path | hidden/omitted in dealer | Host slot | Dealer hidden. |
| Shelf editor | `WorkflowShelfPanel` inline composition in `ItemWorkflowPanel` | package default shelf fallback | Package engine | Must match `www` section/product row UI. |
| Moulding editor | `MouldingLineItemsEditor` with `MouldingCalculator` | package default with optional calculator | Package engine + calculator slot | Same rows; calculator host slot. |
| Service editor | `ServiceLineItemsEditor` | package default | Package engine | Same rows/tax/production flags, gated where needed. |
| Component edit/image upload | `ComponentEditDialog` + `FileUploader` | omitted in dealer | Host slot | `www` admin only. |
| Summary sidebar | `InvoiceOverviewPanel` | `DealerQuoteSummaryPanel` | Package shell + host summary slot | Visual frame shared; content may differ by surface. |
| Sales history | `www` sales history slot | hidden | Host slot | Dealer hidden. |

## Immediate Extraction Rule

When a package component differs visually from `ItemWorkflowPanel`, prefer
moving the `ItemWorkflowPanel` composition into the package over styling the
dealer fallback. Dealership should consume the same engine and supply a dealer
capability profile.

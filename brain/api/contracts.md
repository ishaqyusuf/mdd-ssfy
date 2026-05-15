# API Contracts

## Purpose
Tracks important request/response contracts and shared schema boundaries.

## Current Notes
- Shared schemas and DTOs live across `apps/api/src/schemas`, `apps/api/src/dto`, and shared packages.
- Sales production query contracts live in `packages/sales/src/schema.ts`.
- The production workspace now depends on:
  - `show: "due-today" | "due-tomorrow" | "past-due"` for alert-focused list slices
  - `productionDueDate: string | null` for exact due-date queue filtering from the compact calendar strip
  - `sales.productionDashboard` response buckets: `summary`, `alerts`, `calendar`, and `spotlight`
- Customer v2 contracts now include:
  - `getCustomerDirectoryV2SummarySchema = {}` for directory stat cards
  - `getCustomerOverviewV2Schema = { accountNo: string }` for the shared page/sheet customer workspace payload
  - `customer.getCustomerOverviewV2` returns normalized `customer`, `addresses`, `walletBalance`, `general`, and `salesWorkspace` sections so the web UI no longer stitches this from server actions
- Pickup packing contracts now include:
  - `sendSaleForPickupSchema = { salesId: number }`
  - `packingListQuerySchema = { tab?: "current" | "completed" | "cancelled" }`
  - `signPackingSlipSchema = { dispatchId: number, receivedBy?: string | null, signature: string, note?: string | null }`
  - packing-list history is scoped by `sales-packing-list` notification membership, while live warehouse work uses normal `queue` delivery status
  - Expo mobile packing uses the same `packingListQuerySchema` tabs and opens the shared dispatch detail screen in a packing-aware mode via route params instead of introducing a second item-detail contract
- New sales form grouped line contract:
  - grouped service UI lines store row projection in `line.meta.serviceRows`
  - grouped moulding UI lines store row projection in `line.meta.mouldingRows`
  - grouped row projections carry legacy persistence identity where known: `salesItemId`, `hptId` for moulding, `groupUid`, `uid`, `primaryGroupItem`, row qty/price/total fields, and row-level tax/production flags for services
  - API hydration treats DB grouping identity as authoritative and only uses persisted `order.meta.newSalesForm` for current editable row values
  - API save expands grouped projections back into legacy sibling `SalesOrderItems` rows sharing `multiDykeUid`; moulding rows also write per-row `HousePackageTools`
- Manual order inbound status contract:
  - `SalesOrders.inventoryStatus` stores `AVAILABLE | ORDERED | PENDING ORDER`
  - `newSalesForm.saveDraft` / `saveFinal` accept optional `inventoryStatus` for orders and return it in the saved payload
  - `newSalesForm.get` / `bootstrap` return top-level `inventoryStatus`
  - `notes.saveInboundNote` updates the order-level status and creates an `inventory_inbound` order note; `PENDING ORDER` also creates unread recipients for inbound-channel subscribers

## TODO
- Document canonical contracts for sales, checkout, dispatch, notifications, and document workflows.

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

## TODO
- Document canonical contracts for sales, checkout, dispatch, notifications, and document workflows.

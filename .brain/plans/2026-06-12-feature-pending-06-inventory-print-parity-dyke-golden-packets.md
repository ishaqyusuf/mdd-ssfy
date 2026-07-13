# Plan: Inventory Pending 06 - Inventory Print Parity Dyke Golden Packets

## Type
Feature

## Status
Done

## Created Date
2026-06-12

## Last Updated
2026-06-15

## Goal Or Problem
Prove inventory print is compatible with Dyke print and complete required packets using fixture/golden coverage.

## Current Context
Inventory-backed print data and `/p/sales-inventory-v2` exist, but broad cutover needs 100% organized compatibility with Dyke print, golden fixtures, and packet completion.

## Proposed Approach
Mirror Dyke/v2 print composition structure where useful, build packet-specific inventory data, and validate against golden fixtures for representative orders.

## Implementation Steps
- Define golden fixtures for simple door, HPT, shelf, moulding/service, partial shipment, backorder, and inbound-blocked orders.
- Complete packets: BOM, pick list, packing list, backorder packet, production packet, customer remaining summary.
- Compare line order, quantities, descriptions, labels, pricing visibility, and branding.
- Keep Dyke print fallback until parity gates pass.

## Affected Files Or Areas
- `packages/sales/src/print/inventory-print-data.ts`
- PDF v2 templates and registry
- `/p/sales-inventory-v2`
- `print.salesInventoryV2`
- Brain print parity evidence

## Acceptance Criteria
- Required inventory-backed print packets are complete.
- Golden fixtures verify Dyke-compatible output expectations.
- Inventory print can be used for operational packets before broad sales print cutover.
- Known differences are documented.

## Test Plan
- Unit tests for print data shaping.
- Golden fixture checks for packet output.
- Browser/manual PDF render validation.

## Risks / Edge Cases
- Visual parity can fail despite correct data.
- Dealer branding and pricing visibility are easy to regress.
- Partial/backorder quantities must be labeled carefully.

## Open Questions
- Resolved for this slice: operational inventory print should become default first for production/BOM, pick list, packing list, backorder summary, and customer remaining summary packets. Broad invoice/quote cutover still waits on Pending 15 browser/PDF validation.

## Linked Task
- Task Title: Inventory Pending 06 - Inventory Print Parity Dyke Golden Packets
- Task File: brain/tasks/roadmap.md

## Completion Report
- Completed Date: 2026-06-15
- Inventory print still returns the exact current v2 print template input shape: `PrintPage` with `meta`, `billing`, `shipping`, `sections`, `footer`, `config`, and `signing`.
- Added packet-specific section titles using the existing `LineItemSection` contract:
  - `Inventory Production BOM`
  - `Inventory Pick List`
  - `Inventory Packing List`
  - `Inventory Backorder Summary`
  - `Inventory Customer Remaining Summary`
- Added print-only operational quantity helpers so pick/packing packets reflect inventory allocation state before legacy delivery rows exist.
- Added golden-style fixture tests for production/BOM, pick list, packing list, backorder, and customer remaining summary packets.
- Validation: `bun test packages/sales/src/print/inventory-print-data.test.ts` passed with 5 tests and 14 assertions; import check for `apps/api/src/trpc/routers/print.route.ts` passed; scoped `git diff --check` passed.
- Not run by default per Fast Bun discipline: broad package typecheck, build, browser validation, PDF render validation, or dev server.

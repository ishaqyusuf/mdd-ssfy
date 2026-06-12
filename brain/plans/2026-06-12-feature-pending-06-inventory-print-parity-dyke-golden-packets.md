# Plan: Inventory Pending 06 - Inventory Print Parity Dyke Golden Packets

## Type
Feature

## Status
Proposed

## Created Date
2026-06-12

## Last Updated
2026-06-12

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
- TODO: Which packet mode should become inventory-default first?

## Linked Task
- Task Title: Inventory Pending 06 - Inventory Print Parity Dyke Golden Packets
- Task File: brain/tasks/roadmap.md

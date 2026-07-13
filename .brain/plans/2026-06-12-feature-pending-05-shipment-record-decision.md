# Plan: Inventory Pending 05 - Shipment Record Decision

## Type
Feature

## Status
Done

## Created Date
2026-06-12

## Last Updated
2026-06-15

## Goal Or Problem
Decide whether to add `SalesShipment` / `SalesShipmentLine` or formally declare `OrderDelivery` / `OrderItemDelivery` as canonical shipment records.

## Current Context
Partial shipment support currently writes through `OrderDelivery` / `OrderItemDelivery` with inventory metadata. The master model originally named `SalesShipment` / `SalesShipmentLine`, but those models do not yet exist.

## Proposed Approach
Make an explicit architecture decision before expanding fulfillment reporting and reconciliation. Prefer reusing existing delivery tables if they can meet audit/reporting needs.

## Implementation Steps
- Audit current `OrderDelivery` / `OrderItemDelivery` fields and inventory metadata.
- Compare against needed shipment reporting/audit semantics.
- Decide: add new shipment models or declare existing delivery records canonical.
- Write ADR/Brain decision.
- If new models are needed, plan migration and compatibility writes separately.

## Affected Files Or Areas
- `OrderDelivery`
- `OrderItemDelivery`
- potential `SalesShipment` / `SalesShipmentLine`
- fulfillment/reporting queries
- `brain/decisions`

## Acceptance Criteria
- Shipment record source of truth is documented.
- Fulfillment, print, reporting, and reconciliation know which records to read.
- No new partial shipment work proceeds with ambiguous canonical records.

## Test Plan
- Data model review.
- Query/reporting impact review.
- ADR acceptance check.

## Risks / Edge Cases
- Adding new models may duplicate delivery history.
- Reusing legacy delivery tables may constrain future audit reporting.
- Migration may need backfill from existing deliveries.

## Open Questions
- Resolved for this cutover phase: current delivery tables are sufficient as canonical shipment records when paired with inventory metadata and `StockAllocation` state. New `SalesShipment` / `SalesShipmentLine` models are deferred until a specific reporting, audit, or operational requirement proves the existing records cannot carry the need.

## Linked Task
- Task Title: Inventory Pending 05 - Shipment Record Decision
- Task File: brain/tasks/roadmap.md

## Completion Report
- Completed Date: 2026-06-15
- Decision: `OrderDelivery` / `OrderItemDelivery` are canonical shipment records for the current inventory migration phase.
- ADR: `brain/decisions/ADR-008-inventory-shipment-record-source.md`.
- Inventory shipment modes must tag metadata with `inventory_partial_shipment` or `inventory_dispatch_mode` and reconcile delivery lines against `StockAllocation` state.
- `SalesShipment` / `SalesShipmentLine` models are not being added now.
- Validation: current code evidence shows inventory partial shipment and inventory dispatch mode write `OrderDelivery` / `OrderItemDelivery`; no `SalesShipment` / `SalesShipmentLine` Prisma models exist.

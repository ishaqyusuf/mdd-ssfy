# Plan: Inventory Pending 10 - Repeat Receive Allocation Auto Release Guardrails

## Type
Feature

## Status
Proposed

## Created Date
2026-06-12

## Last Updated
2026-06-12

## Goal Or Problem
Prevent duplicate receiving, repeated allocation, and duplicate auto-release when inbound receiving or allocation jobs are retried.

## Current Context
Inbound receiving posts stock and can queue allocation release to backorders. Repeat receive and duplicate auto-release guardrails still need hardening.

## Proposed Approach
Make receive/allocation release operations idempotent with durable operation identity, checked state transitions, and reconciliation-friendly audit rows.

## Implementation Steps
- Trace receive -> stock -> movement -> allocation release flow.
- Define idempotency keys for receive and auto-release operations.
- Prevent repeated allocation against the same received quantity/demand.
- Return already-processed/skipped results for retries.
- Add reconciliation checks for received, allocated, and released quantities.

## Affected Files Or Areas
- `packages/inventory/src/application/inbound/inbound-demand.ts`
- `packages/inventory/src/application/stock`
- `packages/jobs/src/tasks/sales/allocate-received-inbound-to-backorders.ts`
- `InventoryStock`
- `StockAllocation`
- `InboundDemand`

## Acceptance Criteria
- Re-running receive does not duplicate stock or movements.
- Re-running auto-release does not duplicate allocations.
- Partial receive retry processes only remaining unprocessed quantity.
- Duplicate attempts are visible in logs or structured results.

## Test Plan
- Integration tests for repeated receive.
- Job tests for repeated auto-release.
- Tests for partial receive and retry.
- Reconciliation test for received vs allocated quantities.

## Risks / Edge Cases
- Existing data may lack idempotency keys.
- Concurrent receives can race without atomic updates.
- Overly strict idempotency can block legitimate corrections.

## Open Questions
- TODO: Which table owns receive operation identity?

## Linked Task
- Task Title: Inventory Pending 10 - Repeat Receive Allocation Auto Release Guardrails
- Task File: brain/tasks/roadmap.md

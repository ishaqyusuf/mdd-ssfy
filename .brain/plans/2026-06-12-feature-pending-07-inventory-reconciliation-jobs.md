# Plan: Inventory Pending 07 - Inventory Reconciliation Jobs

## Type
Feature

## Status
Done

## Created Date
2026-06-12

## Last Updated
2026-06-15

## Goal Or Problem
Add reconciliation jobs for Dyke/inventory, sales-control/inventory, stock/allocation, and print parity drift.

## Current Context
Inventory-backed flows now span definitions, sales fulfillment projections, production/control workflows, stock allocations, inbound, and print. Drift can occur between these systems and needs monitored reconciliation.

## Proposed Approach
Create dry-run-first reconciliation jobs with scoped repair options only after reporting is stable and safe.

## Implementation Steps
- Define drift invariants for Dyke/inventory definitions and pricing.
- Define sales-control/inventory lifecycle drift checks.
- Define stock/allocation/inbound movement drift checks.
- Define print projection parity checks using fixtures or snapshots.
- Add Trigger jobs with run summaries, skipped reasons, and cursor/progress support.
- Add alerts or monitor surfaces for failed/high-severity drift.

## Affected Files Or Areas
- `packages/inventory/src/application/sync`
- `packages/inventory/src/application/stock`
- `packages/sales/src/sales-fulfillment-plan.ts`
- `packages/jobs/src/tasks`
- inventory monitor/admin UI
- Brain parity evidence

## Acceptance Criteria
- Reconciliation jobs report drift without mutation by default.
- Each drift domain has counts, samples, severity, and skipped reasons.
- Repair actions, if added, are explicit and idempotent.
- Operators can see last run, failures, and next cursor.

## Test Plan
- Unit tests for each drift invariant.
- Job tests for cursor and summary output.
- Integration tests for representative drift cases.

## Risks / Edge Cases
- Existing data may contain large historical drift.
- Unsafe repair could corrupt operational stock or definitions.
- Long-running jobs need cursoring and bounded samples.

## Open Questions
- Resolved for this slice: expose the report through `inventories.inventoryReconciliationReport` and queue it with `inventories.runInventoryReconciliationReport`.
- Deferred: browser/alert treatment belongs with Pending 15 inventory browser validation and the later operations dashboard work.

## Linked Task
- Task Title: Inventory Pending 07 - Inventory Reconciliation Jobs
- Task File: brain/tasks/roadmap.md

## Completion Report
- Added a dry-run reconciliation report service in `packages/sales/src/inventory-reconciliation-report.ts`.
- The report checks inventory-backed sales lines for missing component rows, completed delivery quantity vs consumed inventory allocation quantity, and component fulfillment status vs allocation/inbound state.
- Each domain returns checked count, drift count, severity, samples, skipped count, skipped reasons, cursor, and has-more state.
- Added Trigger task `run-inventory-reconciliation-report` with bounded limit/cursor payloads and no mutation or repair behavior.
- Added protected tRPC query `inventories.inventoryReconciliationReport` and protected mutation `inventories.runInventoryReconciliationReport`.
- Existing Dyke/inventory definition and pricing drift remains covered by `inventories.dykeInventoryDriftReport`; this slice adds the missing sales/stock reconciliation job surface beside it.
- Repair actions were intentionally not added; repair remains explicit through existing sync/backfill endpoints after an operator reviews drift.
- Focused validation: `bun test packages/sales/src/inventory-reconciliation-report.test.ts` and import smoke for the inventories router plus Trigger task.

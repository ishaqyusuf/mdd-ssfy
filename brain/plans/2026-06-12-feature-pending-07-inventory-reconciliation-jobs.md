# Plan: Inventory Pending 07 - Inventory Reconciliation Jobs

## Type
Feature

## Status
Proposed

## Created Date
2026-06-12

## Last Updated
2026-06-12

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
- TODO: Which drift domains should page/alert operators?

## Linked Task
- Task Title: Inventory Pending 07 - Inventory Reconciliation Jobs
- Task File: brain/tasks/roadmap.md

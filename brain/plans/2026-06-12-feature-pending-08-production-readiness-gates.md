# Plan: Inventory Pending 08 - Production Readiness Gates

## Type
Feature

## Status
Proposed

## Created Date
2026-06-12

## Last Updated
2026-06-12

## Goal Or Problem
Hard-gate existing production start actions on inventory readiness.

## Current Context
Production readiness projections and blocker UI exist, but production start actions are not yet fully enforced against inventory readiness.

## Proposed Approach
Add a shared readiness guard used by existing production actions before production can start for inventory-backed lines.

## Implementation Steps
- Locate production start actions and assignment paths.
- Add readiness guard backed by inventory line/component readiness.
- Return blockers for missing allocation, inbound dependency, or unfulfilled component.
- Add override policy only if business-approved.
- Keep production readiness separate from physical shipment fulfillment.

## Affected Files Or Areas
- `packages/jobs/src/tasks/sales/update-sales-control.ts`
- `packages/sales/src/sales-control/actions.ts`
- `packages/sales/src/sales-fulfillment-plan.ts`
- production dashboard/actions
- `/inventory/production-plan`

## Acceptance Criteria
- Production start is blocked when required inventory components are not ready.
- Ready sales/lines can start production normally.
- Blockers are visible to operators.
- Legacy production surfaces remain compatible.

## Test Plan
- Unit tests for readiness guard.
- Integration tests for blocked and allowed production start.
- Browser/manual production action validation.

## Risks / Edge Cases
- Some teams may intentionally start production before full material readiness.
- Overrides require audit.
- Mixed produceable/non-produceable orders need careful rules.

## Open Questions
- TODO: Should supervisor override be supported?

## Linked Task
- Task Title: Inventory Pending 08 - Production Readiness Gates
- Task File: brain/tasks/roadmap.md

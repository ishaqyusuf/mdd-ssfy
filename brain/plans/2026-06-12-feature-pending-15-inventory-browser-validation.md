# Plan: Inventory Pending 15 - Inventory Browser Validation

## Type
Feature

## Status
Proposed

## Created Date
2026-06-12

## Last Updated
2026-06-12

## Goal Or Problem
Browser-validate allocation review, inbound receiving, production plan, backorder queue, stock ops, print, and dispatch mode.

## Current Context
Several inventory-backed screens exist or are planned, but operator workflows need browser-level proof before cutover or broader usage.

## Proposed Approach
Create a repeatable browser QA matrix with realistic data for each inventory operational surface and store evidence in Brain.

## Implementation Steps
- Define fixture scenarios for allocation, inbound, production, backorder, stock ops, print, and dispatch mode.
- Validate happy paths and blocked/error states.
- Capture screenshots or concise evidence notes.
- Fix small surfaced issues or create follow-up plans/tasks.
- Update feature status based on validation evidence.

## Affected Files Or Areas
- `/inventory/allocations`
- `/inventory/inbounds`
- `/inventory/production-plan`
- `/inventory/backorders`
- `/inventory/stocks`
- inventory print route(s)
- inventory dispatch mode UI
- `brain/reports` or feature evidence folders

## Acceptance Criteria
- Every listed surface has browser/manual validation evidence or a documented blocker.
- Critical operator workflows can be completed with realistic data.
- Print and dispatch validation are included, not deferred silently.
- Findings are tracked in Brain.

## Test Plan
- Browser QA checklist for each surface.
- Screenshots/evidence notes.
- Focused regression tests for issues found during QA.

## Risks / Edge Cases
- Local auth/session state may block browser proof.
- Some surfaces depend on pending implementation items.
- Browser validation may reveal broader UX/product gaps.

## Open Questions
- TODO: Which role/environment is canonical for validation?

## Linked Task
- Task Title: Inventory Pending 15 - Inventory Browser Validation
- Task File: brain/tasks/roadmap.md

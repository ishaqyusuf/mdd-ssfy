# Plan: Inventory Pending 15 - Inventory Browser Validation

## Type
Feature

## Status
In Progress

## Created Date
2026-06-12

## Last Updated
2026-06-15

## Goal Or Problem
Browser-validate allocation review, inbound receiving, production plan, backorder queue, stock ops, print, and dispatch mode.

## Current Context
Several inventory-backed screens exist or are planned, but operator workflows need browser-level proof before cutover or broader usage.

Readiness report: `brain/reports/2026-06-15-inventory-browser-validation-readiness.md`.

Evidence worksheet: `brain/reports/2026-06-15-inventory-browser-validation-evidence.md`.

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
- Browser/local dev validation requires explicit approval under the active fast Bun command-discipline rules.

## Linked Task
- Task Title: Inventory Pending 15 - Inventory Browser Validation
- Task File: brain/tasks/roadmap.md

## Progress Notes
- Static readiness matrix created at `brain/reports/2026-06-15-inventory-browser-validation-readiness.md`.
- Static audit found the inventory dispatch command/API foundation but no dedicated web UI caller.
- Added `/inventory/dispatch-mode` so assign, pack, fulfill, and release can be validated by operators from the inventory workspace.
- Added the `/inventory/dispatch-mode` sidebar link for Super Admins and focused sidebar coverage.
- Added `/inventory/variants` and `/inventory/partial-shipments` sidebar links for Super Admins so all authenticated inventory validation routes in the readiness matrix are reachable from normal navigation.
- Added route-file existence coverage for the Pending 15 route matrix, including `/p/sales-inventory-v2`.
- Focused non-browser validation passed: `bun test packages/sales/src/sales-fulfillment-plan.test.ts packages/inventory/src/inventory-item-dashboard.test.ts` with 24 tests and 68 assertions.
- Follow-up focused validation passed: `bun test apps/www/src/components/sidebar-links.test.ts packages/sales/src/sales-fulfillment-plan.test.ts packages/inventory/src/inventory-item-dashboard.test.ts` with 29 tests and 89 assertions.
- Focused print validation passed: `bun test packages/sales/src/print/inventory-print-data.test.ts apps/www/src/modules/sales-print/application/inventory-print-request.test.ts apps/www/src/components/sidebar-links.test.ts packages/sales/src/sales-fulfillment-plan.test.ts packages/inventory/src/inventory-item-dashboard.test.ts` with 36 tests and 105 assertions.
- Route-matrix validation passed: `bun test packages/sales/src/print/inventory-print-data.test.ts apps/www/src/modules/sales-print/application/inventory-print-request.test.ts apps/www/src/components/sidebar-links.test.ts packages/sales/src/sales-fulfillment-plan.test.ts packages/inventory/src/inventory-item-dashboard.test.ts` with 37 tests and 115 assertions.
- Import smoke passed for the inventories router, inventory dispatch-mode component, and operations dashboard component.
- Import smoke passed for importable inventory print surfaces: `apps/api/src/trpc/routers/print.route.ts`, `apps/www/src/components/rendered-inventory-pdf-print-viewer.tsx`, and `apps/www/src/modules/sales-print/application/inventory-print-request.ts`.
- Direct import of `SalesInventoryPrintViewerPage` remains a Next runtime/browser concern because it crosses the expected `server-only` boundary outside the app runtime.
- Scoped `git diff --check` and trailing-whitespace scans passed for the new dispatch-mode/readiness files.
- Added a concrete browser QA execution checklist to the readiness report covering preflight, route smoke, allocation review, inbound receiving, production plan, backorder/partial shipment, stock operations, dispatch mode, inventory print parity, evidence format, and stop conditions.
- Added a dedicated evidence worksheet for the final browser pass at `brain/reports/2026-06-15-inventory-browser-validation-evidence.md`.
- Live browser validation started with the Codex in-app browser at `1440x1000` using the Super Admin Dev Quick Login user `Pablo Cruz`.
- Route smoke passed for `/inventory`, `/inventory/variants`, `/inventory/allocations`, `/inventory/inbounds`, `/inventory/production-plan`, `/inventory/backorders`, `/inventory/partial-shipments`, `/inventory/stocks`, `/inventory/dispatch-mode`, and `/p/sales-inventory-v2` after the inventory print viewer fix.
- Browser validation found and fixed an inventory print SSR crash caused by `PDFViewer` rendering on the server; the route now renders a blob-backed PDF iframe through a client-only dynamic wrapper.
- Pending 15 is still not done because mutating workflow checks are data-blocked by missing local fixtures for pending allocations, inbound shipments/demand, available dispatch allocations, held partial shipment lines, and safe stock adjustment audit rows.

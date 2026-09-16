# Bug: Sales Print Client Bundled Prisma

## Date

2026-09-16

## Problem

Opening the Sales Orders page failed in the browser with Prisma's
"unable to run in this browser environment" error. The browser stack reached
`packages/db/src/index.ts` while initializing the Sales print client modules.

## Root Cause

The totals-only implementation imported `normalizeSalesPriceDisplay` and
`resolveSalesPriceDisplayTemplateId` at runtime from the broad
`@gnd/sales/print` barrel. That barrel also exports server print-data modules,
which reach `@gnd/db`; Next.js consequently included Prisma in the browser
dependency graph.

## Fix

Expose `price-display.ts` as the explicit
`@gnd/sales/print/price-display` package subpath and import the pure runtime
helpers and types from that leaf in Dashboard client code. Add a browser-target
bundle regression test that rejects Prisma, `@prisma/client`, and database source
in the Sales print request bundle.

## Prevention

Browser modules must use narrow package exports for pure contracts and helpers.
Do not import runtime values from a package barrel that also exports database or
server-only implementations. Preserve the browser-bundle regression test when
extending Sales print client behavior.

## Related Files

- `packages/sales/package.json`
- `packages/sales/src/print/price-display.ts`
- `apps/dashboard/src/modules/sales-print/application/sales-print-request.ts`
- `apps/dashboard/src/modules/sales-print/application/sales-print-service.ts`
- `apps/dashboard/src/modules/sales-print/application/sales-print-browser-boundary.test.ts`

# Bug: Sales Print Router Schema Composition Crash

## Date

2026-09-16

## Problem

The Next.js API runtime failed while initializing `print.route.ts`, causing
unrelated tRPC requests to return HTTP 500. The failure occurred at
`printSalesV2Schema.omit({ priceDisplay: true })` after the canonical Sales print
schema added the transformed `priceDisplay` field.

## Root Cause

The inventory-print input contract was derived at API module initialization by
calling `.omit()` and `.extend()` on a Zod object imported across the workspace
package boundary. Next.js failed while evaluating that derived schema. The same
operation and the full route import succeeded in the isolated Bun runtime, so
the crash is specific to the Next.js module/bundler runtime rather than invalid
inventory input data.

## Fix

Define the small inventory-print request schema directly in the API route using
the API package's Zod instance. This preserves the prior fields and defaults
without composing an unrelated inventory contract from the commercial Sales
print schema.

## Prevention

Avoid deriving route-local schemas from cross-package Zod objects when the
contracts are not actually coupled. Prefer a direct schema or a deliberately
shared exported contract, and verify API module initialization in the Next.js
runtime when adding transformed fields to shared schemas.

## Related Files

- `apps/api/src/trpc/routers/print.route.ts`
- `packages/sales/src/print/schema.ts`

# Inventory Router Zod Omit Initialization Failure

## Status

Resolved in the working tree on 2026-08-05.

## Symptom

Every dashboard tRPC request returned HTTP 500 while the API router was loading,
including `sales.getOrders`. The server reported `Cannot read properties of
undefined (reading 'def')` at the inventory router's
`salesBackorderQueueSchema.omit(...)` expression. Because the failure occurred
while the aggregate router was initialized, unrelated procedures also failed.

## Root cause

The inventory router derived three summary/print input schemas with Zod's lazy
`.omit()` operation during module initialization. The schema and router imported
successfully under Bun, but the same operation failed when the source-exported
API package was compiled into the Next 16 Turbopack server bundle. This made a
bundler-sensitive schema derivation a single point of failure for the complete
tRPC router.

## Fix and prevention

- Added explicit pagination-free filter schemas for the backorder and partial
  shipment queues.
- Built paginated queue schemas from the same declarative field shapes rather
  than deriving summary schemas at router initialization.
- Added a router regression that verifies both filter schemas load, accept the
  shared filters, and strip pagination-only fields.

## Validation

- Before the fix, a minimal `sales.getOrders` request returned HTTP 500 before
  reaching authentication or input validation.
- After a clean dashboard restart, the same probe reached the normal tRPC error
  contract and returned HTTP 400 `VALIDATION_FAILED`, proving the router loaded.
- The focused inventory router suite passes 13 tests with 103 assertions.
- Scoped Biome checks pass. API typecheck remains blocked only by the existing
  excessive-stack diagnostic in `inbound-receiving.ts`.

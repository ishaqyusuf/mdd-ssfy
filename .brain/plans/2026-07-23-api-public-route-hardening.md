# API Public-Route Hardening

## Status

Implemented on 2026-07-23.

## Problem

Internal dispatch, inventory configuration, contractor job, community, and
shared-settings mutations were still composed from `publicProcedure`. Several
handlers checked `ctx.userId` after input parsing or trusted a client-supplied
actor, while others had no route-level authorization at all.

## Boundary Matrix

| Domain | Operation class | Required server boundary |
| --- | --- | --- |
| Dispatch | Assigned trip start, completion, and signature | Authenticated user with delivery/pickup/packing capability, plus matching `OrderDelivery.driverId`, or dispatch manager |
| Dispatch | Create, cancel, delete, restore, assignment, due date, status, duplicate cleanup, bulk actions | Dispatch manager: `editPickup`, `editOrders`, or `viewPacking`; Super Admin is implicit |
| Dispatch | Packing changes | `viewPacking`, `editPickup`, or `editOrders` |
| Dispatch | Proof upload/debug transport | Authenticated delivery, pickup, or packing worker |
| Inventory | Category, item, component, product-kind, stock-mode, status, variant, and cost writes | Super Admin inventory operator |
| Jobs | Own standard/custom submission | Authenticated contractor; custom jobs additionally require global `allowCustomJobs` or `submitCustomJob` |
| Jobs | Assignment, restore, cross-worker changes, approve/reject | `editJobs`; own contractor submission remains allowed |
| Jobs | Payout creation, cancellation, and reversal | `editJobPayment` |
| Community | Template/project configuration | `editCommunity` or `editProject` |
| Community | Builder configuration | `editBuilders`, `editCommunity`, or `editProject` |
| Community | Unit/work-order changes | `editCommunityUnit`, `editCommunity`, or `editProject` |
| Community | Install/model costs | `editCost`, `editCommunity`, or `editProject`, plus the existing CommunityUnit cost restriction |
| Community | Unit invoices | `editInvoice`, `editCommunityUnit`, `editCommunity`, or `editProject` |
| Community | Community jobs | `editJobs`, `editCommunityUnit`, `editCommunity`, or `editProject` |
| Community | Send units to production | `editProduction`, `editCommunityUnit`, `editCommunity`, or `editProject` |
| Settings | Read shared job settings | Authenticated user |
| Settings | Change any shared setting | Super Admin |

## Implementation

- Added one permission resolver that uses the canonical authenticated session,
  merged role permissions, and user-specific permissions.
- Converted every reviewed mutation from `publicProcedure` to
  `protectedProcedure`.
- Added route-local domain guards before writes or external side effects.
- Added assigned-driver enforcement for dispatch start, completion, and
  signature so the Delivery role's broad `editDelivery` grant does not permit
  operating another driver's trip.
- Preserved contractor self-service job submission while blocking cross-worker
  assignment and protecting payment operations separately.
- Kept inventory configuration deny-first under the established Super Admin
  operator guard because the current permission catalog has no inventory-edit
  capability.

## Validation

- `bun test apps/api/src/trpc/routers/permission-boundaries.test.ts apps/api/src/trpc/routers/jobs.route.test.ts apps/api/src/schemas/schema-evaluation.test.ts`
  passed 14 tests / 239 assertions.
- `bun run --cwd apps/api typecheck` passed.
- A read-only local role-grant audit confirmed Delivery has only delivery
  capability, Orders Dispatch has pickup/delivery capability, and office/admin
  roles retain their matching manager grants.
- No database schema, migration, sync, repair, or production write was required.

## Follow-up

- Introduce an explicit inventory-edit permission before delegating inventory
  configuration below Super Admin.
- Completed 2026-07-23: mobile completion now uses the dispatch-id-bound,
  resumable `dispatch.completeDispatchWithProof` operation and the generic
  upload mutation is removed. Migration from staged blob/note paths to
  canonical `StoredDocument` rows remains part of the shared document work.

# Driver Platform Revival

## Status

Closeout specified on 2026-08-07; implementation is paused pending execution of
the approved local tickets. Automated contract, domain, and focused mobile
validation is green. The dedicated development router renders in SDK 54 Expo
Go, and device proof now includes a reversible inventory-backed dispatch moving
from `UNPACKED 0/3 · Inventory Review` to `PACKED 3/3 · Ready To Load`.
Assigned-driver completion remains open. The development employee picker now
fills the selected email plus the shared development master password and waits
for explicit form submission, but the approved password-free genuine employee
session operation remains unimplemented. Mixed inventory/legacy packing
atomicity, final driver start/proof completion, lifecycle failure evidence, and
pilot handoff are tracked in `.scratch/driver-platform-revival-closeout/`.

## Behavior

- Authenticated drivers receive a server-owned work queue grouped into
  `overdue`, `today`, `tomorrow`, `upcoming`, and `unscheduled` sections.
- Queue totals are authoritative and independent of loaded pages. Cards and
  detail views label the delivery date explicitly instead of mixing overdue
  work into a generic urgent list.
- Dispatch detail uses a typed manifest. Legacy lines preserve their existing
  source fields and expose size, item type, LH/RH/total quantities, and an
  explicit missing-data warning instead of inventing handing information.
- Inventory-backed lines expose SKU/variant, required components, bound and
  available allocations, inbound shortage, readiness, and a stable revision.
- A split delivery scopes component demand proportionally to the item quantity
  on that `OrderDelivery`; one trip cannot reserve the whole sales line.
- Warehouse confirmation binds exact approved allocation quantities to the
  dispatch and transitions them to picked. Starting a trip requires its scoped
  required components to be picked. Completion consumes only picked allocations
  bound to that dispatch. Cancellation releases active allocations; picked
  stock requires an explicit manager confirmation that it was physically
  returned.
- Legacy-only dispatches continue through the existing fulfillment path and
  are labeled `legacy_item`; missing inventory identity is never treated as
  available inventory.
- Development quick-login employees are returned only when the API process is
  in `NODE_ENV=development`, and the mobile selector is compiled only under
  `__DEV__`. Preview and production do not expose the account list.
- Dark mode shares the Al-Ghurobaa podcast app's semantic identity: near-black
  background, layered charcoal card/popover surfaces, high-contrast neutral
  text, and green primary/accent/ring tokens. The palette is applied through
  the shared navigation and NativeWind semantic variables rather than
  screen-specific colors; the existing light palette is unchanged.

## Interfaces

- Mobile: `apps/mobile/src/app/(drivers)/dispatch`, the shared dispatch detail
  surface, and the warehouse packing surface.
- API: protected `dispatch.driverWorkQueue`,
  `dispatch.driverWorkQueueSummary`, `dispatch.manifest`,
  `dispatch.prepareInventoryForDispatch`,
  `dispatch.inventoryReconciliation`, and
  `dispatch.backfillInventoryBindings`.
- Domain: `packages/sales/src/dispatch-manifest/*`, inventory dispatch
  transitions in `sales-fulfillment-plan.ts`, and atomic dispatch lifecycle
  orchestration in `sales-control/tasks.ts`.

## Rollout and Operations

- Run inventory reconciliation before binding historical allocations.
- Backfill defaults to dry-run and automatically selects only a sale with one
  active dispatch. Exact quantities are planned from that dispatch's scoped
  manifest; ambiguous sales remain untouched.
- Pilot with assigned drivers and warehouse operators before broad enablement.
  Compare legacy packing quantities, inventory readiness, and post-completion
  consumed allocations for every pilot trip.
- Do not claim mobile cutover complete until a valid packed/assigned local
  dispatch completes Start Trip and proof completion in Expo Go, consumes its
  exact picked allocations once, and passes the approved reconciliation and
  retry gates.

## Validation Evidence

- Sales and API TypeScript checks pass.
- Focused work-queue, manifest normalization, permissions, quick-login,
  inventory transitions, reconciliation, and transaction tests pass.
- Prisma Client generation and local schema synchronization pass.
- Android debug assembly/install passes.
- The dedicated driver development router, direct icon imports, and Expo Go
  native-module compatibility boundary reduce the active bundle from roughly
  10,418 modules to roughly 3,100 and avoid the prior Hermes `hades` crash.
- Expo Go 54.0.8 device proof passes ordinary login, development-only employee
  list rendering, authenticated assigned queue, dispatch detail, the
  Al-Ghurobaa dark palette, and exact warehouse preparation for the reversible
  inventory fixture. The picker now replaces both credential fields when a
  different employee is selected; device proof of the revised interaction is
  pending because the connected Android device became unavailable during the
  implementation session.
- Theme/runtime/security regression coverage passes 12 tests with 51
  assertions, including exact dark identity tokens and development-only
  account/router boundaries.

## Approved Closeout Work

- Specification: `.scratch/driver-platform-revival-closeout/map.md`
- Immediate frontier: genuine development employee quick login and atomic mixed
  inventory/legacy packing.
- Dependent frontier: inventory-backed driver journey, lifecycle failure safety
  and reconciliation, then pilot/cutover evidence and handoff.

## Related Records

- `.brain/plans/driver-platform-revival/map.md`
- `.scratch/driver-platform-revival-closeout/map.md`
- `.brain/decisions/ADR-050-dispatch-bound-inventory-execution.md`
- `.brain/features/inventory-backed-sales-fulfillment.md`
- `.brain/features/mobile-dispatch-proof-completion.md`

## 2026-08-23 Responsive Dashboard Design Exploration

- Created three clickable responsive driver dashboard directions using the
  existing Sales Finance, Sales Rep Dashboard, driver work queue, manifest,
  readiness, proof, and weak-network contracts as references.
- Route Command emphasizes a balanced light command center, Dispatch Ledger
  emphasizes exact operational scanning, and Field Focus emphasizes phone-first
  weak-signal execution. All three preserve the same server-owned product
  contract so selection is a hierarchy and visual-taste decision.
- Verified the prototypes at 375, 768, and 1280 pixels, exercised their primary
  actions, removed document-level mobile overflow, and observed no console
  errors.
- The comparison board is stored at
  `/Users/M1PRO/.gstack/projects/gnd/designs/driver-dashboard-system-20260823/design-board.html`.
- The complete proposed implementation and rollout plan is
  `.brain/plans/2026-08-23-feature-driver-dashboard-command-center.md`.
- No production route or application behavior changed. Direction selection is
  required before implementation.

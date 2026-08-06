# Phase 0: Immediate Driver Recovery and Security

Status: Implemented in source; final Expo Go device gate remains open
Dependency: None
Target: Client-visible correction without waiting for the inventory cutover

## Objective

Make the existing driver app safe and operational immediately: enforce assigned-driver privacy, correctly communicate delivery dates, and expose enough structured door/item detail for warehouse loading.

## API and Permission Plan

1. Convert driver-sensitive reads from `publicProcedure` to `protectedProcedure`:
   - `dispatch.assignedDispatch`
   - `dispatch.dispatchOverviewV2`
   - `dispatch.packingList`
   - any driver/mobile caller of `dispatch.index`, `dispatchOverview`, `orderDispatchOverview`, or `salesDeliveryInfo` that returns customer/order detail.
2. Add read guards parallel to the existing mutation guards:
   - assigned driver may read their dispatch;
   - packing operators may read warehouse packing work;
   - dispatch managers may read authorized operational work;
   - other authenticated users receive `FORBIDDEN`.
3. Make `assignedDispatch` ignore caller-provided `driversId` and always apply the authenticated user id unless the route is an explicit manager query.
4. Add query-level tests proving unauthenticated rejection, assigned-driver success, cross-driver rejection, packing-role scope, and manager scope.

## Due-Date Recovery Plan

1. Define a server-owned `dueBucket` using the configured business timezone: `overdue`, `today`, `tomorrow`, `upcoming`, or `unscheduled`.
2. Implement `scheduleDate` in `whereDispatch` or replace it with explicit `dueBucket`/range inputs; do not retain an accepted-but-ignored filter.
3. Return authoritative summary counts independently from the paginated list.
4. On the home screen, render sections in this order: Overdue, Due Today, Upcoming. Keep overdue work visible and distinct rather than calling it due today.
5. Change the date pill to explicit copy such as `Delivery due Jul 30` and a secondary status such as `6 days overdue`.
6. Put the same due label in dispatch detail and the start-trip confirmation.

## Item Detail Recovery Plan

1. Add structured fields to the existing overview DTO without waiting for inventory binding:
   - `itemType` / `sectionTitle`
   - `productTitle`
   - `size`
   - `swing`
   - `orderedQty: { qty, lh, rh }`
   - `packedQty: { qty, lh, rh }`
   - `image`
   - `detailCompleteness` and `missingFields`.
2. Normalize handing display:
   - explicit saved swing is primary;
   - positive LH/RH quantities render as `LH x N` / `RH x N` even when the swing string is blank;
   - conflicting swing and quantity data renders a review warning;
   - no evidence renders `Handing not recorded`.
3. Replace the nearly empty packing-item modal introduction with a structured manifest card before packing controls/history.
4. Show type/style, construction/product, size, handing, ordered quantity, packed quantity, and remaining quantity as separate labeled rows.
5. Do not show price, margin, internal supplier cost, or other data unnecessary for a driver.

## Target Files

- Replace/extend `apps/api/src/db/queries/dispatch.ts` and `apps/api/src/trpc/routers/dispatch.route.ts`.
- Replace/extend `apps/api/src/prisma-where.ts` and `apps/api/src/schemas/sales.ts`.
- Add `packages/sales/src/dispatch-manifest/normalize-legacy-item.ts` with focused unit tests.
- Update `apps/mobile/src/app/(drivers)/dispatch/index.tsx`.
- Update `apps/mobile/src/features/dispatch/components/driver-dashboard-dispatch-item.tsx`.
- Update `apps/mobile/src/features/dispatch/components/dispatch-detail-screen/components/scroll-content.tsx`.
- Replace the content contract in `apps/mobile/src/features/dispatch/components/dispatch-detail-screen/modals/packing-item-modal.tsx`.
- Add API permission/query tests and mobile presentation/model tests.

## Validation and Acceptance

Fixtures must include:

- order `08980DB`-shaped data with an overdue date and missing address;
- pre-hung LH, RH, and mixed LH/RH rows;
- pre-hung row with missing swing but positive LH/RH quantities;
- bifold and moulding rows;
- no due date;
- cross-driver access attempt.

Acceptance checks:

- The home card explicitly says what the date means and does not classify overdue work as due today.
- Opening each item shows structured fields, not only title plus subtitle.
- Every pre-hung line shows handing evidence or a visible missing-data warning.
- Unauthenticated and cross-driver reads fail.
- Focused tests, mobile filtered typecheck, Android export, and real-device phone/tablet screenshots pass.

## Rollback

Keep the legacy response fields during this slice. The UI can revert to the old list/detail presentation through a feature flag without reopening public API access.

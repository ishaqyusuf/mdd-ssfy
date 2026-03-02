# Sales Dispatch Driver Mobile Checklist

## Understanding

Before coding, this checklist explains the implementation order and exact touchpoints to reduce churn, keep API/mobile aligned, and preserve current web behavior.

## Assumptions

- Mobile app target: `apps/expo-app`.
- Dispatch backend target: existing `apps/api/src/trpc/routers/dispatch.route.ts` and related query files.
- Driver scope: assigned dispatch list, dispatch detail, start/cancel/complete actions.

## File-by-File Execution Order

1. Mobile feature scaffold
- [ ] Create folder: `apps/expo-app/src/features/dispatch`.
- [ ] Add files:
  - `apps/expo-app/src/features/dispatch/types/dispatch.types.ts`
  - `apps/expo-app/src/features/dispatch/api/use-assigned-dispatch-list.ts`
  - `apps/expo-app/src/features/dispatch/api/use-dispatch-overview.ts`
  - `apps/expo-app/src/features/dispatch/api/use-dispatch-actions.ts`
  - `apps/expo-app/src/features/dispatch/api/use-dispatch-packing.ts`
  - `apps/expo-app/src/features/dispatch/state/use-dispatch-ui-state.ts`
  - `apps/expo-app/src/features/dispatch/lib/packing-payload.ts`

2. Mobile list screen
- [ ] Add route screen:
  - `apps/expo-app/src/app/(drivers)/dispatch/index.tsx`.
- [ ] Add UI components:
  - `apps/expo-app/src/features/dispatch/components/dispatch-list-screen.tsx`
  - `apps/expo-app/src/features/dispatch/components/dispatch-list-item.tsx`
  - `apps/expo-app/src/features/dispatch/components/dispatch-status-badge.tsx`
- [ ] Wire query/pagination/pull-to-refresh with `dispatch.assignedDispatch`.

3. Mobile detail screen
- [ ] Add route screen:
  - `apps/expo-app/src/app/(drivers)/dispatch/[dispatchId].tsx`
- [ ] Add UI components:
  - `apps/expo-app/src/features/dispatch/components/dispatch-detail-screen.tsx`
  - `apps/expo-app/src/features/dispatch/components/dispatch-action-bar.tsx`
  - `apps/expo-app/src/features/dispatch/components/dispatch-item-list.tsx`
  - `apps/expo-app/src/features/dispatch/components/dispatch-packing-form.tsx`
  - `apps/expo-app/src/features/dispatch/components/dispatch-packing-history.tsx`
  - `apps/expo-app/src/features/dispatch/components/dispatch-clear-packing-dialog.tsx`
  - `apps/expo-app/src/features/dispatch/components/dispatch-complete-form.tsx`
- [ ] Wire detail query with `dispatch.dispatchOverview`.

4. Packing logic handling
- [ ] Implement packing actions in `use-dispatch-packing.ts`:
  - `packItems` via `taskTrigger.trigger` with `taskName: "update-sales-control"`.
  - `clearPackings` via `taskTrigger.trigger` with `taskName: "update-sales-control"`.
  - `deletePackingItem` via `dispatch.deletePackingItem`.
- [ ] Build packing payload mapping in `packing-payload.ts`:
  - map entered qty into submission-based `packingList`.
  - block submit when qty remainder exists.
- [ ] Add packing status rules in UI:
  - editable in `queue` and `in progress`.
  - read-only in `cancelled` and `completed`.
- [ ] Add post-mutation refresh:
  - invalidate/refetch `dispatch.dispatchOverview` and assigned dispatch list.

5. Driver action handling
- [ ] Implement mutations in `use-dispatch-actions.ts`:
  - `startDispatch`
  - `cancelDispatch`
  - `submitDispatch`
- [ ] Add action gating by status:
  - show Start only for `queue`
  - show Cancel/Complete only for `in progress`
  - disable actions for `cancelled`/`completed`
- [ ] Add success/error feedback and query invalidation for list+detail.

6. Navigation and role gating
- [ ] Update driver navigation entry points:
  - `apps/expo-app/src/app/(drivers)/_layout.tsx`
  - related menu entry component if used.
- [ ] Update root guard routing in [\_layout.tsx](/Users/M1PRO/Documents/code/_turbo/gnd/apps/expo-app/src/app/_layout.tsx):
  - route `(drivers)` dashboard stack by `isDriver`.
  - update unavailable guard accordingly (non-admin and non-driver).
- [ ] Gate dispatch screens for valid driver role/session in auth-aware wrapper/hooks.

7. Shared UX + state consistency
- [ ] Add loading/empty/error states for both screens.
- [ ] Add retry path for failed mutations and failed detail fetch.
- [ ] Standardize date/status formatting helpers in feature-local util file:
  - `apps/expo-app/src/features/dispatch/lib/format-dispatch.ts`
- [ ] Add packing form validation/error states:
  - insufficient stock message
  - invalid qty entry prevention
  - mutation failure retry

8. Verification and rollout
- [ ] Manual test matrix:
  - list only assigned dispatches
  - open detail
  - add packing entry
  - delete packing history row
  - clear all packing
  - start
  - cancel
  - complete with form
  - error/retry behavior
- [ ] Run app checks/lint/tests for touched areas.
- [ ] Stage release behind role gate/feature flag if needed.

## Validation Gate (Do Not Skip)

- [ ] Web dispatch flow remains unchanged.
- [ ] Mobile driver flow works on both iOS and Android simulators/devices.
- [ ] No unhandled mutation or loading state in dispatch screens.

## Deliverable Output

- Feature-complete driver dispatch module in Expo.
- Verified start/cancel/complete lifecycle with stable UI refresh.

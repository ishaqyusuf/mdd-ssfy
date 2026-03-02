# Sales Dispatch Driver Mobile Checklist

## Understanding

Before coding, this checklist explains the implementation order and exact touchpoints to reduce churn, keep API/mobile aligned, and preserve current web behavior.

## Assumptions

- Mobile app target: `apps/expo-app`.
- Dispatch backend target: existing `apps/api/src/trpc/routers/dispatch.route.ts` and related query files.
- Driver scope: assigned dispatch list, dispatch detail, start/cancel/complete actions.

## File-by-File Execution Order

1. Mobile feature scaffold
- [x] Create folder: `apps/expo-app/src/features/dispatch`.
- [x] Add files:
  - `apps/expo-app/src/features/dispatch/types/dispatch.types.ts`
  - `apps/expo-app/src/features/dispatch/api/use-assigned-dispatch-list.ts`
  - `apps/expo-app/src/features/dispatch/api/use-dispatch-overview.ts`
  - `apps/expo-app/src/features/dispatch/api/use-dispatch-actions.ts`
  - `apps/expo-app/src/features/dispatch/api/use-dispatch-packing.ts`
  - `apps/expo-app/src/features/dispatch/state/use-dispatch-ui-state.ts`
  - `apps/expo-app/src/features/dispatch/lib/packing-payload.ts`

2. Mobile list screen
- [x] Add route screen:
  - `apps/expo-app/src/app/(drivers)/dispatch/index.tsx`.
- [x] Add UI components:
  - `apps/expo-app/src/features/dispatch/components/dispatch-list-screen.tsx`
  - `apps/expo-app/src/features/dispatch/components/dispatch-list-item.tsx`
  - `apps/expo-app/src/features/dispatch/components/dispatch-status-badge.tsx`
- [x] Wire query/pagination/pull-to-refresh with `dispatch.assignedDispatch`.

3. Mobile detail screen
- [x] Add route screen:
  - `apps/expo-app/src/app/(drivers)/dispatch/[dispatchId].tsx`
- [x] Add UI components:
  - `apps/expo-app/src/features/dispatch/components/dispatch-detail-screen.tsx`
  - `apps/expo-app/src/features/dispatch/components/dispatch-action-bar.tsx`
  - `apps/expo-app/src/features/dispatch/components/dispatch-item-list.tsx`
  - `apps/expo-app/src/features/dispatch/components/dispatch-packing-form.tsx`
  - `apps/expo-app/src/features/dispatch/components/dispatch-packing-history.tsx`
  - `apps/expo-app/src/features/dispatch/components/dispatch-clear-packing-dialog.tsx`
  - `apps/expo-app/src/features/dispatch/components/dispatch-complete-form.tsx`
- [x] Wire detail query with `dispatch.dispatchOverview`.

4. Packing logic handling
- [x] Implement packing actions in `use-dispatch-packing.ts`:
  - `packItems` via `taskTrigger.trigger` with `taskName: "update-sales-control"`.
  - `clearPackings` via `taskTrigger.trigger` with `taskName: "update-sales-control"`.
  - `deletePackingItem` via `dispatch.deletePackingItem`.
- [x] Build packing payload mapping in `packing-payload.ts`:
  - map entered qty into submission-based `packingList`.
  - block submit when qty remainder exists.
- [x] Add packing status rules in UI:
  - editable in `queue` and `in progress`.
  - read-only in `cancelled` and `completed`.
- [x] Add post-mutation refresh:
  - invalidate/refetch `dispatch.dispatchOverview` and assigned dispatch list.

5. Driver action handling
- [x] Implement mutations in `use-dispatch-actions.ts`:
  - `startDispatch`
  - `cancelDispatch`
  - `submitDispatch`
- [x] Add action gating by status:
  - show Start only for `queue`
  - show Cancel/Complete only for `in progress`
  - disable actions for `cancelled`/`completed`
- [x] Add success/error feedback and query invalidation for list+detail.

6. Navigation and role gating
- [x] Update driver navigation entry points:
  - `apps/expo-app/src/app/(drivers)/_layout.tsx`
  - related menu entry component if used.
- [x] Update root guard routing in [\_layout.tsx](/Users/M1PRO/Documents/code/_turbo/gnd/apps/expo-app/src/app/_layout.tsx):
  - route `(drivers)` dashboard stack by `isDriver`.
  - update unavailable guard accordingly (non-admin and non-driver).
- [x] Gate dispatch screens for valid driver role/session in auth-aware wrapper/hooks.

7. Shared UX + state consistency
- [x] Add loading/empty/error states for both screens.
- [x] Add retry path for failed mutations and failed detail fetch.
- [x] Standardize date/status formatting helpers in feature-local util file:
  - `apps/expo-app/src/features/dispatch/lib/format-dispatch.ts`
- [x] Add packing form validation/error states:
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
- [x] Run app checks/lint/tests for touched areas.
- [ ] Stage release behind role gate/feature flag if needed.

9. Stitch design update
- [x] Study and map design references:
  - `ai/designs/dispatch-mobile/designs.html`
  - `ai/stitch-rules-1.2.311225.md`
- [ ] Update dispatch list screen visuals to Stitch direction:
  - sticky-style top header hierarchy
  - stronger card rhythm and spacing
  - elevated status badge treatments and action affordances
- [ ] Update dispatch detail visuals to Stitch direction:
  - sectioned cards (customer/location, packing list, history, summary)
  - clearer activity history style
  - stronger delivery summary block hierarchy
- [ ] Update complete-dispatch form visuals to Stitch direction:
  - polished inputs with icon-led affordances
  - signature/acknowledgement area treatment
  - fixed bottom CTA action area
- [ ] Enforce stitch styling constraints in touched files:
  - no hardcoded layout/surface colors
  - semantic token usage only for theme colors
  - no `style` + `className` on same component
- [ ] Dark-mode review pass:
  - list screen
  - detail screen
  - complete dispatch form
- [ ] Design self-audit pass before merge:
  - token compliance
  - visual parity with template intent
  - interaction polish (pressed/disabled/loading states)

## Validation Gate (Do Not Skip)

- [ ] Web dispatch flow remains unchanged.
- [ ] Mobile driver flow works on both iOS and Android simulators/devices.
- [ ] No unhandled mutation or loading state in dispatch screens.
- [ ] Stitch design checklist passes for dispatch list/detail/complete screens.

## Deliverable Output

- Feature-complete driver dispatch module in Expo.
- Verified start/cancel/complete lifecycle with stable UI refresh.

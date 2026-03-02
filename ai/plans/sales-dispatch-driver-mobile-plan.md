# Sales Dispatch Driver Mobile Plan

## Understanding

Before generating implementation, we will first explain the target flow, data contracts, and rollout strategy so execution is predictable and aligned across API, web parity, and Expo mobile.

This plan defines how to build a driver-focused sales dispatch system in the mobile app (`apps/expo-app`) by reusing the current dispatch backend and behavior from:
- `apps/www/src/app/(sidebar)/(sales)/sales-book/dispatch/page.tsx`
- `apps/api/src/trpc/routers/dispatch.route.ts`
- `apps/www/src/components/sheets/sales-overview-sheet/dispatch-list.tsx`
- `apps/www/src/components/sheets/sales-overview-sheet/packing-tab.tsx`
- `apps/www/src/components/sheets/sales-overview-sheet/context.tsx` (`useDispatch`)

All decisions in this plan follow [code-culture-1.1.md](/Users/M1PRO/Documents/code/_turbo/gnd/ai/code-culture-1.1.md).
Design refresh decisions in this plan are derived from:
- [designs.html](/Users/M1PRO/Documents/code/_turbo/gnd/ai/designs/dispatch-mobile/designs.html)
- [stitch-rules-1.2.311225.md](/Users/M1PRO/Documents/code/_turbo/gnd/ai/stitch-rules-1.2.311225.md)

## Assumptions

- Mobile target is `apps/expo-app` (current React Native app).
- Driver users authenticate via existing mobile auth/session flow and receive `x-app-authorization` headers through the current tRPC client.
- `dispatch.assignedDispatch`, `dispatch.dispatchOverview`, `dispatch.startDispatch`, `dispatch.cancelDispatch`, and `dispatch.submitDispatch` are the core APIs for driver workflows.
- Packing actions follow current backend behavior via:
  - `taskTrigger.trigger` with `taskName: "update-sales-control"` for `packItems` and `clearPackings`.
  - `dispatch.deletePackingItem` for deleting packed entries/history rows.
- Driver mobile scope is execution-focused (view assigned dispatches, start/cancel/complete, review packing details), not full admin dispatch creation/editing.
- API behavior should remain backward-compatible for web screens.

## Scope

In scope:
- Driver dispatch list screen (assigned dispatches only).
- Dispatch detail/overview screen.
- Driver actions: start, cancel (unstart), complete dispatch.
- Packing detail and packing execution:
  - view `deliverableQty`, `listedQty`, `nonDeliverableQty`, and packing history.
  - add packed quantity entries per item.
  - delete packed history rows.
  - clear all packing for a dispatch when needed.
- Query invalidation and optimistic/fast refresh behavior in mobile.
- Role gating for driver experience.
- Stitch-quality visual refresh for dispatch list/detail/complete screens.

Out of scope (first release):
- Full dispatch creation/editing UI from mobile.
- Bulk dispatch admin actions.
- Printing flows and desktop-oriented actions.
- Offline-first mutation queueing beyond basic retry/error UX.

## Execution Plan

1. Baseline and contract mapping
- Document current web behavior and API payloads for list/detail/actions.
- Confirm status model used by UI: `queue`, `in progress`, `cancelled`, `completed`.
- Define parity matrix: web action -> mobile action -> API route.

2. Mobile data layer setup
- Create a dispatch feature module in `apps/expo-app/src`:
  - `features/dispatch/api/*` for query/mutation hooks.
  - `features/dispatch/types/*` for UI-safe mapped types.
  - `features/dispatch/state/*` for local UI state (selected dispatch, filter/search state).
- Implement query hooks:
  - `useAssignedDispatchList`
  - `useDispatchOverview`
  - `useStartDispatch`
  - `useCancelDispatch`
  - `useSubmitDispatch`
- Implement packing mutation hooks:
  - `usePackDispatchItem` (via `taskTrigger.trigger -> update-sales-control`)
  - `useClearDispatchPacking` (via `taskTrigger.trigger -> update-sales-control`)
  - `useDeletePackingItem` (via `dispatch.deletePackingItem`)
- Centralize cache invalidation with existing query client utility.

3. Driver list screen
- Add a dispatch list route in Expo router under authenticated area.
- Render cards with parity fields from web list:
  - dispatch id, due date, status, order reference, customer/address metadata, packing progress.
- Add pull-to-refresh and incremental loading behavior consistent with existing query pattern.
- Add empty/error/loading states.

4. Dispatch detail and packing screen
- Build detail screen using `dispatch.dispatchOverview`.
- Mirror packing overview sections from web:
  - dispatch header/status/actions
  - order info
  - address info
  - packed vs deliverable indicators per item
  - packing history list per item
- Keep mobile-first UX for touch and small viewport.

5. Packing logic execution
- Add item-level packing input form (qty + optional note) with the same business constraints used on web:
  - qty cannot exceed deliverable availability.
  - support both no-handle qty and LH/RH qty modes.
- Implement submission payload mapping to `packItems.packingList` by matching available deliverables/submissions.
- On packing submit:
  - trigger `update-sales-control` task with `packItems`.
  - invalidate `dispatch.dispatchOverview` and list summary state.
- On delete packing row:
  - call `dispatch.deletePackingItem` with `packingId`/`packingUid`.
  - refetch detail to rebuild packing history.
- On clear all packing:
  - trigger `update-sales-control` task with `clearPackings.dispatchId`.
  - require confirmation dialog.
- Set packing editability rules:
  - editable in `queue` and `in progress`.
  - read-only in `completed` and `cancelled`.

6. Driver action flows
- Start Dispatch:
  - enabled only in `queue` state.
  - mutation -> invalidate detail/list -> feedback toast.
- Cancel/Unstart:
  - enabled in `in progress` state.
  - confirmation dialog before mutation.
- Complete Dispatch:
  - capture `receivedBy`, `receivedDate`, optional note/signature/attachments per schema.
  - submit mutation -> invalidate -> navigate back or show completed state.
- Guard action buttons by status to prevent invalid transitions.

7. Cross-cutting UX and reliability
- Add standardized status badges/colors for dispatch states.
- Add resilient error messages and retry affordances for all mutations.
- Ensure navigation deep-links from notification payload (`dispatchId`, `orderNo`) are supported.
- Instrument analytics/logging for key actions: open list, open detail, start, cancel, complete.
- Route driver users through the `(drivers)` dashboard stack using `isDriver` in `apps/expo-app/src/app/_layout.tsx`.

8. QA, rollout, and parity verification
- Validate all flows against web behavior and backend state transitions.
- Run smoke tests on both iOS and Android builds.
- Roll out behind a feature flag/role gate if needed, then expand.

9. Design update (Stitch-aligned)
- Rework screen composition to mirror the dispatch mobile template patterns:
  - sticky top bar with strong title/status hierarchy.
  - card-based sections with grouped information blocks.
  - fixed/anchored bottom action area for primary CTA (complete/confirm actions).
  - richer packing/history visual hierarchy (table/list rows, timeline style where applicable).
- Apply semantic theme tokens only (no hardcoded palette), including:
  - `background`, `foreground`, `card`, `muted`, `primary`, `border`, `input`, `ring`.
- Ensure dark-mode parity for every dispatch surface, not just text color.
- Enforce stitch styling constraints during refactor:
  - no mixed `style` + `className` on one component.
  - token-first styling and consistent spacing/typography rhythm.
- Keep behavioral logic unchanged while upgrading visuals.

## Risks and Mitigations

- Risk: status transition mismatch between mobile and existing task logic.
- Mitigation: lock button availability to status machine and validate mutation preconditions in backend.

- Risk: packing qty mismatch between mobile input and deliverable submissions.
- Mitigation: use the same qty-allocation rules as web and block submit when remainder qty exists.

- Risk: large dispatch overview payload impacts mobile performance.
- Mitigation: memoized list items, skeleton loading, and payload profiling before release.

- Risk: parity drift between web and mobile logic.
- Mitigation: maintain a shared transition matrix and endpoint contract checklist in this plan’s implementation ticket set.

- Risk: visual drift from Stitch target in later iterations.
- Mitigation: run a design self-audit against stitch rules before merge.

## Validation

- Mobile functional:
  - Driver sees only assigned dispatches.
  - Driver can open detail from list.
  - Driver can add packing entries and see updated packing history.
  - Driver can delete packing history rows and clear all packing with confirmation.
  - Start/cancel/complete actions update UI state and refetch accurately.
  - Failure paths show actionable feedback and allow retry.
- Design validation:
  - Layout hierarchy and spacing match dispatch template intent.
  - Semantic-token usage only on layout/surface/text/border colors.
  - Dark mode parity verified for list/detail/complete screens.
  - No `style` + `className` mixing in touched components.
- Regression:
  - Existing web dispatch behavior remains unchanged.
  - API consumers outside mobile remain compatible.

## Deliverables

- Plan-approved feature spec and parity matrix.
- Expo dispatch feature module with list/detail/packing/actions screens.
- Status-driven action controls and completion form.
- Test coverage for API transitions and mobile critical flows.
- Rollout checklist and post-release monitoring notes.

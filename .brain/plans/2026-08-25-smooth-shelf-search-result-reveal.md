# Plan: Smooth Shelf Search Result Reveal

## Type
UX timing refinement

## Status
Proposed

## Created Date
2026-08-25

## Objective
Prevent very fast Shelf V2 searches from flashing between skeletons and results
by keeping the loading presentation visible for at least 100ms, without delaying
the request, input updates, or searches that already take long enough to read.

## Recommended Timing Contract
- Start timing when `isSearchingProducts` becomes true.
- Keep the current skeleton footprint visible while the request or deferred
  search is active.
- When results settle in less than 100ms, hold the skeletons only for the
  remaining portion of the 100ms minimum, then reveal the latest results.
- When results take 100ms or longer, reveal them immediately on settlement.
- Searches over one second therefore receive no artificial delay.
- If another query starts during the hold, cancel the old release timer and let
  the newest search own the presentation state.

## Detailed Execution Plan
1. Add a focused timing resolver or hook test covering 20ms -> 80ms remaining,
   100ms -> no delay, 500ms -> no delay, and 1s+ -> no delay.
2. Add a component-local minimum-busy-duration hook in the package-owned Shelf
   editor. Use a monotonic clock and a cancellable timer; do not debounce or
   delay `onProductSearchChange`.
3. Drive the existing skeleton renderer from `isSearchingProducts ||
   isHoldingFastResult`. Keep the previous settled row count during the hold so
   the popup cannot resize before the new results are revealed.
4. Cancel the pending release on a new query, component unmount, or renewed busy
   state. Only the latest result set may become interactive.
5. Preserve the current controlled-open behavior, empty state, 50-row cap,
   320px scroll boundary, keyboard interaction, and both shared/legacy search
   paths.
6. Run focused Shelf tests, scoped Biome, whitespace validation, and the existing
   typecheck baseline. In the authenticated in-app browser, verify a fast local
   query holds skeletons for approximately 100ms without closing, a deliberately
   slower query receives no extra delay, rapid typing cancels prior timers, and
   Arrow/Enter can select only the latest settled result.

## Decision Point
The recommended behavior is a 100ms minimum total loading presentation. If the
product requirement is instead to add a full extra 100ms to every search that
finishes under one second, change only the delay calculation; the cancellation
and stale-result protections remain the same. The minimum-duration approach is
preferred because it removes the flash without making already-visible 200-900ms
searches slower.

## Risks And Mitigations
- A post-settle render could briefly expose results before the timer starts:
  keep the held-busy flag active across the true-to-false transition and cover
  that transition with a fake-timer component test.
- Rapid queries could release an older result: use one timer generation/token,
  clear it on every new search, and test consecutive query changes.
- The remembered skeleton count could update too early: update it only after
  the presentation hold ends and the new results are actually rendered.
- Timers could survive unmount: clear them in effect cleanup.

## Documentation Impact
After implementation, update the Shelf hardening feature contract and progress
log. No API, database, permission, pricing, or persistence documentation should
change for this UI-only refinement.

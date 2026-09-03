# Wayfinder: Admin Calendar Rescheduling

## Status

Charted locally on 2026-09-02. Proposed-answer comments are drafted and await
owner approval before they are written to the local child tickets. No
application behavior or external tracker issue changed.

## Tracker

- Map: `.scratch/admin-calendar-rescheduling-wayfinder/map.md`
- Open frontier: `01-define-shared-calendar-rescheduling-contract.md`
- Six local decision tickets define the shared contract, Production authority,
  Fulfillment authority, accessible interaction, compatibility/invalidation,
  and verification/rollout sequence.

## Destination

Produce a reviewed specification and dependency-ordered local implementation
tickets for safe admin drag-and-drop rescheduling in Sales Production and
Fulfillment calendars.

## Approved Charting Direction

- Reuse the existing DOM calendars and installed `@dnd-kit/core`; do not use
  Chart.js or replace the calendar system.
- Production moves target the exact visible order/date assignment group.
- Mixed completed/incomplete Production groups fail closed and are not
  draggable.
- Production workers remain read-only.
- Fulfillment locks in-transit, fulfilled, and cancelled Dispatches.
- Past dates remain available behind an explicit warning.
- Confirmed schedule changes produce attributable evidence and notify affected
  workers or the current driver.
- Keep all Wayfinder, specification, and implementation-ticket artifacts local
  under `.scratch`; do not publish GitHub issues.

## Next Step

Approve or revise the six proposed-answer comments. After approval, write them
to the child tickets, synthesize the local specification, and present the
tracer-bullet implementation-ticket breakdown for the separate required
approval checkpoint.

